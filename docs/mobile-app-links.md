# `/.well-known/` — mobile app link verification

These two files are what let a scanned QR code open THE MORTARVERSE app
directly instead of bouncing the visitor into a browser. Both are fetched by
the operating system, not by our code, so they only work when served from the
**exact host** the app claims.

That host is currently `mortar-stage-stage.up.railway.app`, and it is named in
four places that must always agree:

| Where | What |
| --- | --- |
| `Digital Curriculum/src/app/lib/appStoreLinks.ts` (via the app's `AppLinks.digitalCurriculum`) | the origin the app builds share links against |
| `ExpansionNetworkApp/expansion_network/lib/constants/app_links.dart` | `AppLinks.digitalCurriculum` |
| `ExpansionNetworkApp/expansion_network/lib/services/deep_link_resolver.dart` | `_claimedHosts`, the allow-list of hosts whose links the app will act on |
| `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Runner.entitlements` | the native intent-filter / associated-domain |

Change the host and you must change all of them, redeploy this site, and ship a
new app build. Anything already printed with the old URL stops opening the app.

## `assetlinks.json` (Android App Links)

**Not finished.** `sha256_cert_fingerprints` is a placeholder. Until it holds
the real fingerprint, Android will not verify the link and will show an
app-chooser sheet instead of opening the app directly. The link still works —
it is just one extra tap, and some users will pick the browser.

Get the real value from **Play Console → your app → Test and release → Setup →
App signing → App signing key certificate → SHA-256 certificate fingerprint**,
and paste it in (uppercase hex, colon-separated).

Use the **App signing key**, not the upload key: Play re-signs the APK it
delivers, so the upload key's fingerprint will not match what users install. If
you also install debug builds for testing, add that fingerprint as a second
entry in the array — `keytool -list -v -keystore ~/.android/debug.keystore
-alias androiddebugkey -storepass android -keypass android`.

Verify after deploying:

```
https://<host>/.well-known/assetlinks.json
adb shell pm verify-app-links --re-verify com.expansionnetwork.expansion_network
adb shell pm get-app-links com.expansionnetwork.expansion_network
```

The host should report `verified`.

## `apple-app-site-association` (iOS Universal Links)

Complete — it carries the real Team ID (`76BLRVU779`) and bundle
(`com.mortar.wearemortar`). Two things still have to be true on the Apple side:

1. **Associated Domains** must be enabled for the App ID in the Apple Developer
   portal, and the provisioning profile regenerated. The entitlement is already
   in `Runner.entitlements`; without the capability on the App ID the build
   fails to sign.
2. The file must be served over **HTTPS**, with no redirect, as
   `application/json`, and with **no file extension**. Do not rename it to
   `.json`.

iOS caches this file, so test a change on a device that has never installed the
app, or reinstall.

## Serving notes

Both files must be reachable at the paths above with no authentication and no
SPA rewrite.

### Known blocker: `serve -s` swallows the AASA file

**`assetlinks.json` (Android) is served correctly today. The iOS AASA file is
not.** This was measured against the real production command, `serve -s dist`
(see `Digital Curriculum/package.json` → `start`):

```
GET /.well-known/assetlinks.json
  200  application/json  299 bytes   ← correct

GET /.well-known/apple-app-site-association
  200  text/html  1050 bytes         ← index.html, not the file
```

The cause is a rule inside `serve`'s handler: it applies SPA rewrites to any
request path **with no file extension**, whether or not a real file sits there.
Apple requires this file to have no extension, so `-s` always wins and iOS
receives the HTML shell instead of JSON. Universal Links then fail silently —
nothing logs anywhere, links simply open in Safari.

Things that were tried and do **not** work:

- A `rewrites` entry in `serve.json` pointing the path at a `.json` twin — a
  literal `.well-known/...` source never matches, in either rule order.
- A self-referential rewrite — the destination is still extension-less, so the
  rule re-triggers.
- A catch-all with a negative lookahead (`/:path((?!\.well-known).*)`) — the
  bundled `path-to-regexp` throws on it and the server will not boot.

What does work, verified: dropping `-s` and listing routes explicitly, e.g.
`{"source": "/tickets", "destination": "/index.html"}`. Literal, non-dot
sources match fine, and both `.well-known` files are then served correctly.

So there are two ways forward, and both are deployment decisions rather than
app changes:

1. **Enumerate the SPA routes** in `serve.json` `rewrites` and change `start`
   to `serve dist` (no `-s`). Correct immediately, but every new top-level
   route has to be added here or it 404s on hard refresh.
2. **Replace `serve` with a small static server** (Express, or `serve-handler`
   driven directly) that serves real files first and falls back to
   `index.html` only for genuine misses. More robust, slightly more to own.

Until one of those lands:

- **Android** works fully once the fingerprint above is filled in.
- **iOS** falls back to the `mortaralumni://` custom scheme, which the
  public `/tickets` page triggers automatically, so scanned links still reach
  the app — just via a page load rather than instantly.
