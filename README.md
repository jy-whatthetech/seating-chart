# Seating Chart

A classroom seating chart app built with React, TypeScript and Vite. Everything runs in the browser, with no backend. You upload an Excel/CSV file of students and their seating requirements, and the app assigns them to 8 tables.

**Live app:** https://jy-whatthetech.github.io/seating-chart/

## Input file format

A ready-to-fill template is at [`public/seating-template.xlsx`](public/seating-template.xlsx). The app also links to it with the **Template** button next to the file picker. Its second sheet repeats these instructions.

Parsing happens entirely in the browser, in [`src/utils/parseSeatingFile.ts`](src/utils/parseSeatingFile.ts) and [`src/utils/parsingUtils.ts`](src/utils/parsingUtils.ts).

### Layout

- The file can be `.xlsx`, `.xls` or `.csv`. Only the **first sheet** is read.
- **Row 1 is ignored**, so it can hold a title.
- **Row 2 is the header row.**
- **Rows 3–50 are students**, so there's a maximum of 48. Anything past row 50 is silently dropped, and rows with a blank name are skipped.

### Columns

Columns can be in any order, and header matching ignores capitalization.

| Header | Match rule | Meaning |
|---|---|---|
| Name | first header that *contains* `name` | Student name. `Last, First` is converted to `First Last`. |
| Cannot Sit With | exact match | **Hard rule.** Names separated by commas or line breaks. `0` or blank means none. |
| Location Needs | exact match | **Hard rule.** The tables the student is allowed to sit at (see below). |
| Location Preference | exact match | Soft preference. It's used for highlighting and isn't enforced by Randomize. |
| Person Preference | exact match | Stored, but not used by the seating logic yet. |
| Social… | header *contains* `social` | Stored, but not used by the seating logic yet. |

### Location values

Each line in a cell is either a list of table numbers (`1, 2, 3`) or one of these keywords:

| Keyword | Tables | | Keyword | Tables |
|---|---|---|---|---|
| `front` | 1, 2, 3 | | `not front` | 4, 5, 6, 7, 8 |
| `middle` | 4, 5, 6 | | `not middle` | 1, 2, 3, 7, 8 |
| `back` | 7, 8 | | `not windows` | 2, 3, 4, 5, 8 |
| `windows` | 1, 6, 7 | | `not door` | 1, 2, 5, 6, 7 |
| `door` | 3, 4, 8 | | `not 1 or 2` | 3, 4, 5, 6, 7, 8 |
| `corner` | 1, 3, 7, 8 | | *(blank)* | any table |

You can put several lines in one cell (Alt+Enter in Excel). In **Location Needs**, every line must be satisfied: `not front` + `windows` allows only tables 6 and 7. In **Location Preference**, any line counts.

Table numbers follow the room layout, with the front/whiteboard at the bottom:

```
            Back of Room
          [T7]      [T8]
Windows  [T6] [T5] [T4]   Door
         [T1] [T2] [T3]
         Front / Whiteboard
```

### Pitfalls

- **Write the names in Cannot Sit With as `First Last`.** Commas separate names in that column, so `Smith, John` is read as two people, "Smith" and "John", and the rule silently does nothing.
- **Names in Cannot Sit With must match the Name column exactly** after the `Last, First` conversion (capitalization doesn't matter). A misspelling or nickname won't match, and no warning appears.
- **Avoid other headers that contain "name"** to the left of the real name column (for example "Nickname" or "Teacher name"). The first one found is used as the name column.

## Development

```bash
npm install
npm run dev      # Start dev server with HMR
npm run build    # Type-check with tsc, then build to dist/
npm run lint     # Run ESLint
npm run preview  # Serve the production build from dist/ locally
```

Vite 7 requires Node `^20.19.0` or `>=22.12.0`.

## Deployment

The app is hosted on GitHub Pages and deploys automatically. The workflow is [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. **Trigger:** every push to `main` runs the "Deploy" workflow. Pushes to other branches don't deploy.
2. **Build job:** checks out the repo, installs dependencies and runs `npm run build`, then uploads `dist/` as a workflow artifact.
3. **Deploy job:** runs only if the build succeeds. It uses [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages) to commit the contents of `dist/` to the `gh-pages` branch, replacing whatever was there.
4. **Serving:** GitHub Pages publishes from the `gh-pages` branch (repo **Settings → Pages**: "Deploy from a branch", `gh-pages` / `root`). The live site usually updates a minute or two after the workflow finishes.

To see the status of a deploy or why one failed, check the [Actions tab](https://github.com/jy-whatthetech/seating-chart/actions).

## Build gotchas

- **Don't edit the `gh-pages` branch by hand.** Every deploy overwrites it with a fresh build.
- **The base path must match the repo name.** `vite.config.ts` sets `base: "/seating-chart/"` because Pages serves the app from that subpath. If you rename the repo, change this setting too. Otherwise the page loads blank, because its JS/CSS requests 404.
- **Type errors block the deploy.** `npm run build` runs `tsc -b` before `vite build`, with `strict`, `noUnusedLocals` and `noUnusedParameters` enabled. Code that works fine in `npm run dev` fails the build if it has an unused variable or import. When a build fails, nothing is deployed and the old version stays live. Run `npm run build` locally before pushing.
- **Lint isn't enforced in CI.** The workflow never runs `npm run lint`, so run it yourself.
- **`npm run dev` doesn't match production.** The dev server doesn't show base-path or build problems. Use `npm run build && npm run preview` to test what will actually ship.
- **The CI Node version isn't pinned.** `actions/setup-node` has no `node-version`, so CI uses whatever Node the `ubuntu-latest` runner ships with. If that version ever falls outside Vite's supported range, the build breaks with no change on your side. The fix is to add `node-version` to the workflow.
- **You might see an old version after deploying.** Browsers can cache the old `index.html`, so do a hard refresh (Cmd+Shift+R) if you don't see your changes.
