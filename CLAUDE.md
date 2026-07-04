# CLAUDE.md — Android Emulator Testing Guide

## Project overview
Native Android app written in Kotlin. Built with Gradle, tested on the Android Emulator on Windows.

<!-- TODO: Replace the placeholders below after running `emulator -list-avds` and checking your app's applicationId in app/build.gradle.kts -->

## Environment
- OS: Windows (use PowerShell-compatible commands; gradlew is invoked as `.\gradlew`)
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- Emulator AVD name: `Pixel_8_API_35`  <!-- TODO: replace with output of `emulator -list-avds` -->
- App package name: `com.example.myapp`  <!-- TODO: replace with your applicationId -->
- Main activity: `com.example.myapp.MainActivity`  <!-- TODO: replace if different -->

## Common commands

### Build
```powershell
.\gradlew assembleDebug
```
Debug APK output: `app\build\outputs\apk\debug\app-debug.apk`

### Start the emulator (if not already running)
```powershell
emulator -avd Pixel_8_API_35 -no-snapshot-load &
adb wait-for-device
```
Check whether one is already running first with `adb devices`.

### Install and launch
```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n com.example.myapp/.MainActivity
```

### See the screen
Take a screenshot and view it to verify UI state:
```powershell
adb exec-out screencap -p > screen.png
```
Always take a screenshot after launching or interacting, before deciding the next step.

### Interact with the UI
```powershell
adb shell input tap <x> <y>
adb shell input swipe <x1> <y1> <x2> <y2> 300
adb shell input text "hello"
adb shell input keyevent KEYCODE_BACK
```
Screen resolution can be checked with `adb shell wm size`. Prefer reading the UI hierarchy over guessing coordinates:
```powershell
adb shell uiautomator dump
adb pull /sdcard/window_dump.xml
```
The dump contains element bounds — compute tap coordinates from the center of an element's bounds.

### Debugging
```powershell
adb logcat -d -s AndroidRuntime:E   # dump recent crashes
adb logcat -c                        # clear log before a test run
```
After any crash, read the stack trace from logcat before editing code.

### Automated tests
```powershell
.\gradlew test                    # unit tests
.\gradlew connectedAndroidTest    # instrumented (Espresso) tests on the emulator
```
Prefer writing Espresso tests for flows that need to be verified repeatedly.

## Testing workflow
1. Build with `.\gradlew assembleDebug` and fix any compile errors first.
2. Ensure the emulator is running (`adb devices`).
3. Install the APK and launch the main activity.
4. Screenshot to confirm the app launched successfully.
5. Interact step by step: one action, then screenshot, then evaluate.
6. On a crash: pull the stack trace from logcat, fix the code, rebuild, reinstall, retest.
7. Uninstall cleanly if state gets corrupted: `adb uninstall com.example.myapp`

## Notes
- Don't run `gradlew clean` unless necessary; incremental builds are much faster.
- If `adb` reports no devices but the emulator window is open, run `adb kill-server` then `adb start-server`.
- The emulator can take 1–2 minutes to fully boot; wait for `adb shell getprop sys.boot_completed` to return `1`.
