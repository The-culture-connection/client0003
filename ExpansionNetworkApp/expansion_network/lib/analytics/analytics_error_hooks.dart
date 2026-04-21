import 'dart:async';

import 'package:flutter/foundation.dart';

import 'analytics_service.dart';

FlutterExceptionHandler? _previousFlutterOnError;
bool Function(Object error, StackTrace stack)? _previousPlatformOnError;

bool _installed = false;

/// Installs global Flutter / platform error hooks that log to [AnalyticsService].
///
/// Chains to any prior [FlutterError.onError]. Replaces [PlatformDispatcher.instance.onError]
/// but forwards to the previous handler when non-null.
void installAnalyticsGlobalErrorHooks(AnalyticsService analytics) {
  if (_installed) return;
  _installed = true;

  _previousFlutterOnError = FlutterError.onError;
  FlutterError.onError = (FlutterErrorDetails details) {
    unawaited(
      analytics.logEvent(
        'app_flutter_error',
        {
          'exception': details.exceptionAsString(),
          'library': details.library ?? '',
          'context': details.context?.toString() ?? '',
        },
      ),
    );
    final prev = _previousFlutterOnError;
    if (prev != null) {
      prev(details);
    } else {
      FlutterError.presentError(details);
    }
  };

  _previousPlatformOnError = PlatformDispatcher.instance.onError;
  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    unawaited(
      analytics.logEvent(
        'app_platform_error',
        {
          'error': error.toString(),
          'stack': stack.toString(),
        },
      ),
    );
    final prev = _previousPlatformOnError;
    if (prev != null) {
      return prev(error, stack);
    }
    return false;
  };
}
