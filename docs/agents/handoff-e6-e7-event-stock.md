# Hand-off Contract: E6 (Events) ↔ E7 (Projects) — Event Stock List

## Purpose

E7 builds projects that can be owned by an event. E6 displays event-owned projects in the event detail's stock/product list. Neither engineer edits the other's files.

## Owner

- **Projects → Event wiring:** E7 owns `functions/api/projects/` + `ProjectsPage.tsx`
- **Event stock list display:** E6 owns `EventsPage.tsx` + `functions/api/events/`

## Data flow

```
E7 creates a project with event_id = X
       ↓
E7's GET /api/projects?event_id=X returns it
       ↓
E6 calls that endpoint to populate the event's stock list
```

## Contract: E7's API

### `GET /api/projects?event_id={eventId}`

Returns all projects owned by a given event.

**Response shape (the part E6 cares about):**
```json
{
  "projects": [
    {
      "id": "uuid",
      "projectNumber": "P-2026-001",
      "title": "Custom pearl necklace for Trunk Show",
      "stage": "production",
      "eventId": "uuid-of-event",
      "catalogPieces": [
        {
          "id": "uuid",
          "sku": "N-001",
          "name": "Freshwater Pearl Necklace",
          "category": "necklace",
          "retailPriceCents": 350000,
          "metalType": "Sterling Silver",
          "karat": null,
          "stoneSummary": "Freshwater pearls, 8mm"
        }
      ],
      "targetDate": "2026-08-15T00:00:00Z"
    }
  ]
}
```

**Field notes for E6:**
- `projectNumber` — display as the project identifier
- `title` — display as the piece/project name
- `stage` — use `STAGE_PILL` / `STAGE_DOT` for consistent display
- `catalogPieces` — the pieces associated with this project (may be empty array)
- `targetDate` — show on calendar views

## Contract: E6's display

E6's event detail view:
1. Calls `GET /api/projects?event_id={currentEventId}`
2. Renders projects in the "Stock / Products" section of the event detail
3. Each project shows: project number, title, stage pill, pieces
4. If no projects: show the placeholder "No projects linked to this event yet. Create one in Projects."

## What E7 does NOT do
- E7 does NOT edit `EventsPage.tsx` or any event files
- E7 does NOT write the event stock list UI

## What E6 does NOT do
- E6 does NOT edit `ProjectsPage.tsx` or any project files
- E6 does NOT write project creation logic

## Verification

Before Wave 3 is marked complete, the Controller:
1. Creates a project owned by an event via E7's form
2. Opens that event in E6's event detail view
3. Confirms the project appears in the stock/product list
4. Verifies the project's pieces are listed correctly
