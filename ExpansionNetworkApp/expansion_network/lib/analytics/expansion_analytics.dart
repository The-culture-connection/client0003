import 'analytics_service.dart';

/// App-level helper: merges [extra] with optional funnel fields under [AnalyticsService.logEvent] `properties`.
///
/// Firestore `properties` use **snake_case** keys (`entity_id`, `source_screen`, `attachment_type`) for parity with web analytics contracts.
abstract final class ExpansionAnalytics {
  ExpansionAnalytics._();

  /// Compact error payload for failure events (`error_code`, `error_message`).
  static Map<String, Object?> errorExtras(Object e, {String? code}) {
    final raw = e.toString();
    final msg = raw.length > 800 ? '${raw.substring(0, 797)}…' : raw;
    return <String, Object?>{
      'error_code': code ?? e.runtimeType.toString(),
      'error_message': msg,
    };
  }

  static Future<void> log(
    String eventName, {
    String? entityId,
    String? sourceScreen,
    String? attachmentType,
    Map<String, Object?> extra = const {},
  }) {
    final props = <String, Object?>{
      ...extra,
      if (entityId != null) 'entity_id': entityId,
      if (sourceScreen != null) 'source_screen': sourceScreen,
      if (attachmentType != null) 'attachment_type': attachmentType,
    };
    return AnalyticsService.instance.logEvent(eventName, props);
  }
}
