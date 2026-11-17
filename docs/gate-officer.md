# Gate Officer implementation

## Run and preview

Use Node 24 LTS (or another version supported by Expo 58), then run:

```sh
npm install
npx expo start --web --port 8082
```

Open `http://localhost:8082/gate`. The existing Dispatch Home remains at `/`.

| Screen | Path | Figma node |
| --- | --- | --- |
| Vehicle Released | `/vehicle-released?preview=design` | 33:615 |
| Pass Rejected | `/pass-rejected?preview=design` | 33:750 |
| Offline Sync Queue | `/sync-queue?preview=offline` | 2:1243 |
| All Scans Synced | `/sync-queue?preview=synced` | 87:1793 |
| Shipments | `/shipments?preview=design` | 2:1431 |

Preview parameters opt into isolated Figma fixtures and simulated system chrome on
web. They never enqueue or upload fixture scans. Remove the parameters to use live
data. The two queue previews use the same component and queue controller as the live
screen. All action buttons use the real routes. At 390 × 844 the preview chrome
matches the reference's 44-pixel status bar; normal usage relies on real safe areas.

Open `/scan?demo=1` in development for sample pass controls. Load an unused pass and
verify it to see a real persisted release. Scan that same pass again to see a rejection
with **VALID** signature and **ALREADY EXITED** status. The already-exited sample uses
TRF-2610-0418 and WP CAB-1123. Demo issuance is disabled in production.

## Backend

Expo Router API routes run alongside the web app:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/gate/shipments?q=…` | Search by transfer ID, route, or vehicle, with aggregate totals |
| POST | `/api/gate/scans` | Verify a signed pass, check vehicle and previous exit, atomically record the outcome |
| GET | `/api/gate/scans?id=…` | Read a persisted scan result |
| GET | `/api/gate/config` | Read the configured supervisor contact |
| POST | `/api/gate/demo` | Issue development sample passes |

`src/server/gate-database.ts` owns SQLite persistence. The default file is
`.data/gate.sqlite`, ignored by Git. A transaction stores the scan, shipment update,
and notification outbox record together. Each scan ID is unique. Repeating an identical
request returns its original result; using the ID with different input returns 409.
Pass signatures use HMAC-SHA256 and an expiry. Changing the QR contents invalidates
the signature. A valid signature does not authorize a second exit.

The development database seeds 23 example transfers from `src/data/gate-samples.ts`
and additional sample history. The four Figma cards are the default list; searching
queries the full set. Real dispatch/pass issuance and shipment import are integration
points, not invented upstream services. Disable seeding for a real deployment.

Web pages use `web.output: static` plus `apiRoutes: true`, supported by SDK 58. Web
async routes are disabled so navigating from the scanner to the queue while offline
does not require fetching a new route bundle. API routes still require a Node server.
Metro excludes `.data` and `.artifacts` from its source watcher so database writes and
verification screenshots do not invalidate its server module graph during requests.
SQLite requires a writable persistent disk; do not deploy this adapter to an ephemeral
or edge filesystem without replacing the storage adapter.

## Device queue and connectivity

The queue is persisted with AsyncStorage, using the same API on iOS, Android, and web.
Expo Network detects reconnects. A shared controller serializes upload attempts and
persists each acknowledgment. A failed request keeps the scan pending. If the server
accepted a request but its response was lost, the same scan ID is retried, so the
database returns the first outcome without another shipment mutation.

Pending scans contain the original signed pass. Offline capture does **not** claim a
vehicle has been released. The UI tells the officer to hold it until verification.
Rejected uploads remain reviewable from the synced queue. Queue previews use memory
storage and a simulated acknowledgment; live scans use the API.

This change supports offline use of an already-loaded app and durable pending scans.
It does not add a service worker or install manifest; cold-starting the PWA offline
still needs the team's deployment/cache setup. Physical camera permission and scan
quality should also be checked on the target phones; browser automation covers the
manual pass entry path.

## Configuration and remaining integrations

Copy `.env.example` to `.env.local` and fill in values as needed. Restart Expo after
changing environment variables.

- `GATE_SUPERVISOR_PHONE`: actual site supervisor number returned by the backend. No
  number is invented; the call button shows an explicit message until one is set.
- `EXPO_PUBLIC_GATE_SUPERVISOR_PHONE`: optional public contact fallback for offline use.
- `EXPO_PUBLIC_GATE_API_URL`: API origin for a separate server/native deployment.
  Local development uses Expo's relative URL support.
- `GATE_DATABASE_PATH`: persistent SQLite path, default `.data/gate.sqlite`.
- `GATE_PASS_SECRET`: optional externally managed signing key. Local development
  generates and persists a secret in SQLite. Keep it server-only.
- `GATE_SEED_SAMPLE_DATA`: sample seeding defaults on in development and off in
  production. Set `false` for an empty database.
- `GATE_API_TOKEN`: server-side production API credential. Production requests require
  `Authorization: Bearer …`; without a configured credential they fail closed (503).
  Wire the team's officer login/session provider to the API client before production.
  Never put this credential in an `EXPO_PUBLIC_` variable.

Notification outbox records are durable, but external email, SMS, push delivery, and
receiving-system acknowledgments are not configured. Live result copy says a
notification/alert is recorded or queued; only the isolated design preview uses the
reference's “has been notified” copy. Alerts/Profile tabs remain the team's existing
disabled tabs; the selected Shipments tab, Home tab, and scan action work.

Expo Camera, Expo Network, and AsyncStorage were installed through `expo install`.
For a native development binary, rebuild after adding these native modules. No
generated `ios/` or `android/` source files were added.

## Verification

With the dev server running on port 8082:

```sh
npm run typecheck
npm run lint
npm run test:gate
```

Core backend/queue checks can run without a server via `npm run test:gate:core`.
Playwright uses installed Microsoft Edge by default on Windows. Set
`PLAYWRIGHT_CHANNEL=chrome` for installed Chrome or install a matching browser in CI.
Set `GATE_TEST_URL` if the app runs on another origin.

The tests cover signed-pass validation, vehicle mismatch, reused passes, idempotency,
concurrent retries, partial upload failure, storage failure, search, navigation, and
an actual offline → reconnect → persisted acknowledgment flow. They capture all five
reference states at 390 × 844 and 320 × 568 in `.artifacts/screens/` and verify no
horizontal overflow, loaded assets, and reachable bottom actions.

Full-project lint currently reports the pre-existing `react-hooks/set-state-in-effect`
error in `src/hooks/use-color-scheme.web.ts`. That unrelated template hook is unchanged.
