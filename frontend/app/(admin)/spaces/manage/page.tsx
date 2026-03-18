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

  const seats = (space as unknown as { seats?: Seat[] })?.seats ?? [];
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Manage Spaces & Seats</h1>

      <div className="flex gap-6">
        {/* Space list sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Spaces</h2>
              <button
                onClick={() => setShowCreateSpace(!showCreateSpace)}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                + New
              </button>
            </div>

            {showCreateSpace && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border space-y-2">
                <input
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Space name"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <select
                  value={newSpaceType}
                  onChange={(e) => setNewSpaceType(e.target.value as "library" | "office")}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="library">Library</option>
                  <option value="office">Office</option>
                </select>
                <input
                  type="number"
                  value={newSpaceCapacity}
                  onChange={(e) => setNewSpaceCapacity(Number(e.target.value))}
                  placeholder="Capacity"
                  className="w-full border rounded px-2 py-1 text-sm"
                  min={1}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSpace}
                    disabled={createSpace.isPending}
                    className="flex-1 bg-blue-600 text-white py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createSpace.isPending ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => setShowCreateSpace(false)}
                    className="flex-1 border py-1 rounded text-xs hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {spacesLoading && <p className="text-sm text-gray-400">Loading…</p>}
            <ul className="space-y-1">
              {spaces?.map((s) => (
                <li key={s.id}>
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm cursor-pointer ${
                      selectedSpaceId === s.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedSpaceId(s.id)}
                  >
                    <span className="truncate">{s.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpace(s.id);
                      }}
                      className="text-red-400 hover:text-red-600 ml-1 text-xs"
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
            <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
              Select a space to edit its seat layout
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h2 className="font-semibold">{space?.name}</h2>
                <span className="text-xs text-gray-400">{seats.length} seats</span>

                {/* Toolbar */}
                <div className="flex gap-1 ml-auto">
                  {(["select", "add", "delete", "edit"] as ToolMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setToolMode(m)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors capitalize ${
                        toolMode === m
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {m === "add" ? "+ Add" : m === "delete" ? "✕ Delete" : m === "edit" ? "✎ Edit" : "↖ Select"}
                    </button>
                  ))}
                </div>

                {/* Label prefix (add mode only) */}
                {toolMode === "add" && (
                  <div className="flex items-center gap-1 text-sm">
                    <label className="text-xs text-gray-500">Prefix:</label>
                    <input
                      value={labelPrefix}
                      onChange={(e) => setLabelPrefix(e.target.value.toUpperCase())}
                      maxLength={3}
                      className="w-12 border rounded px-2 py-0.5 text-sm text-center"
                    />
                  </div>
                )}
              </div>

              {/* Tool hint */}
              {toolMode === "add" && (
                <p className="text-xs text-blue-600 mb-2">Click on the grid to place a seat</p>
              )}
              {toolMode === "delete" && (
                <p className="text-xs text-red-500 mb-2">Click a seat to delete it</p>
              )}
              {toolMode === "edit" && (
                <p className="text-xs text-yellow-600 mb-2">Click a seat to edit its label or status</p>
              )}

              {/* Floor plan controls */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <label className={`px-3 py-1 rounded text-xs font-medium border cursor-pointer transition-colors ${uploadFloorPlan.isPending ? "opacity-50" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {uploadFloorPlan.isPending ? "Uploading…" : "⬆ Upload Floor Plan"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFloorPlanUpload} disabled={uploadFloorPlan.isPending} />
                </label>
                {backgroundImage && (
                  <button
                    onClick={handleFloorPlanDelete}
                    disabled={deleteFloorPlan.isPending}
                    className="px-3 py-1 rounded text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    ✕ Remove Floor Plan
                  </button>
                )}
                <button
                  onClick={() => setShowGrid((v) => !v)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${showGrid ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-gray-400 border-gray-200"}`}
                >
                  # Grid {showGrid ? "On" : "Off"}
                </button>
              </div>

              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

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
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold mb-4">Edit Seat</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Label</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={updateSeat.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateSeat.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingSeat(null)}
                  className="flex-1 border py-2 rounded text-sm hover:bg-gray-50"
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
