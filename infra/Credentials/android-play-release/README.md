# Android Play Console — release materials (local only)

Use this folder on your machine for **upload keystore**, **password reference**, and **optional copies** of shipped `.aab` files. Files listed in `.gitignore` here are **not** committed.

## Backend for store builds

The Expansion Network app is wired to Firebase **`mortar-stage`** (`projectId` in `lib/firebase_options.dart`, `android/app/google-services.json`). Use that project for Auth, Functions, and Firestore when testing internal tracks.

## One-time: create the upload keystore

`keytool` is **not** on PATH in Git Bash unless you install a standalone JDK and add it. Android Studio bundles it under **JBR** — use the full path (quotes matter because of spaces).

**Git Bash (MINGW64)** — create the file in this folder:

```bash
cd ~/Documents/TheCultureConnectionTechnologySolutions/WorkingMortarProj/infra/Credentials/android-play-release

"/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe" -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload -keystore upload-keystore.jks
```

If Android Studio is installed elsewhere, search for `keytool.exe` under that install’s `jbr\bin` folder.

**PowerShell** (same folder):

```powershell
cd $HOME\Documents\TheCultureConnectionTechnologySolutions\WorkingMortarProj\infra\Credentials\android-play-release
& 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe' -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias upload -keystore upload-keystore.jks
```

Optional: add `C:\Program Files\Android\Android Studio\jbr\bin` to your user **PATH**, then plain `keytool` works in new terminals.

If you see **“Keystore file exists, but is empty”**, delete the zero-byte `upload-keystore.jks` in this folder (`rm upload-keystore.jks` or remove it in Explorer), then run `keytool` again.

Save this folder’s `upload-keystore.jks` somewhere **backed up** (password manager attachment, secure drive, **not** only this laptop).

## Signing from Gradle

**Google Play rejects bundles signed with the debug key.** You must have **`android/key.properties`** or **`android/keystore.properties`** (same contents) configured; otherwise release `.aab` builds will fail early with a Gradle error (or previously would have been debug-signed and rejected by Play).

1. Copy `ExpansionNetworkApp/expansion_network/android/key.properties.example` to `android/key.properties` **or** `android/keystore.properties` (next to the example file).
2. Set **all four** values (no blanks): `storePassword`, `keyPassword`, `keyAlias`, `storeFile`. Save the file as **UTF-8**. If you use **both** `key.properties` and `keystore.properties`, Gradle **merges** them (`keystore.properties` wins on duplicate keys). Put these files in **`android/`**, not `android/app/`.
3. **`storeFile`:** Relative to `android/` (recommended) or absolute Windows path. Gradle reads `key.properties` with a **simple line parser** (not Java’s `.properties` escapes), so normal backslashes are fine.
4. Example relative to `android/`: `../../../infra/Credentials/android-play-release/upload-keystore.jks`

### Before `flutter build appbundle --release` (required for a clean pass)

Flutter runs a **post-build check** on the `.aab` using **Android SDK Command-line Tools** (`apkanalyzer`). If **cmdline-tools** are missing, Gradle may still produce an `.aab`, but Flutter exits with **“Release app bundle failed to strip debug symbols…”**. Do this **first**, then build:

1. **Android Studio** → **Settings** → **Languages & Frameworks** → **Android SDK** → **SDK Tools** → enable **Android SDK Command-line Tools (latest)** → **Apply**.
2. Open a **new** terminal (so the SDK layout is picked up), then accept licenses:  
   `flutter doctor --android-licenses` (answer `y` to each prompt).
3. Confirm **`flutter doctor`** shows no Android toolchain errors (no “cmdline-tools component is missing”, no “license status unknown”). If needed, set user env **`ANDROID_HOME`** to your SDK path (e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`) and open a new terminal again.
4. From the app root, clear old outputs so the next bundle is a full rebuild:  
   `cd ExpansionNetworkApp/expansion_network && flutter clean && flutter pub get`

### Build

```bash
cd ExpansionNetworkApp/expansion_network
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`. You may copy that `.aab` into this folder for your records (still gitignored).

## Google Play — internal testing

1. [Play Console](https://play.google.com/console) → your app → **Testing** → **Internal testing** → create release.
2. Upload the `.aab`. Prefer **Play App Signing** (Google holds the app signing key; you keep the **upload** key in `upload-keystore.jks`).
3. Add testers by email list or Google Group; share the opt-in link.

## Passwords

Store **keystore password**, **key password**, and **alias** in a password manager. A plain `passwords-here.txt` in this directory is gitignored but still risky if the folder is copied; prefer the manager.

## Certificate fingerprints (SHA-1 / SHA-256)

**Yes, save them** (in the password manager, not in git). You need the **upload keystore** prints for **Firebase** (Android app fingerprints) and sometimes **Google Cloud** OAuth clients. After **Play App Signing** is on, add **Play’s app signing certificate** fingerprints too (Play Console → **Setup** → **App signing**).

From this folder (adjust path to your keystore):

```bash
"/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe" -list -v -keystore upload-keystore.jks -alias upload
```

Copy the **`SHA1:`** and **`SHA256:`** lines from the output.

## Version bumps

Before each upload, bump `version:` in `pubspec.yaml` (e.g. `1.0.1+2` — the `+` number is Android `versionCode`, required to increase every Play upload).
