import 'package:expansion_network/services/member_card_link.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const uid = 'aBc123XyZ_uid-0987';

  group('buildMemberCardPayload', () {
    test('produces the versioned, namespaced URI', () {
      expect(
        buildMemberCardPayload(uid),
        'mortaralumni://card/v1/$uid',
      );
    });

    test('round-trips through the parser', () {
      expect(parseMemberCardPayload(buildMemberCardPayload(uid)), uid);
    });
  });

  group('parseMemberCardPayload accepts', () {
    test('a well-formed payload', () {
      expect(parseMemberCardPayload('mortaralumni://card/v1/$uid'), uid);
    });

    test('surrounding whitespace', () {
      expect(parseMemberCardPayload('  mortaralumni://card/v1/$uid \n'), uid);
    });

    test('an uppercased scheme and host', () {
      expect(parseMemberCardPayload('MORTARALUMNI://CARD/v1/$uid'), uid);
    });
  });

  group('parseMemberCardPayload rejects', () {
    test('null and empty input', () {
      expect(parseMemberCardPayload(null), isNull);
      expect(parseMemberCardPayload(''), isNull);
      expect(parseMemberCardPayload('   '), isNull);
    });

    test('a foreign URL', () {
      expect(parseMemberCardPayload('https://example.com/card/v1/$uid'), isNull);
    });

    test('a Wi-Fi QR', () {
      expect(parseMemberCardPayload('WIFI:S:MyNet;T:WPA;P:hunter2;;'), isNull);
    });

    test('plain text', () {
      expect(parseMemberCardPayload('just some text'), isNull);
    });

    test('the scheme from the design doc that was never registered', () {
      expect(parseMemberCardPayload('expansion://card/v1/$uid'), isNull);
    });

    test('a different host under our own scheme', () {
      expect(parseMemberCardPayload('mortaralumni://event/v1/$uid'), isNull);
    });

    test('an unknown payload version', () {
      expect(parseMemberCardPayload('mortaralumni://card/v2/$uid'), isNull);
    });

    test('a missing uid', () {
      expect(parseMemberCardPayload('mortaralumni://card/v1/'), isNull);
      expect(parseMemberCardPayload('mortaralumni://card/v1'), isNull);
    });

    test('extra path segments', () {
      expect(parseMemberCardPayload('mortaralumni://card/v1/$uid/extra'), isNull);
    });

    test('a uid with characters Firebase never issues', () {
      expect(parseMemberCardPayload('mortaralumni://card/v1/has space'), isNull);
      expect(parseMemberCardPayload('mortaralumni://card/v1/../../etc'), isNull);
    });

    test('a uid beyond the length bound', () {
      final tooLong = 'a' * 129;
      expect(parseMemberCardPayload('mortaralumni://card/v1/$tooLong'), isNull);
    });
  });
}
