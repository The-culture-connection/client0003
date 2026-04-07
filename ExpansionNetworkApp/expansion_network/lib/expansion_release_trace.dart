import 'dart:developer' as developer;

import 'package:flutter/foundation.dart' show kDebugMode;

/// Timeline breadcrumbs for **Profile / Release** only (visible in Xcode device console).
void expansionReleaseTrace(String message) {
  if (kDebugMode) return;
  developer.log(message, name: 'expansion');
}
