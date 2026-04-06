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
      className="inline-flex items-center rounded-md bg-accent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_85%,black_15%)]"
      style={{
        clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
        paddingRight: "0.8rem",
      }}
      aria-label={`Recommended: ${label}`}
    >
      {label}
    </span>
  );
}
