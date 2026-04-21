import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:expansion_network/analytics/analytics_event_schema.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AnalyticsEventSchema', () {
    test('buildAndValidate produces required top-level keys', () {
      final doc = AnalyticsEventSchema.buildAndValidate(
        eventName: 'analytics_manual_test',
        userId: 'uid_1',
        sessionId: 'sess_1',
        screen: '/home',
        route: '/home',
        params: const {'foo': 'bar', 'n': 1},
      );

      expect(doc['event_name'], 'analytics_manual_test');
      expect(doc['user_id'], 'uid_1');
      expect(doc['session_id'], 'sess_1');
      expect(doc['screen'], '/home');
      expect(doc['route'], '/home');
      expect(doc['client_emitted_at'], isA<Timestamp>());
      expect(doc['ingested_at'], isA<FieldValue>());
      expect(doc['properties'], isA<Map>());
      final props = doc['properties'] as Map;
      expect(props['foo'], 'bar');
      expect(props['n'], 1);
    });

    test('rejects invalid event_name', () {
      expect(
        () => AnalyticsEventSchema.buildAndValidate(
          eventName: 'BadName',
          userId: null,
          sessionId: 's',
          screen: 'x',
          route: 'y',
          params: const {},
        ),
        throwsA(isA<AnalyticsEventSchemaException>()),
      );
    });

    test('rejects reserved keys in params', () {
      expect(
        () => AnalyticsEventSchema.buildAndValidate(
          eventName: 'ok_event',
          userId: null,
          sessionId: 's',
          screen: 'x',
          route: 'y',
          params: const {'user_id': 'nope'},
        ),
        throwsA(isA<AnalyticsEventSchemaException>()),
      );
    });
  });
}
