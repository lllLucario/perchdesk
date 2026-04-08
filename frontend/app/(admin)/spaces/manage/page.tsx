"use client";

import { useState } from "react";
import {
  useSpaces,
  useSpace,
  useCreateSpace,
  useDeleteSpace,
  useAddSeat,
  useDeleteSeat,
  useUpdateSeat,
  useUploadFloorPlan,
  useDeleteFloorPlan,
  type Seat,
} from "@/lib/hooks";
import SeatMapCanvas, { type ToolMode } from "@/components/SeatMap/SeatMapCanvas";
import { ApiError } from "@/lib/api";

export default function AdminManagePage() {
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const { data: space } = useSpace(selectedSpaceId ?? "");

  // Tool state
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [labelPrefix, setLabelPrefix] = useState("A");

  // Edit seat dialog
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStatus, setEditStatus] = useState("available");

  // Space creation form
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceType, setNewSpaceType] = useState<"library" | "office">("library");
  const [newSpaceCapacity, setNewSpaceCapacity] = useState(10);

  const [error, setError] = useState("");
  const [showGrid, setShowGrid] = useState(true);

  // SpaceDetail includes seats directly — no unsafe cast needed
  const seats = space?.seats ?? [];
  const layoutConfig = space?.layout_config as { grid_size?: number; background_image?: string } | null;
  const gridSize = layoutConfig?.grid_size ?? 30;
  const backgroundImage = layoutConfig?.background_image ?? null;

  const createSpace = useCreateSpace();
  const deleteSpace = useDeleteSpace();
  const addSeat = useAddSeat(selectedSpaceId ?? "");
  const deleteSeat = useDeleteSeat();
  const updateSeat = useUpdateSeat();
  const uploadFloorPlan = useUploadFloorPlan();
  const deleteFloorPlan = useDeleteFloorPlan();

  async function handleFloorPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedSpaceId) return;
    setError("");
    try {
      await uploadFloorPlan.mutateAsync({ spaceId: selectedSpaceId, file });
      setShowGrid(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    e.target.value = "";
  }

  async function handleFloorPlanDelete() {
    if (!selectedSpaceId) return;
    setError("");
    try {
      await deleteFloorPlan.mutateAsync(selectedSpaceId);
      setShowGrid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove floor plan");
    }
  }

  async function handleCreateSpace() {
    if (!newSpaceName.trim()) return;
    setError("");
    try {
      const created = await createSpace.mutateAsync({
        name: newSpaceName.trim(),
        type: newSpaceType,
        capacity: newSpaceCapacity,
      });
      setSelectedSpaceId(created.id);
      setShowCreateSpace(false);
      setNewSpaceName("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create space");
    }
  }

  async function handleDeleteSpace(spaceId: string) {
    if (!confirm("Delete this space and all its seats?")) return;
    setError("");
    try {
      await deleteSpace.mutateAsync(spaceId);
      if (selectedSpaceId === spaceId) setSelectedSpaceId(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete space");
    }
  }

  async function handleCanvasClick(pos: { x: number; y: number }, nextLabel: string) {
    if (!selectedSpaceId) return;
    setError("");
    try {
      await addSeat.mutateAsync({ label: nextLabel, position: pos });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add seat");
    }
  }

  async function handleSeatClick(seat: Seat) {
    if (toolMode === "delete") {
      if (!confirm(`Delete seat ${seat.label}?`)) return;
      setError("");
      try {
        await deleteSeat.mutateAsync({ seatId: seat.id, spaceId: selectedSpaceId! });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to delete seat");
      }
    } else if (toolMode === "edit") {
      setEditingSeat(seat);
      setEditLabel(seat.label);
      setEditStatus(seat.status);
    }
  }

  async function handleSaveEdit() {
    if (!editingSeat || !selectedSpaceId) return;
    setError("");
    try {
      await updateSeat.mutateAsync({
        seatId: editingSeat.id,
        spaceId: selectedSpaceId,
        data: { label: editLabel, status: editStatus },
      });
      setEditingSeat(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update seat");
    }
  }

  return (
    <div className="page-stack">
      <div className="section-frame mb-6 px-6 py-6 md:px-8">
        <p className="page-eyebrow mb-3">Admin workspace</p>
        <h1 className="text-4xl text-foreground">Manage Spaces & Seats</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Create spaces, upload floor plans, and edit seat layouts without leaving the design system.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Space list sidebar */}
        <div className="w-64 shrink-0">
          <div className="panel-surface rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-muted)_40%,white_60%),transparent_56%),var(--color-surface)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-strong">Spaces</h2>
              <button
                onClick={() => setShowCreateSpace(!showCreateSpace)}
                className="button-primary px-3 py-1.5 text-xs font-medium"
              >
                + New
              </button>
            </div>

            {showCreateSpace && (
              <div className="mb-3 space-y-2 rounded-[1.2rem] border border-border bg-[color:color-mix(in_srgb,var(--color-accent-muted)_48%,white_52%)] p-3">
                <input
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Space name"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
                <select
                  value={newSpaceType}
                  onChange={(e) => setNewSpaceType(e.target.value as "library" | "office")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value="library">Library</option>
                  <option value="office">Office</option>
                </select>
                <input
                  type="number"
                  value={newSpaceCapacity}
                  onChange={(e) => setNewSpaceCapacity(Number(e.target.value))}
                  placeholder="Capacity"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  min={1}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSpace}
                    disabled={createSpace.isPending}
                    className="button-primary flex-1 py-2 text-xs font-medium disabled:opacity-50"
                  >
                    {createSpace.isPending ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => setShowCreateSpace(false)}
                    className="button-secondary flex-1 py-2 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {spacesLoading && <p className="text-sm text-text-soft">Loading…</p>}
            <ul className="space-y-1">
              {spaces?.map((s) => (
                <li key={s.id}>
                  <div
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                      selectedSpaceId === s.id
                        ? "bg-[color:color-mix(in_srgb,var(--color-accent-muted)_60%,white_40%)] font-medium text-text-strong"
                        : "hover:bg-[color:color-mix(in_srgb,var(--color-accent-muted)_32%,white_68%)]"
                    }`}
                    onClick={() => setSelectedSpaceId(s.id)}
                  >
                    <span className="truncate">{s.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(s.id);
                      }}
                      className="ml-1 text-xs text-danger/70 hover:text-danger"
                      title="Delete space"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Seat map editor */}
        <div className="flex-1">
          {!selectedSpaceId ? (
            <div className="section-frame rounded-[1.8rem] p-8 text-center text-text-soft">
              Select a space to edit its seat layout
            </div>
          ) : (
            <div className="section-frame rounded-[1.8rem] p-5">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="font-serif text-2xl text-foreground">{space?.name}</h2>
                <span className="accent-pill text-xs font-medium">{seats.length} seats</span>

                {/* Toolbar */}
                <div className="flex gap-1 ml-auto">
                  {(["select", "add", "delete", "edit"] as ToolMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setToolMode(m)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        toolMode === m
                          ? "bg-accent text-accent-foreground shadow-[0_10px_20px_rgba(69,95,57,0.16)]"
                          : "border border-border bg-surface text-text-muted hover:bg-[color:color-mix(in_srgb,var(--color-accent-muted)_36%,white_64%)]"
                      }`}
                    >
                      {m === "add" ? "+ Add" : m === "delete" ? "✕ Delete" : m === "edit" ? "✎ Edit" : "↖ Select"}
                    </button>
                  ))}
                </div>

                {/* Label prefix (add mode only) */}
                {toolMode === "add" && (
                  <div className="flex items-center gap-1 text-sm">
                    <label className="text-xs text-text-soft">Prefix:</label>
                    <input
                      value={labelPrefix}
                      onChange={(e) => setLabelPrefix(e.target.value.toUpperCase())}
                      maxLength={3}
                      className="w-12 rounded-lg border border-border bg-surface px-2 py-0.5 text-center text-sm text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Tool hint */}
              {toolMode === "add" && (
                <p className="mb-2 text-xs text-accent">Click on the grid to place a seat</p>
              )}
              {toolMode === "delete" && (
                <p className="mb-2 text-xs text-danger">Click a seat to delete it</p>
              )}
              {toolMode === "edit" && (
                <p className="mb-2 text-xs text-text-muted">Click a seat to edit its label or status</p>
              )}

              {/* Floor plan controls */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <label className={`rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer transition-colors ${uploadFloorPlan.isPending ? "opacity-50" : "border-border bg-surface text-text-muted hover:bg-[color:color-mix(in_srgb,var(--color-accent-muted)_36%,white_64%)]"}`}>
                  {uploadFloorPlan.isPending ? "Uploading…" : "⬆ Upload Floor Plan"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFloorPlanUpload} disabled={uploadFloorPlan.isPending} />
                </label>
                {backgroundImage && (
                  <button
                    onClick={handleFloorPlanDelete}
                    disabled={deleteFloorPlan.isPending}
                    className="rounded-full border border-[color:color-mix(in_srgb,var(--color-danger)_28%,white_72%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)] px-3 py-1.5 text-xs font-medium text-danger disabled:opacity-50"
                  >
                    ✕ Remove Floor Plan
                  </button>
                )}
                <button
                  onClick={() => setShowGrid((v) => !v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${showGrid ? "bg-[color:color-mix(in_srgb,var(--color-accent-muted)_58%,white_42%)] text-text-strong border-border-strong" : "bg-surface text-text-soft border-border"}`}
                >
                  # Grid {showGrid ? "On" : "Off"}
                </button>
              </div>

              {error && <p className="mb-2 text-xs text-danger">{error}</p>}

              <SeatMapCanvas
                seats={seats}
                mode="admin"
                toolMode={toolMode}
                labelPrefix={labelPrefix}
                gridSize={gridSize}
                backgroundImage={backgroundImage}
                showGrid={showGrid}
                onCanvasClick={handleCanvasClick}
                onSeatClick={handleSeatClick}
              />

              {/* Legend */}
              <div className="mt-3 flex gap-4 text-xs text-text-soft">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded inline-block bg-[#1D9E75]" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded inline-block bg-[#B4B2A9]" /> Maintenance
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit seat dialog */}
      {editingSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-muted)_40%,white_60%),transparent_55%),var(--color-surface)] p-6 shadow-xl">
            <h3 className="mb-4 font-serif text-2xl text-foreground">Edit Seat</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-strong">Label</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-strong">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={updateSeat.isPending}
                  className="button-primary flex-1 py-2 text-sm disabled:opacity-50"
                >
                  {updateSeat.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingSeat(null)}
                  className="button-secondary flex-1 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
