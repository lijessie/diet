# Daily

[Download Daily for Mac (Apple Silicon and Intel)](https://github.com/lijessie/diet/releases/tag/v0.2.0)

Open the Mac release and download its ZIP. Installation and data-transfer instructions are included with the release.

## Android app

[Download Daily for Android](https://github.com/lijessie/diet/releases/tag/v0.3.0)

The Android version bundles the app for offline phone use with Capacitor. It supports Android 7.0+ with an up-to-date Android System WebView and includes a native backup save dialog, JSON import, and Android Back-button handling. See [Android installation and build instructions](android/README.md). Android builds are signed with a private release key; personal data and signing keys are excluded from the repository.

## Desktop app (macOS)

The Electron version runs entirely from bundled files, without Node.js, a browser or a local server on the recipient's Mac. The downloadable universal ZIP supports Apple Silicon and Intel Macs. Unzip it and move `Daily.app` into Applications.

This build is ad-hoc signed, not Apple Developer ID signed or notarized. macOS may block first launch of a downloaded copy and require the recipient to approve it in Privacy & Security. A frictionless public release needs Developer ID signing and Apple notarization. No signing credentials, publishing, or automatic update service are configured.

Each installation starts empty. The application archive contains no spreadsheet or personal diet data. To move existing data from the web app, use **Goals → My data → Export backup**, then **Import JSON backup** in Daily. The desktop app stores data under the user's Application Support/Daily folder, outside the application bundle, so replacing the app does not replace its data. Export backups regularly; there is no cloud sync.

Build commands:

```sh
pnpm install
pnpm exec install-electron
pnpm desktop:start
pnpm desktop:test
pnpm desktop:package
```

The Electron runtime requires Node only for development. `desktop:package` stages compiled assets and two main-process files into `work/desktop-app`; the packaged app has no npm runtime dependencies. `release/` contains the distributable. The universal Mac packaging command must run on macOS. Desktop and web builds use separate output directories.

`electron/main.cjs` uses a stable `daily://app/` origin for persistence. The renderer is sandboxed with context isolation and no Node integration, preload script, or IPC filesystem bridge. Asset routing rejects foreign origins and encoded path traversal; permissions and popups are denied. A content security policy permits only bundled assets. Desktop builds exclude the web service worker, preventing old cached assets after an update.

A mobile-first, single-user macro tracker in the existing `lijessie/diet` repository. The repository was empty at implementation start; React, TypeScript and Vite provide a small static PWA without accounts or a server database.

## Run

Requires Node 22+ and pnpm 11.

```sh
pnpm install
pnpm dev
```

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

The preview server prints a LAN address you can open on a phone connected to the same Wi-Fi while the Mac and server are running. For installed/offline use on a phone, host `dist/` on an HTTPS static host. Service workers work on localhost or HTTPS, not an ordinary LAN HTTP address. No hosting account or deployment is configured.

## Workflow

- **Today:** date navigation, per-date presets, calorie and macro progress, four meal groups, recent food search, portion previews, editing/deleting entries, and optional weight in kg.
- **Foods:** editable personal nutrition library; `100g` foods are logged in grams, all other unit labels scale by quantity. Custom unit labels are supported.
- **Recipes:** ingredients with nutrition snapshots, finished cooked weight, batch totals and nutrition per 100g. Saved recipes are normal loggable foods. Nested recipes are supported with cycle detection. Existing ingredient snapshots do not automatically update when source foods change; remove/re-add an ingredient to refresh it.
- **History:** recorded days, targets, ±10% comparisons, macro trend, weight, and conflict resolution for spreadsheet records. Missing days are not treated as zero intake.
- **Goals:** three editable presets, the original spreadsheet fat-loss calculator, and JSON import/export. Applying a preset edit updates today when that preset is active and future dates. Previously saved days retain their target snapshot unless explicitly changed on that date.

## Architecture and data

`src/domain.ts` owns the schemas and all nutrition calculations using decimal.js (32 significant digits; values serialized to 12 decimal places). `src/storage.ts` owns versioned localStorage and backups. UI files focus on forms and rendering.

The version-1 state contains foods (basic or recipe), recipe ingredient snapshots, daily entries with both base and portion nutrition snapshots, per-day goal snapshots, goal presets, weight logs, profile inputs, imported aggregate records, migration notes and preserved source cells.

Deletion hides foods from the library without deleting referenced logs or recipe ingredients. Quantity edits use the entry's original base snapshot. Every change is persisted before updating UI; storage errors are surfaced without applying an unsaved change. Invalid saved state is not overwritten. Cross-tab storage updates refresh the UI and close stale editors.

All data is local to the browser origin. There is no account, cloud sync or nutrition API. Export a backup periodically and when moving between origins or devices. Clearing browser/site data clears its local copy. The app does not send nutrition data to a server. Fonts and application assets are bundled for offline use.

## Spreadsheet migration

Install Python's `openpyxl` separately if needed, then:

```sh
python scripts/migrate_workbook.py /path/to/workbook.xlsx /path/to/daily-import.json
```

Import the generated JSON in **Goals → My data**. Import replaces app state after confirmation; export a backup first if the app already contains data. Importing the same migration twice does not append duplicates. The supplied workbook and generated personal JSON are not committed to this repository or included in the production bundle.

Only `food`, `recipes`, `me`, `Daily Tracker` and `past_log` are read. Original formulas and cached values are preserved; the workbook is not modified. The migration deliberately does not recalculate the original workbook.

Migration rules:

- Retain duplicate names as distinct source rows. Recipe lookups follow Excel's first exact match. Normalize `1cup`, `1 serving`, etc. to a one-unit label without changing quantities.
- Import complete recipes only if explicit actual finished weight and ingredients reconcile with cached per-100g values. Incomplete/ambiguous batches remain in source data with notes; the independent food-sheet entries remain loggable.
- Preserve food-sheet values, including suspicious values and differences from recipe batches. Basic-food and recipe records remain distinguishable by source/type.
- Use `me`'s manually entered targets as active presets, separate from its calculator recommendation. History retains its own sheet targets. `Goal Change` rows update subsequent targets rather than becoming food intake.
- Import only dated numeric totals. Preserve undated totals and placeholders without assigning invented dates or zero values.
- Flag multiple totals on a date; exclude all until the user chooses one baseline. Keep the alternatives. New entries on a migrated day add to its baseline, so avoid re-logging foods already included in that total.
- Convert explicitly labelled pounds to kg, retaining the original values.

Source-specific migration audits and personal workbook data are kept local and excluded from this repository. Keep migration scripts removable and separate from runtime code.

## Verification

Domain tests cover weight/unit scaling, recipe normalization, calorie conversion, decimal accumulation, snapshot stability, nested cycles, all activity coefficients, original calculator values, goal snapshots, ambiguous imports, search normalization and invalid backups.

Browser tests are in `e2e/workflows.spec.ts`:

```sh
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

Some desktop sandboxes prevent Chromium from launching (macOS MachPortRendezvous permission denied). The browser suite must run in an environment that permits browser processes. The same core workflows can be checked with the in-app browser.

## Deliberate MVP limits

- Single-device storage with manual JSON transfer, no automatic sync.
- The calculator implements the supplied fat-loss workflow; no replacement BMR formula, medical recommendation engine, or muscle-gain calculator.
- Incomplete recipe batches require manual reconstruction from the preserved source.
- Trend charts use recorded dates, without advanced analytics or workout tracking.
- HTTPS hosting is needed for always-available phone/PWA use; local LAN preview depends on the Mac staying on.
