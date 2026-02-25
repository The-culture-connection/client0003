# MORTAR Mobile App

Flutter mobile application for MORTAR platform.

## Setup

1. Install Flutter dependencies:
```bash
flutter pub get
```

2. Run the app:
```bash
flutter run
```

## Configuration

The app is configured to use the `mortar-dev` Firebase project by default. To use emulators, ensure they are running and the `useEmulator` flag is set to `true` in `lib/main.dart`.

## Firebase Setup

Make sure you have:
- Firebase CLI installed
- FlutterFire CLI installed (`dart pub global activate flutterfire_cli`)
- Firebase projects configured (dev/stage/prod)

To configure Firebase for Flutter:
```bash
flutterfire configure
```
