# Hand-off Spec: E6 → E1 — Nav Route Addition

## Purpose

If E6's calendar/widget work requires a new navigation entry or route in `App.tsx`, E6 specifies it here. **E1 makes the edit.** E6 never touches `App.tsx`.

## Current state (for E1's reference)

The current nav structure in `App.tsx`:

```typescript
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "events", label: "Events", icon: CalendarDays },
  // ... more items
];
```

Events already has a nav entry at `id: "events"`. No new route is needed for the events page itself.

## Requested changes (E6 fills this in)

<!-- E6: Describe the exact change needed below. Example:
  Add a new route for the calendar view:
  - Route path: /calendar
  - Nav label: "Calendar"
  - Icon: CalendarDays (already imported)
  - Add to NAV array, PAGE_PATH map, and the lazy import
-->

_No changes requested yet. This file exists as a placeholder for E6 to fill in if needed._

## Process
1. E6 fills in the requested change above
2. E6 notifies the Controller
3. The Controller assigns the single edit to E1
4. E1 makes the edit and marks this spec as resolved
