# Design System: PerchDesk Green Editorial

## 1. Visual Theme & Atmosphere

PerchDesk should feel calm, trustworthy, and spatially aware. The design direction borrows the editorial discipline of Claude, but shifts the emotional center from terracotta warmth to green-tinted quietness. The result should feel less like a general AI product and more like a well-kept reading room or a thoughtfully designed workspace.

The primary experience sits on a paper-like canvas with a faint sage cast (`#f1f5ed`). It should feel tactile and human, not glossy or futuristic. Headlines use a serif voice to create authority and calm, while utility text stays in a clean sans-serif so bookings, schedules, and availability remain legible and efficient.

The signature brand move is restrained green. Not bright app-store green, not neon emerald, not generic fintech green. PerchDesk uses moss, sage, and olive-tinted neutrals so the interface feels settled, architectural, and dependable. The green palette should suggest place, air, and order.

**Key Characteristics**
- Soft paper background with a subtle green-gray tint
- Serif headlines with quiet editorial pacing
- Green brand system built around moss and sage rather than vivid emerald
- Neutrals tinted toward olive so the whole product feels chromatically coherent
- Ring-based shadows and low-contrast borders instead of heavy elevation
- Calm, chapter-like section rhythm rather than dashboard density everywhere
- A product mood that suggests focus, trust, and spatial clarity

## 2. Color Palette & Roles

### Primary
- **PerchDesk Near Black** (`#161a16`): Primary text and deepest dark surface. A forest-charcoal rather than pure black.
- **Moss Brand** (`#6f9367`): Main brand color. Used for primary CTA moments, selected states, and brand emphasis.
- **Sage Accent** (`#8cad82`): Lighter accent green for secondary emphasis, links on dark surfaces, and supportive highlights.

### Secondary & Accent
- **Error Redwood** (`#a14b45`): Warm muted red for destructive or error states.
- **Focus Blue** (`#3898ec`): Reserved for focus treatment and accessibility-only moments.
- **Success Leaf** (`#7d9a6d`): Functional success state, close to the brand family but distinct from the primary CTA green.

### Surface & Background
- **Paper Sage** (`#f1f5ed`): Main page background. Light, soft, and slightly green-tinted.
- **Ivory Mist** (`#f7faf4`): Elevated light surface for cards and panels.
- **Pure White** (`#ffffff`): Reserved for selective contrast moments only.
- **Soft Reed** (`#e1e9db`): Secondary button background and prominent light interactive surface.
- **Dark Moss Surface** (`#2d342d`): Dark card and shell surface.
- **Deep Forest** (`#161a16`): Dark page background and strongest dark container.

### Neutrals & Text
- **Pine Charcoal** (`#40493f`): Dark text on light surfaces and secondary button text.
- **Olive Gray** (`#536850`): Secondary body copy.
- **Stone Moss** (`#7f907c`): Tertiary text and metadata.
- **Deep Olive** (`#324130`): Emphasized secondary text and darker link treatment.
- **Mist Silver** (`#aebaa9`): Text on dark surfaces.

### Borders & Rings
- **Border Mist** (`#e6ecdf`): Standard light border.
- **Border Reed** (`#d9e3d2`): Stronger divider and grouped-container border.
- **Border Forest** (`#2d342d`): Standard dark border.
- **Ring Sage** (`#c4d1bc`): Primary ring shadow and hover halo on light surfaces.
- **Ring Deep** (`#b3c2ab`): Pressed or active ring treatment.

### Gradient System

PerchDesk should stay mostly gradient-free. Depth should come from tonal layering, illustration, and light-to-dark section alternation. If gradients appear, they should be restrained atmospheric washes using desaturated sage and paper tones.

## 3. Typography Rules

### Font Family
- **Headline**: `Georgia`, fallback serif stack
- **Body / UI**: `system-ui`, fallback sans-serif stack
- **Code**: `SFMono-Regular`, fallback monospace stack

If the product adopts custom fonts later, the intended pairing should remain:
- expressive serif for editorial headings
- restrained sans-serif for UI
- mono only for code or technical metadata

### Hierarchy

| Role | Font | Size | Weight | Line Height | Notes |
|------|------|------|--------|-------------|-------|
| Display / Hero | Serif | 64px | 500 | 1.10 | Hero statements and landing surfaces |
| Section Heading | Serif | 48-52px | 500 | 1.18-1.22 | Large section anchors |
| Sub-heading Large | Serif | 36px | 500 | 1.25-1.30 | Major content groups |
| Sub-heading | Serif | 30-32px | 500 | 1.15-1.20 | Cards and feature blocks |
| Feature Title | Serif | 20-22px | 500 | 1.20 | Small feature titles |
| Body Large | Sans | 20px | 400 | 1.60 | Introductory paragraphs |
| Body Standard | Sans | 16px | 400-500 | 1.50-1.60 | Primary UI copy |
| Body Small | Sans | 14-15px | 400-500 | 1.45-1.55 | Supporting text |
| Label | Sans | 12px | 500 | 1.30 | Tags, captions, metadata |
| Code | Mono | 14-15px | 400 | 1.50 | Code, IDs, compact system text |

### Principles
- Serif provides authority and composure; sans handles booking utility and operational clarity.
- Serif weights should stay restrained. Avoid heavy bold headlines.
- Body copy should stay open and readable, especially for booking confirmation, status, and time-related text.
- Small text should use slightly increased tracking where needed for legibility.

## 4. Component Stylings

### Buttons

**Soft Reed Secondary**
- Background: Soft Reed (`#e1e9db`)
- Text: Pine Charcoal (`#40493f`)
- Radius: 8px
- Shadow: `#e1e9db 0 0 0 0, #c4d1bc 0 0 0 1px`

**White Surface**
- Background: Pure White (`#ffffff`)
- Text: PerchDesk Near Black (`#161a16`)
- Radius: 12px
- Border or ring treatment only; no heavy shadow

**Dark Moss**
- Background: Dark Moss Surface (`#2d342d`)
- Text: Ivory Mist (`#f7faf4`)
- Radius: 8px
- Ring-based edge treatment on interaction

**Brand Moss**
- Background: Moss Brand (`#6f9367`)
- Text: Ivory Mist (`#f7faf4`)
- Radius: 8-12px
- Used for the highest-priority action in a region

**Dark Primary**
- Background: Deep Forest (`#161a16`)
- Text: Mist Silver (`#aebaa9`)
- Border: `1px solid #2d342d`
- Radius: 12px

### Cards & Containers
- Light cards use Ivory Mist with Border Mist
- Elevated cards may use a whisper shadow: `rgba(22,26,22,0.05) 0 4px 24px`
- Interactive cards rely on ring treatment over heavy drop shadows
- Featured panels can use 16px radius; standard cards should usually stay around 8-12px

### Inputs & Forms
- Inputs should be clean, quiet, and reliable
- Borders should remain low contrast until focus
- Focus uses blue ring for accessibility clarity, not green glow
- Selected and confirmed states may use sage-tinted fills or borders

### Navigation
- Sticky nav on paper or dark shell background
- Serif wordmark or brand title treatment
- Quiet navigation links, with brand green reserved for active or committed states

### Status & Booking Signals
- **Available**: use soft green tint and Moss Brand border/text treatment
- **Selected**: use stronger sage fill or ring
- **Booked / Occupied**: use neutral dark treatment, not aggressive red
- **Maintenance / Unavailable**: use muted stone or redwood depending on severity
- **Checked in / Confirmed**: use success leaf variant, distinct from main CTA

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Common steps: 4, 8, 12, 16, 20, 24, 32, 40, 56, 80
- Major sections should breathe, especially on marketing and discovery surfaces

### Grid & Container
- Standard content max width: 1200px
- Dense app views may use tighter internal grids without losing outer breathing room
- Discovery and booking surfaces should avoid over-carding; hierarchy should come from composition first

### Whitespace Philosophy
- Booking is operational, but the product should still feel calm
- Leave deliberate breathing room around titles, filters, and summary blocks
- Use asymmetry carefully on marketing or overview surfaces; keep operational flows more stable
- Do not confuse calmness with oversized padding. PerchDesk should breathe, but it should not feel baggy.
- If a surface already has a strong heading and enough separation from the next section, prefer reducing container padding rather than adding more box treatment.

### Framing Philosophy

PerchDesk should not default to visible boxes around every major section. The product is calmer when sections feel placed on the page rather than trapped inside cards.

- Prefer open composition, spacing, and typography before introducing a visible container
- Large sections such as hero, discovery groups, personal dashboards, and booking summaries should usually feel lightly framed rather than boxed in
- If a section needs containment, use the lightest treatment that still preserves hierarchy
- Borders should often be implicit or nearly invisible; if the border is the first thing a person notices, it is too strong
- Subtle tinted washes are preferable to solid, opaque blocks for large surface framing
- Persistent page chrome should be quieter than page content; navigation should guide, not dominate

### Border Radius Scale
- 8px for common controls and cards
- 12px for primary buttons, inputs, and grouped panels
- 16-24px for featured media or high-emphasis containers

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, quiet background shift | Base page and text regions |
| Contained | Thin border using mist/reed tokens | Standard cards and grouped content |
| Ring | `0 0 0 1px` ring shadow | Interactive surfaces and hover states |
| Whisper | `rgba(22,26,22,0.05) 0 4px 24px` | Featured cards and elevated media |
| Inset | `inset 0 0 0 1px` with low opacity | Active or pressed states |

PerchDesk should not feel physically heavy. Depth should be legible but restrained.

### Large Surface Rule

Large surfaces should rarely combine all of the following at once:
- visible border
- opaque fill
- strong shadow
- generous outer padding

That combination makes the product feel heavier and more dashboard-like than intended. For major sections, choose one or two signals only:
- spacing + heading
- soft tint + radius
- faint divider + rhythm

## 7. Do's and Don'ts

### Do
- Tint the entire neutral system toward olive and sage, not just the CTA color
- Keep the brand green muted and architectural
- Use serif headlines for calm authority
- Preserve generous spacing and reading rhythm
- Use ring shadows and low-contrast borders for interaction states
- Let booking states communicate through color hierarchy, not visual noise

### Don't
- Don't use bright emerald, neon mint, or generic startup green
- Don't leave the rest of the neutrals warm-brown if the brand color has changed to green
- Don't use cool grays across the product
- Don't overuse green for every emphasis point
- Don't rely on thick shadows, loud gradients, or glossy highlights
- Don't turn the seat reservation product into a generic metrics dashboard aesthetic

## 8. Responsive Behavior

### Small Mobile
- Stack actions and summary panels vertically
- Keep serif display text smaller and tighter
- Prioritize booking clarity over decorative layout

### Tablet
- Maintain clear section rhythm
- Allow side-by-side metadata and booking summaries where useful

### Desktop
- Use asymmetry and larger whitespace for discovery, marketing, and overview surfaces
- Keep operational booking flows stable and scannable

## 9. Product Translation for PerchDesk

This design language should not be copied from Claude page-for-page. The transferable parts are:
- calm editorial hierarchy
- restrained chromatic system
- section pacing
- warm-to-organic emotional tone
- ring-based interaction treatment

The PerchDesk-specific expression should emphasize:
- place and spatial orientation
- availability clarity
- booking confidence
- quiet professionalism for library and office scenarios

If a screen is primarily operational, function wins. If a screen introduces a space, a building, or a workflow, the editorial tone can come forward more strongly.
