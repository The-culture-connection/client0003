import FirebaseCore
import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // `GeneratedPluginRegistrant` registers plugins alphabetically, so `cloud_firestore`,
    // `cloud_functions`, and `firebase_auth` run *before* `firebase_core`. In Profile/Release
    // those plugins touch the default Firebase app during registration; without a configured
    // app the process can abort before Dart runs (Debug often still appears to work).
    //
    // Configure from `GoogleService-Info.plist` before plugin registration in
    // `didInitializeImplicitFlutterEngine`, then let Dart call
    // `Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform)` so the
    // Flutter side stays in sync (typically `duplicate-app`, handled in `lib/main.dart`).
    FirebaseApp.configure()
    application.registerForRemoteNotifications()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
