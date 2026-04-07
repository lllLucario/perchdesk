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
      className="inline-flex items-center bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent-soft)_84%,white_16%),color-mix(in_srgb,var(--color-accent)_82%,black_18%))] py-[3px] text-[7px] font-semibold uppercase tracking-[0.18em] text-accent-foreground shadow-[0_4px_8px_rgba(69,95,57,0.10),0_0_0_1px_color-mix(in_srgb,var(--color-accent)_85%,black_15%)]"
      style={{
        clipPath: "polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%)",
        paddingLeft: "0.6rem",
        paddingRight: "0.75rem",
      }}
      aria-label={`Recommended: ${label}`}
    >
      {label}
    </span>
  );
}
