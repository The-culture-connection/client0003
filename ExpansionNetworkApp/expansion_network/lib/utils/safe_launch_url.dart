import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens [uri] in a browser or in-app web view. Tries several [LaunchMode]s so
/// emulators / devices without a resolved external handler still work when possible.
Future<bool> safeLaunchExternalUrl(
  Uri uri, {
  BuildContext? messengerContext,
  String? userFailureMessage,
}) async {
  Future<bool> tryLaunch(LaunchMode mode) async {
    return launchUrl(uri, mode: mode);
  }

  final modes = <LaunchMode>[
    LaunchMode.externalApplication,
    LaunchMode.inAppWebView,
    LaunchMode.platformDefault,
  ];

  for (final mode in modes) {
    try {
      final ok = await tryLaunch(mode);
      if (ok) return true;
    } on PlatformException catch (e, st) {
      developer.log('launchUrl $mode', error: e, stackTrace: st);
    } catch (e, st) {
      developer.log('launchUrl $mode', error: e, stackTrace: st);
    }
  }

  if (messengerContext != null && messengerContext.mounted) {
    ScaffoldMessenger.of(messengerContext).showSnackBar(
      SnackBar(content: Text(userFailureMessage ?? 'Could not open link')),
    );
  }
  return false;
}
