# Vendored `add_2_calendar` (patched)

Upstream: [ja2375/add_2_calendar](https://github.com/ja2375/add_2_calendar) v3.0.1.

This copy is **path-linked** from `pubspec.yaml` so we can fix:

1. **iOS / Flutter:** `UIApplication.shared.keyWindow` is often `nil`; presentation now uses the foreground `UIWindowScene` and the top `UIViewController` (Flutter root).
2. **iOS 17:** The original plugin did not call `completion` on the iOS 17 code path, leaving the Dart `Future` hanging; completion is wired after presenting the event editor.
3. **Android:** When an `Activity` is available, `startActivity` is called on the activity (not `applicationContext` + `NEW_TASK`), so the calendar insert intent resolves reliably.

Do not edit generated platform folders for these fixes—they live here.
