# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React + TypeScript + Vite classroom seating chart application deployed to GitHub Pages. Uses Material UI with an Apple "liquid glass" visual style (frosted translucent panels, backdrop blur, subtle shadows).

## Development Commands

```bash
npm run dev      # Start dev server with HMR
npm run build    # Type-check with tsc and build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

## UI Libraries

- `@mui/material` + `@emotion/react` + `@emotion/styled` — component library and styling
- `@mui/icons-material` — icon buttons (Add/Remove for group size stepper)
- `xlsx` (SheetJS) — client-side Excel/CSV parsing

## Architecture

### Build Configuration
- **Base Path**: `/seating-chart/` configured in `vite.config.ts` for GitHub Pages deployment
- **TypeScript**: Uses project references - `tsconfig.app.json` for src code, `tsconfig.node.json` for config files
- **Build Output**: `dist/` directory (git ignored)

### TypeScript Configuration
- Strict mode enabled with additional linting options (`noUnusedLocals`, `noUnusedParameters`, etc.)
- Bundler module resolution with `allowImportingTsExtensions`
- Target: ES2022 for app code, ES2023 for Node config

### ESLint
- Uses flat config format (eslint.config.js)
- React Hooks and React Refresh plugins configured
- Ignores `dist/` directory

## Room Layout

The seating chart represents a physical classroom viewed from above:

```
              Back of Room
         ┌─────────────────────┐
         │    [T7]   [T8]      │
Windows  │ [T6] [T5] [T4]     │  Door (Entrance)
         │ [T1] [T2] [T3]     │
         └─────────────────────┘
          Front / Whiteboard
```

- **8 fixed tables** in 3 rows: front (3), middle (3), back (2 centered)
- **Middle row** is numbered right-to-left: 6, 5, 4
- **Labels**: "Front / Whiteboard" (bottom), "Back of Room" (top), "Windows" (left, reads bottom-to-top), "Door (Entrance)" (right, reads top-to-bottom)

### Table Cards
Each table/team card contains:
- Team header with group size stepper (range 3–5, default 4)
- Student names in a 2×2 grid layout:
  - **Size 5**: extra seat centered above the 2×2 grid
  - **Size 4**: standard 2×2 grid
  - **Size 3**: 2×2 grid with bottom-right cell inactive (dashed border, name preserved in data but hidden)

### Drag and Drop
- Uses native HTML5 Drag and Drop API (no external library)
- Names can be dragged from any occupied seat to any other seat (within or across teams)
- **Move**: dropping on an empty seat moves the name; source becomes empty
- **Swap**: dropping on an occupied seat swaps the two names
- **State**: all student assignments are lifted to `SeatingChart` as `useState<string[][]>`; group sizes also lifted as `useState<number[]>`
- **Seat addressing**: each seat identified by `{ tableIndex, seatIndex }` passed via `dataTransfer`
- **Visual indicators**:
  - Drag source: reduced opacity, light green background, dashed green border
  - Drop target hover: light blue background, dark blue border
  - Child text has `pointerEvents: 'none'` to prevent dragLeave flicker

### Group Size Stepper Seat Shifting
- **4→5**: grid names shift from slots `[0,1,2,3]` to `[1,2,3,4]`; slot 0 (top seat) starts empty
- **5→4**: top seat (slot 0) name moves to unassigned if non-empty; grid names shift from `[1,2,3,4]` to `[0,1,2,3]`

### Controls Bar
Above the room layout, a single-row glass panel contains (left to right):
- **Excel File (Seating Requirements):** label + upload button (accepts `.xlsx`, `.xls`, `.csv`)
- **Priority:** label + dropdown (options: Location, Groupmates, Random)
- **Randomize** button (disabled until a file is uploaded) — runs constraint-satisfaction algorithm via `calculateSeating()`, shows CircularProgress spinner for 1 second minimum, displays error Dialog if no valid configuration exists
- **Save** button (disabled until a file is uploaded) — exports seating state to `.json` file
- **Load** button — imports a previously saved `.json` seating file

### Initial State & File Upload
- Tables start with **all empty seats** (no placeholder data)
- On file upload, names from the Excel file populate tables sequentially (table 1→8), respecting each table's current group size
- Overflow names go to the **Unassigned** panel

## Styling Conventions

- All component styling uses MUI `sx` prop — no CSS modules or styled-components
- Glass effect defined in `src/theme/glassStyles.ts`: semi-transparent backgrounds, `backdrop-filter: blur()`, subtle borders and box-shadows
- `src/App.css` is intentionally empty (all styling via `sx`)
- `src/index.css` sets only the pastel gradient background and base system fonts

## System Architecture: Strictly Client-Side
- **NO BACKEND:** This application is 100% frontend-only. Do not write, suggest, or assume the existence of any Node.js servers, API routes, or backend databases.
- **Local Processing:** All data processing, sorting, and seating logic must execute directly within the user's browser.

## File Handling (Excel Parsing)
- Parsing is implemented in `src/utils/parseSeatingFile.ts` using the `xlsx` library
- Reads file as `ArrayBuffer` via `file.arrayBuffer()`
- **Headers** are on **row 2** (index 1); **data rows** are rows 3–50 (indices 2–49)
- **Column matching** (case-insensitive):
  - `name`: header **contains** `'name'`
  - `person preference` / `cannot sit with`: header **exactly matches**
  - `location preference` / `location needs`: header **exactly matches**
  - `social`: header **contains** `'social'`
- Rows with an empty name column are skipped
- Returns `SeatingRow[]` — type is `{ id: number; requirements: { location: number[]; notPeople: string[] } } & Record<string, unknown>`
  - `id`: row index minus 1
  - `requirements.location`: array of valid table numbers (1–8), derived from "location needs" column via `parseLocationPreferences()`
  - `requirements.notPeople`: array of names this person cannot sit with, derived from "cannot sit with" column via `parseNameList()`
- **NEVER** write code that attempts to `fetch()` or `POST` the uploaded file to an external URL or server

## State Management & Persistence
- All application state (the list of uploaded guests, table assignments, and requirements) must be managed using React state (e.g., `useState`, `useReducer`, or React Context).
- **Data Persistence:** Save/Load buttons let the user export and import seating state as `.json` files. Save uses the File System Access API (`showSaveFilePicker`) with a download fallback for unsupported browsers. Load uses a hidden `<input type="file" accept=".json">`.
- **Save format:** JSON containing `excelFileName`, `groupSizes`, `tables` (each with 5 seats including name and associated `SeatingRow` data), and `unassigned` (each with name and `SeatingRow` data).
- Do not write schemas for databases like PostgreSQL, MongoDB, or Firebase.

## Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys to GitHub Pages on push to main branch:
1. Builds the project (`npm run build`)
2. Uploads `dist/` artifacts
3. Deploys to `gh-pages` branch

## Key Files

- `src/App.tsx` — ThemeProvider + CssBaseline wrapper
- `src/main.tsx` — Application entry point
- `src/components/SeatingChart.tsx` — Main container: controls bar (upload, priority, randomize, save/load), 8-table room grid with labels, all state management (students, groupSizes, unassigned, seatingRows, isRandomizing, errorDialogOpen), drag-and-drop handler, save/load/randomize handlers, error dialog
- `src/components/TableCard.tsx` — Glass-effect card: team header, group size stepper, 2×2 student grid with drag-and-drop seats
- `src/components/UnassignedPanel.tsx` — Scrollable side panel for unassigned student names with drag-and-drop slots
- `src/utils/parseSeatingFile.ts` — Excel/CSV parser: column matching, row extraction, returns `SeatingRow[]` with requirements
- `src/utils/seatCalculation.ts` — Randomized backtracking constraint-satisfaction algorithm for seat assignment; respects location and notPeople constraints; retry loop with iteration limit to prevent browser hangs
- `src/utils/parsingUtils.ts` — `parseLocationPreferences()` (maps location keywords/numbers to valid table arrays) and `parseNameList()` (parses comma/newline-separated name lists)
- `src/data/placeholderData.ts` — Hardcoded placeholder student names (9 tables × 5 names; no longer used at startup)
- `src/theme/theme.ts` — Custom MUI theme (light mode, Apple system fonts)
- `src/theme/glassStyles.ts` — Reusable frosted glass `sx`-prop style objects
- `vite.config.ts` — Vite configuration with base path
- `eslint.config.js` — ESLint flat config

## Randomize Algorithm
- Implemented in `src/utils/seatCalculation.ts` as `calculateSeating()`
- **Algorithm**: Randomized backtracking with most-constrained-first (MCV) ordering
- **Constraints**: (1) each person must sit at a table in their `requirements.location` array, (2) no two people in the same `notPeople` conflict may share a table (bilateral, case-insensitive)
- **Overflow**: if more people than seats, the backtracker dynamically chooses who goes to unassigned (not pre-selected) to avoid forcing unsatisfiable states
- **Performance safeguards**: `MAX_ITERATIONS` (500,000) per attempt, `MAX_RETRIES` (3) with fresh shuffles. Returns `null` if all attempts fail.
- **UX flow**: button shows CircularProgress spinner + disabled state → `setTimeout(0)` yields to browser → algorithm runs → enforces 1-second minimum delay → updates UI or shows glass-styled error Dialog

## Key Notes When Implementing Changes
- any operation that matches or compares names needs to be case-insensitive