# My Bookings Wireframe

## Goal

The `My Bookings` page helps users:

- manage upcoming bookings
- take immediate actions such as `Check In` and `Cancel`
- review historical bookings in one place

The page should stay lightweight and operational rather than becoming a dense
dashboard.

## Structure

```text
+----------------------------------------------------------------------------------+
| Navbar                                                                           |
+----------------------------------------------------------------------------------+
| My Bookings                                                                      |
| [ Active Bookings ] [ Booking History ]                                          |
+----------------------------------------------------------------------------------+
| Status Filter: [All] [Booked] [Check-in Available] [In Use]                      |
| Sort: [Start time: soonest v]                                                    |
+----------------------------------------------------------------------------------+
| Card                                                                             |
| Space name                                            [Status badge]             |
| Building name                                                                    |
| Mar 27, 2026   09:00-11:00   Seat A12   2h                                       |
| Starts in 2h                                                                     |
| [View Details] [Cancel]                                                          |
+----------------------------------------------------------------------------------+
| Card                                                                             |
| Space name                                            [Check-in Available]       |
| Building name                                                                    |
| Mar 27, 2026   13:00-15:00   Seat B03   2h                                       |
| Starts in 20m                                                                    |
| [View Details] [Check In] [Cancel]                                               |
+----------------------------------------------------------------------------------+
```

## Tabs

The page should use in-page tabs under the navbar:

- `Active Bookings`
- `Booking History`

Default tab:

- `Active Bookings`

This should remain one page with two views, not two separate routes.

## Active Bookings View

### Goal

Surface bookings that still matter to the user's current actions.

### Regions

#### Filter row

- status filter
- sort control

Suggested status filter:

- `All`
- `Booked`
- `Check-in Available`
- `In Use`

Suggested sort control:

- `Start time: soonest`
- `Start time: latest`
- `Duration: longest`
- `Duration: shortest`

#### Booking cards

Each active-booking card should show:

- space name
- building name
- seat label
- date
- time range
- duration
- status badge
- relative time hint such as `Starts in 2h` or `In progress`

#### Buttons

`Booked`:

- `View Details`
- `Cancel`

`Check-in Available`:

- `View Details`
- `Check In`
- `Cancel`

`In Use`:

- `View Details`

`In Use` should not show `Cancel`.

## Booking History View

### Goal

Provide a lightweight record of previous bookings.

### Structure

```text
+----------------------------------------------------------------------------------+
| My Bookings                                                                      |
| [ Active Bookings ] [ Booking History ]                                          |
+----------------------------------------------------------------------------------+
| Status Filter: [All] [Completed] [Expired] [Cancelled]                           |
| Sort: [Most recent v]                                                            |
+----------------------------------------------------------------------------------+
| Card                                                                             |
| Space name                                            [Completed]                |
| Building name                                                                    |
| Mar 22, 2026   09:00-11:00   Seat A12   2h                                       |
| [View Details]                                                                   |
+----------------------------------------------------------------------------------+
```

### Filter row

Suggested status filter:

- `All`
- `Completed`
- `Expired`
- `Cancelled`

Suggested sort control:

- `Most recent`
- `Oldest`
- `Duration: longest`
- `Duration: shortest`

### History cards

Each history card should show:

- space name
- building name
- seat label
- date
- time range
- duration
- final status badge

Actions:

- `View Details`

## Detail Modal

### Goal

Give the user a read-only detail view for a booking without routing away from
the page.

### Structure

```text
+----------------------------------------------------------------------------------+
| Booking Details                                                            [X]   |
+----------------------------------------------------------------------------------+
| Space X                                                                         |
| Building A                                                                      |
| Seat A12                                                                        |
| Mar 27, 2026   09:00-11:00   Booked                                             |
| Booking ID: ...                                                                  |
| Created at: ...                                                                  |
+----------------------------------------------------------------------------------+
| Read-only floorplan preview                                                      |
| [floorplan image / svg]                                                          |
|              [highlighted booked seat]                                           |
+----------------------------------------------------------------------------------+
| [Close]                                          [Check In / Cancel if valid]    |
+----------------------------------------------------------------------------------+
```

### Notes

- this modal is informational, not interactive
- the floorplan preview is read-only
- active bookings may expose contextual actions in the modal
- history items should remain view-only
