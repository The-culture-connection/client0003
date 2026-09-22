# `/.well-known/` — mobile app link verification

These two files are what let a scanned QR code open THE MORTARVERSE app
directly instead of bouncing the visitor into a browser. Both are fetched by
the operating system, not by our code, so they only work when served from the
**exact host** the app claims.

**Three hosts are claimed**, and they all serve the same site:

| Host | Role |
| --- | --- |
| `mortarmastersonline.com` | the public domain — QR codes, printed material, anything shared with a person |
| `www.mortarmastersonline.com` | claimed too, because people type it and tools rewrite to it |
| `mortar-stage-stage.up.railway.app` | the Railway host; links to it exist in the wild, and it is what the in-app privacy and account-deletion links use |

Two constants in `lib/constants/app_links.dart` drive this, and they are
separate on purpose:

- **`publicLinkOrigin`** (`mortarmastersonline.com`) builds shareable ticket
  links. Cheap to change — nothing outside the app depends on it.
- **`digitalCurriculum`** (the Railway host) also builds `privacyPolicy` and
  `deleteAccount`, which are **registered with Google Play and App Store
  Connect**. Moving it means updating those store listings, so it is not a
  free rename.

Every claimed host is named in four places that must agree:

| Where | What |
| --- | --- |
| `ExpansionNetworkApp/expansion_network/lib/constants/app_links.dart` | `publicLinkOrigin` and `digitalCurriculum` |
| `ExpansionNetworkApp/expansion_network/lib/services/deep_link_resolver.dart` | `_claimedHosts`, derived from those two — the allow-list of hosts whose links the app acts on |
| `android/app/src/main/AndroidManifest.xml` | one `<data>` entry per host |
| `ios/Runner/Runner.entitlements` | one `applinks:` entry per host |

The web side builds its URLs from `window.location.origin`
(`Digital Curriculum/src/app/lib/appStoreLinks.ts` → `ticketsUrl`), so the
admin portal always emits links for whichever host it is being used on.

**Each host must serve both `.well-known` files.** Android and iOS verify per
host, so one that does not serve them simply never verifies — its links open a
chooser or the browser, silently, while the other hosts work. That asymmetry is
the first thing to check when a QR works on one link but not another.

Adding or changing a host means changing all four places, redeploying the site
on that host, and shipping a new app build. Anything already printed against a
removed host stops opening the app.

## `assetlinks.json` (Android App Links)

**Done.** `sha256_cert_fingerprints` holds the confirmed signing fingerprint:

```
B4:F2:8E:F8:5E:DD:F7:85:1D:6D:12:74:39:29:D1:75:83:C6:00:0A:CC:9B:6E:36:C3:15:40:26:12:25:6D:36
```

Certificate: `CN=Grace, OU=Shorter, O=Mortar Cincinnati, L=Cincinnati, ST=Ohio,
C=US`, valid to August 2053. Confirmed by the project owner as the key Android
verifies against — do not replace it on the basis of a fresh `keytool` run
without checking with them first.

**If verification ever fails specifically on Play-installed builds** (and only
those — sideloaded builds verifying fine is the tell), the thing to re-check is
Play Console → your app → Test and release → Setup → **App signing** → *App
signing key certificate* → SHA-256. When Play App Signing is enabled Google
re-signs the delivered APK with its own key, and that fingerprint has to be
present here too. `sha256_cert_fingerprints` is an array, so the fix is to
append the second value rather than swap this one out. The same applies to the
debug keystore if you want locally-installed debug builds to verify:
`keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey
-storepass android -keypass android`.

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

### How the files are served, and why not `serve`

The site is served by `Digital Curriculum/scripts/serve-dist.mjs` (Express). It
replaced `serve -s dist`, which **could not serve the AASA file at all**.

> **The start command lives in `Digital Curriculum/railway.toml`**, under
> `[deploy] startCommand`, and it **overrides `package.json` "start"**. Change
> it in `railway.toml` or the change silently does nothing — which is exactly
> what happened the first time: the new server shipped, deployed, and never
> ran. The tell was `assetlinks.json` coming back as JSON while
> `apple-app-site-association` still came back as the SPA shell, since that
> extension-ful / extension-less split is `serve`'s signature.

The cause: `serve` applies its SPA rewrite to any request path with **no file
extension**, whether or not a real file sits there. Apple requires
`apple-app-site-association` to have no extension, so iOS was handed
`index.html` instead of JSON and Universal Links failed silently — nothing logs
anywhere, links just open in Safari. Android was unaffected because
`assetlinks.json` has an extension. Measured before the change:

```
GET /.well-known/assetlinks.json                 200  application/json  299 B   correct
GET /.well-known/apple-app-site-association      200  text/html        1050 B   index.html
```

Config-only fixes were tried against `serve` and none work: a `rewrites` entry
pointing at a `.json` twin (a literal `.well-known/...` source never matches, in
either rule order), a self-referential rewrite (the destination is still
extension-less, so it re-triggers), and a catch-all with a negative lookahead
(the bundled `path-to-regexp` throws and the server will not boot).

**Two things in `serve-dist.mjs` are load-bearing.** Both default to refusing
dot-segments, and either one alone reintroduces the bug:

1. `express.static(DIST, { dotfiles: "allow" })` — Express defaults to
   `"ignore"`, which treats everything under `/.well-known/` as missing.
2. `res.sendFile(..., { dotfiles: "allow" })` on the explicit AASA route —
   `sendFile` enforces its **own** dotfile policy, independent of the static
   middleware. Without it that route 404s and falls through to the SPA shell.

The explicit route also sets `Content-Type: application/json`, which the
extension-less file would not otherwise get, and it is declared before the
static middleware so it always wins.

Ordering matters generally: real files first, SPA fallback last, so the
fallback only ever answers genuinely missing paths.

### Regression check

Run this against the **deployed host**, not just locally. The local server and
the deployed one are selected by different files, so a local pass proves the
code works, not that it is running.

After any change to the server or the build, confirm:

| Path | Expect |
|---|---|
| `/.well-known/apple-app-site-association` | 200, `application/json`, ~418 B — **not** ~1050 B of `index.html` |
| `/.well-known/assetlinks.json` | 200, `application/json` |
| `/tickets`, `/get-the-app`, `/curriculum/abc` | 200 `text/html` (SPA fallback intact) |
| `/privacy.html` | 200, **0 redirects**, ~18 KB of real policy text |
| `/delete-account.html` | 200, **0 redirects**, ~14.5 KB |
| A hashed `/assets/*.js` | 200, `text/javascript` |

The byte length is the tell: if the AASA response is the same size as the SPA
shell, it is the shell.

The two `.html` rows are not decoration. Google Play's policy and Data safety
reviewers fetch those URLs and **do not run JavaScript**, so if either one ever
starts redirecting to its extension-less route and getting the React shell,
the reviewer sees an empty page and the listing gets rejected. That already
happened once. Check redirect count, not just status.

If the host ever moves to a platform that serves static files itself, check
these two paths first when links stop opening — they fail silently everywhere.
