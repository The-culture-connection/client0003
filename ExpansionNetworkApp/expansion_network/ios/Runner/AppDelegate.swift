import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Do NOT call FirebaseApp.configure() here. Dart [Firebase.initializeApp] with
    // [DefaultFirebaseOptions] must run first; if the native default app already exists,
    // main.dart skips Dart init (`Firebase.apps.isNotEmpty`) and Release builds can crash
    // with heap errors ("freed pointer was not the last allocation").
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
