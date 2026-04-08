"use client";

import { useState, useCallback } from "react";
import type { Seat } from "@/lib/hooks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ToolMode = "add" | "delete" | "edit" | "select";

export interface SeatMapCanvasProps {
  seats: Seat[];
  mode: "admin" | "user";
  toolMode?: ToolMode;
  /** seat_id → "available" | "booked" | "my_booking" (user view, time-based) */
  availabilityMap?: Record<string, "available" | "booked" | "my_booking">;
  /** Legacy single-seat selection (user view). Prefer draftSeatMap for workspace. */
  selectedSeatId?: string | null;
  /**
   * Draft-based seat coloring for the booking workspace.
   * seat_id → { color: hex, isActiveDraft: boolean }
   * - isActiveDraft=true  → full opacity + checkmark (active/editing draft)
   * - isActiveDraft=false → 45% opacity (stored draft, visually secondary)
   */
  draftSeatMap?: Record<string, { color: string; isActiveDraft: boolean }>;
  labelPrefix?: string;
  width?: number;
  height?: number;
  gridSize?: number;
  /** Relative path from backend e.g. "/uploads/floor_plans/uuid.png" */
  backgroundImage?: string | null;
  /** Show grid overlay (default true) */
  showGrid?: boolean;
  /** user view: called when a seat is clicked */
  onSeatClick?: (seat: Seat) => void;
  /** admin add mode: called with snapped position and suggested next label */
  onCanvasClick?: (pos: { x: number; y: number }, nextLabel: string) => void;
}

const SEAT_SIZE = 24;
const SEAT_HALF = SEAT_SIZE / 2;

const COLOR = {
  available: "#1D9E75",
  booked: "#E24B4A",
  maintenance: "#B4B2A9",
  my_booking: "#378ADD",
  ghost_fill: "#93C5FD44",
  ghost_stroke: "#378ADD",
};

function snap(value: number, grid: number) {
  return Math.round(value / grid) * grid;
}

export default function SeatMapCanvas({
  seats,
  mode,
  toolMode = "select",
  availabilityMap,
  selectedSeatId,
  draftSeatMap,
  labelPrefix = "A",
  width = 800,
  height = 600,
  gridSize = 30,
  backgroundImage,
  showGrid = true,
  onSeatClick,
  onCanvasClick,
}: SeatMapCanvasProps) {
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [focusedSeatIndex, setFocusedSeatIndex] = useState<number>(-1);

  // Sort seats spatially for keyboard navigation (top-to-bottom, left-to-right)
  const sortedSeats = [...seats].sort((a, b) => {
    const rowDiff = Math.round(a.position.y / gridSize) - Math.round(b.position.y / gridSize);
    if (rowDiff !== 0) return rowDiff;
    return a.position.x - b.position.x;
  });

  const handleSeatKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (mode !== "user" || seats.length === 0) return;

      const moveFocus = (newIndex: number) => {
        e.preventDefault();
        const clamped = Math.max(0, Math.min(sortedSeats.length - 1, newIndex));
        setFocusedSeatIndex(clamped);
      };

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          moveFocus(focusedSeatIndex < 0 ? 0 : focusedSeatIndex + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          moveFocus(focusedSeatIndex < 0 ? 0 : focusedSeatIndex - 1);
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          if (focusedSeatIndex >= 0 && focusedSeatIndex < sortedSeats.length) {
            const seat = sortedSeats[focusedSeatIndex];
            if (isClickable(seat)) onSeatClick?.(seat);
          }
          break;
        }
        case "Home":
          moveFocus(0);
          break;
        case "End":
          moveFocus(sortedSeats.length - 1);
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, seats.length, focusedSeatIndex, sortedSeats, onSeatClick]
  );

  const bgUrl = backgroundImage
    ? backgroundImage.startsWith("http")
      ? backgroundImage
      : `${API_BASE}${backgroundImage}`
    : null;

  function seatColor(seat: Seat): string {
    if (seat.status === "maintenance") return COLOR.maintenance;
    // Draft-based coloring takes priority over availability map
    const draftInfo = draftSeatMap?.[seat.id];
    if (draftInfo) return draftInfo.color;
    if (mode === "user") {
      if (seat.id === selectedSeatId) return COLOR.my_booking;
      const avail = availabilityMap?.[seat.id];
      if (avail === "my_booking") return COLOR.my_booking;
      if (avail === "booked") return COLOR.booked;
    }
    return COLOR.available;
  }

  function seatOpacity(seat: Seat): number {
    const draftInfo = draftSeatMap?.[seat.id];
    if (draftInfo && !draftInfo.isActiveDraft) return 0.45;
    return 1;
  }

  function isClickable(seat: Seat): boolean {
    if (mode === "admin") return toolMode === "delete" || toolMode === "edit";
    const avail = availabilityMap?.[seat.id];
    // `my_booking` seats belong to the current user and should not be treated
    // as a selectable seat for new bookings in the same time range.
    return seat.status === "available" && avail !== "booked" && avail !== "my_booking";
  }

  function getCursor(): string {
    if (mode === "admin" && toolMode === "add") return "crosshair";
    return "default";
  }

  function svgCoords(e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: snap(((e.clientX - rect.left) / rect.width) * width, gridSize),
      y: snap(((e.clientY - rect.top) / rect.height) * height, gridSize),
    };
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (mode === "admin" && toolMode === "add") {
      setGhostPos(svgCoords(e));
    } else if (ghostPos) {
      setGhostPos(null);
    }
  }

  function onMouseLeave() {
    setGhostPos(null);
  }

  function onCanvasPointerClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== "admin" || toolMode !== "add") return;
    const pos = svgCoords(e);
    const occupied = seats.some(
      (s) =>
        Math.abs(s.position.x - pos.x) < gridSize / 2 &&
        Math.abs(s.position.y - pos.y) < gridSize / 2
    );
    if (occupied) return;
    const prefixSeats = seats.filter((s) => s.label.startsWith(labelPrefix));
    const nextLabel = `${labelPrefix}${prefixSeats.length + 1}`;
    onCanvasClick?.(pos, nextLabel);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full border rounded-lg bg-gray-50"
      style={{ cursor: getCursor(), display: "block" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onCanvasPointerClick}
      onKeyDown={handleSeatKeyDown}
      tabIndex={mode === "user" ? 0 : undefined}
      role={mode === "user" ? "grid" : undefined}
      aria-label={mode === "user" ? "Seat map — use arrow keys to navigate, Enter to select" : undefined}
    >
      <defs>
        <pattern id="map-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Floor plan background image */}
      {bgUrl && (
        <image
          href={bgUrl}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      )}

      {/* Grid overlay */}
      {showGrid && <rect width={width} height={height} fill="url(#map-grid)" />}

      {/* Seats */}
      {seats.map((seat) => {
        const cx = seat.position.x;
        const cy = seat.position.y;
        const color = seatColor(seat);
        const clickable = isClickable(seat);
        const isSelected = seat.id === selectedSeatId;
        const draftInfo = draftSeatMap?.[seat.id];
        const opacity = mode === "admin" && toolMode === "delete"
          ? 0.7
          : seatOpacity(seat);
        const showCheckmark = !!draftInfo?.isActiveDraft;

        // Keyboard focus state
        const sortedIdx = sortedSeats.findIndex((s) => s.id === seat.id);
        const isFocused = mode === "user" && sortedIdx === focusedSeatIndex;

        // Accessibility label
        const avail = availabilityMap?.[seat.id];
        const seatStatus =
          seat.status === "maintenance"
            ? "maintenance"
            : avail === "my_booking"
            ? "your booking"
            : avail === "booked"
            ? "booked"
            : draftInfo
            ? "selected"
            : "available";

        return (
          <g
            key={seat.id}
            style={{ cursor: clickable ? "pointer" : "default" }}
            opacity={opacity}
            role={mode === "user" ? "gridcell" : undefined}
            aria-label={mode === "user" ? `Seat ${seat.label}, ${seatStatus}` : undefined}
            aria-selected={mode === "user" ? (!!draftInfo || isSelected) : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (clickable) onSeatClick?.(seat);
            }}
          >
            {/* Keyboard focus ring */}
            {isFocused && (
              <rect
                x={cx - SEAT_HALF - 3}
                y={cy - SEAT_HALF - 3}
                width={SEAT_SIZE + 6}
                height={SEAT_SIZE + 6}
                rx={6}
                fill="none"
                stroke="#2563EB"
                strokeWidth={2}
                strokeDasharray="4,2"
              />
            )}
            <rect
              x={cx - SEAT_HALF}
              y={cy - SEAT_HALF}
              width={SEAT_SIZE}
              height={SEAT_SIZE}
              rx={4}
              fill={color}
              stroke={isSelected ? "#1E5FA8" : draftInfo?.isActiveDraft ? "white" : "white"}
              strokeWidth={isSelected ? 2 : 1}
            />
            {showCheckmark ? (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={10}
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                ✓
              </text>
            ) : (
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize={8}
                fill="white"
                fontWeight="bold"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {seat.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Ghost seat (admin add mode hover) */}
      {mode === "admin" && toolMode === "add" && ghostPos && (
        <g style={{ pointerEvents: "none" }}>
          <rect
            x={ghostPos.x - SEAT_HALF}
            y={ghostPos.y - SEAT_HALF}
            width={SEAT_SIZE}
            height={SEAT_SIZE}
            rx={4}
            fill={COLOR.ghost_fill}
            stroke={COLOR.ghost_stroke}
            strokeWidth={1}
            strokeDasharray="3,2"
          />
          <text
            x={ghostPos.x}
            y={ghostPos.y + 4}
            textAnchor="middle"
            fontSize={8}
            fill={COLOR.ghost_stroke}
            fontWeight="bold"
          >
            {`${labelPrefix}${seats.filter((s) => s.label.startsWith(labelPrefix)).length + 1}`}
          </text>
        </g>
      )}
    </svg>
  );
}
