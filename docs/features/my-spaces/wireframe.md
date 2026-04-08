# My Spaces Wireframe

## Goal

This feature introduces two related personalized surfaces:

- `For You` on `Home`
- the standalone `My Spaces` page

These surfaces should help users re-enter familiar booking paths quickly
without forcing them to browse a large flat all-spaces directory.

## Shared Card Rule

Both surfaces should reuse the standard `SpaceCard`.

They should not create a second card layout just for personalized discovery.

Allowable contextual changes:

- favorite star state
- a lightweight recent-use supporting line
- a left-top recommendation ribbon for recommended cards

## Home: For You

### Intent

`For You` is a compact personalized section on `Home`.

It should feel curated and mixed, not split into three fully separate rows.

### Structure

```text
+----------------------------------------------------------------------------------+
| Home                                                                             |
+----------------------------------------------------------------------------------+
| For You                                                                [See all] |
+----------------------------------------------------------------------------------+
| [Space card] [Space card] [Space card] [Space card] [Space card] [Space card]    |
|     mixed stream: favorites, recent, recommended                                 |
|     horizontally scrollable if needed                                            |
+----------------------------------------------------------------------------------+
```

### Card behavior in For You

- favorites may appear with only the right-top favorite star
- recent spaces may appear with one lightweight supporting line
- recommended spaces may show a left-top ribbon with a reason label
- the section should remain mixed rather than visibly broken into three
  sub-sections

### Recommended card decoration

Recommended cards may use a ribbon-style badge on the left-top edge of the
card.

The ribbon should communicate the specific recommendation reason, such as:

- `Near you`
- `Popular`

It should not simply repeat `Recommended`.

## My Spaces Page

### Intent

`My Spaces` is the fuller personalized destination for users who want to
browse or revisit their own relevant spaces in more detail.

### Structure

```text
+----------------------------------------------------------------------------------+
| Navbar                                                                           |
+----------------------------------------------------------------------------------+
| My Spaces                                                                        |
| Personalized access to spaces you use most                                       |
+----------------------------------------------------------------------------------+
| Favorite Spaces                                                                  |
| [Space card] [Space card] [Space card] ...                                       |
+----------------------------------------------------------------------------------+
| Recent Spaces                                                                    |
| [Space card] [Space card] [Space card] ...                                       |
+----------------------------------------------------------------------------------+
| Recommended Spaces                                                               |
| [Space card] [Space card] [Space card] [Space card] ...                          |
+----------------------------------------------------------------------------------+
```

### Section behavior

All three sections can use horizontal scrolling when content exceeds the
visible width.

Homepage layout direction:

- `For You` should render as a mixed horizontal rail
- `Recent Spaces` should render as a horizontal quick-return strip
- `Nearby Buildings` may remain a compact grid on `Home`

Initial visible density target:

- `Favorite Spaces`: 2 cards
- `Recent Spaces`: 2 cards
- `Recommended Spaces`: 4 cards

These numbers describe the intended first visible slice rather than a hard
data cap.

## Card Decoration Rules

### Favorite Spaces

- show the favorite star in the right-top corner
- do not add a recommendation ribbon
- do not add duplicate `Favorite` explanation copy by default

### Recent Spaces

- do not add a recommendation ribbon
- may show one line of supporting copy such as recent use or booking context

Example direction:

- `Visited recently`
- `Booked 2 days ago`

### Recommended Spaces

- show a left-top ribbon with a recommendation reason
- also keep the right-top favorite star affordance available for future user
  action

The ribbon visual direction is a lightweight ribbon badge rather than a heavy
promotional sticker.

## Recommended Ribbon Shape

The intended ribbon shape is:

- a horizontal ribbon body
- a notched tail edge
- a small folded accent at the leading edge

The effect should feel intentional and lightweight rather than strongly 3D or
overly decorative.

## Interaction Notes

- clicking a card should follow the normal space-entry flow
- the card structure should remain recognizable as the same space object used
  elsewhere in the product
- `For You` should include a path to the fuller `My Spaces` page

## Empty and Sparse States

### For You

If personalized signals are sparse, the section may be filled primarily by
recommended spaces.

### My Spaces

If a section has no content:

- it may be hidden, or
- it may show a lightweight empty message if preserving section structure is
  more helpful

Do not force placeholder cards just to maintain symmetry.
