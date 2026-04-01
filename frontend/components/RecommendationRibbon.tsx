/**
 * RecommendationRibbon
 *
 * A lightweight left-top ribbon badge for recommended space cards.
 * Renders one primary explanation label derived from the backend reason field.
 *
 * Visual direction: horizontal ribbon body with a notched right edge.
 * Keeps decoration intentional and light rather than promotional.
 */

const REASON_LABELS: Record<string, string> = {
  near_you: "Near you",
  closest_available: "Closest available",
};

interface RecommendationRibbonProps {
  reason: "near_you" | "closest_available";
}

export default function RecommendationRibbon({ reason }: RecommendationRibbonProps) {
  const label = REASON_LABELS[reason] ?? "Recommended";

  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-white bg-blue-500 pl-2 pr-3 py-0.5 rounded-sm"
      style={{
        clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
      }}
      aria-label={`Recommended: ${label}`}
    >
      {label}
    </span>
  );
}
