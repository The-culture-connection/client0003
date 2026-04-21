import 'package:cloud_firestore/cloud_firestore.dart';

/// Reserved top-level keys on every analytics document. Callers must not
/// place these inside [logEvent] params; they are injected by [AnalyticsService].
const Set<String> kAnalyticsReservedTopLevelKeys = {
  'event_name',
  'user_id',
  'session_id',
  'screen',
  'route',
  'client_emitted_at',
  'ingested_at',
  'properties',
};

/// Centralized schema validation for client analytics payloads (Dart equivalent
/// of a Zod object: explicit rules + predictable errors).
class AnalyticsEventSchemaException implements Exception {
  AnalyticsEventSchemaException(this.message);
  final String message;
  @override
  String toString() => 'AnalyticsEventSchemaException: $message';
}

/// Validates merged Firestore-ready maps before write.
class AnalyticsEventSchema {
  AnalyticsEventSchema._();

  static final RegExp _eventNamePattern = RegExp(r'^[a-z][a-z0-9_]*$');
  static const int _maxEventNameLength = 120;
  static const int _maxPropertiesEntries = 50;
  static const int _maxStringValueLength = 4000;
  static const int _maxDepth = 5;

  /// Builds the canonical document and throws [AnalyticsEventSchemaException] if invalid.
  static Map<String, dynamic> buildAndValidate({
    required String eventName,
    required String? userId,
    required String sessionId,
    required String screen,
    required String route,
    required Map<String, Object?> params,
  }) {
    if (eventName.isEmpty || eventName.length > _maxEventNameLength) {
      throw AnalyticsEventSchemaException('event_name length invalid');
    }
    if (!_eventNamePattern.hasMatch(eventName)) {
      throw AnalyticsEventSchemaException(
        'event_name must be snake_case: ^[a-z][a-z0-9_]*\$ got "$eventName"',
      );
    }
    if (sessionId.isEmpty) {
      throw AnalyticsEventSchemaException('session_id is required');
    }
    if (screen.isEmpty) {
      throw AnalyticsEventSchemaException('screen is required');
    }
    if (route.isEmpty) {
      throw AnalyticsEventSchemaException('route is required');
    }

    for (final key in params.keys) {
      if (kAnalyticsReservedTopLevelKeys.contains(key)) {
        throw AnalyticsEventSchemaException(
          'params must not use reserved key "$key" — nest custom data only in allowed params.',
        );
      }
    }

    final properties = _sanitizePropertiesMap(params, depth: 0);
    if (properties.length > _maxPropertiesEntries) {
      throw AnalyticsEventSchemaException(
        'params may contain at most $_maxPropertiesEntries entries',
      );
    }

    return <String, dynamic>{
      'event_name': eventName,
      'user_id': userId,
      'session_id': sessionId,
      'screen': screen,
      'route': route,
      'client_emitted_at': Timestamp.now(),
      'ingested_at': FieldValue.serverTimestamp(),
      'properties': properties,
    };
  }

  static Map<String, dynamic> _sanitizePropertiesMap(
    Map<String, Object?> raw, {
    required int depth,
  }) {
    if (depth > _maxDepth) {
      throw AnalyticsEventSchemaException('params nesting exceeds $_maxDepth levels');
    }
    final out = <String, dynamic>{};
    for (final e in raw.entries) {
      final key = e.key;
      final value = e.value;
      if (key.isEmpty || key.length > 200) {
        throw AnalyticsEventSchemaException('invalid property key');
      }
      if (key.contains('.') || key.contains('/') || key.startsWith('__')) {
        throw AnalyticsEventSchemaException('invalid property key "$key"');
      }
      out[key] = _sanitizeValue(value, depth: depth);
    }
    return out;
  }

  static dynamic _sanitizeValue(Object? value, {required int depth}) {
    if (value == null) return null;
    if (value is String) {
      if (value.length > _maxStringValueLength) {
        return '${value.substring(0, _maxStringValueLength)}…';
      }
      return value;
    }
    if (value is num || value is bool) {
      return value;
    }
    if (value is Timestamp) return value;
    if (value is DateTime) return Timestamp.fromDate(value.toUtc());
    if (value is Map<String, Object?>) {
      return _sanitizePropertiesMap(value, depth: depth + 1);
    }
    if (value is Map) {
      final cast = <String, Object?>{};
      for (final e in value.entries) {
        cast['${e.key}'] = e.value;
      }
      return _sanitizePropertiesMap(cast, depth: depth + 1);
    }
    if (value is List) {
      if (value.length > 100) {
        throw AnalyticsEventSchemaException('list params max 100 elements');
      }
      return value.map((e) => _sanitizeValue(e, depth: depth + 1)).toList();
    }
    return value.toString();
  }
}
