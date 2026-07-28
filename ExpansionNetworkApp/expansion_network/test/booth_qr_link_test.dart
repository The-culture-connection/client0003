import 'package:expansion_network/services/booth_qr_link.dart';
import 'package:expansion_network/services/member_card_link.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const sponsorId = 'sponsor_ABC-123';

  group('buildBoothPayload', () {
    test('produces the versioned, namespaced URI', () {
      expect(buildBoothPayload(sponsorId), 'mortaralumni://booth/v1/$sponsorId');
    });

    test('round-trips through the parser', () {
      expect(parseBoothPayload(buildBoothPayload(sponsorId)), sponsorId);
    });
  });

  group('parseBoothPayload accepts', () {
    test('a well-formed payload', () {
      expect(parseBoothPayload('mortaralumni://booth/v1/$sponsorId'), sponsorId);
    });

    test('surrounding whitespace', () {
      expect(parseBoothPayload('  mortaralumni://booth/v1/$sponsorId \n'), sponsorId);
    });

    test('an uppercased scheme and host', () {
      expect(parseBoothPayload('MORTARALUMNI://BOOTH/v1/$sponsorId'), sponsorId);
    });
  });

  group('parseBoothPayload rejects', () {
    test('null and empty input', () {
      expect(parseBoothPayload(null), isNull);
      expect(parseBoothPayload(''), isNull);
      expect(parseBoothPayload('   '), isNull);
    });

    test('a member card — same scheme, different host', () {
      final card = buildMemberCardPayload('someUid123');
      expect(parseBoothPayload(card), isNull);
    });

    test('a foreign URL', () {
      expect(parseBoothPayload('https://example.com/booth/v1/$sponsorId'), isNull);
    });

    test('a Wi-Fi QR', () {
      expect(parseBoothPayload('WIFI:S:MyNet;T:WPA;P:hunter2;;'), isNull);
    });

    test('an unknown payload version', () {
      expect(parseBoothPayload('mortaralumni://booth/v2/$sponsorId'), isNull);
    });

    test('a missing sponsor id', () {
      expect(parseBoothPayload('mortaralumni://booth/v1/'), isNull);
      expect(parseBoothPayload('mortaralumni://booth/v1'), isNull);
    });

    test('extra path segments', () {
      expect(parseBoothPayload('mortaralumni://booth/v1/$sponsorId/extra'), isNull);
    });

    test('a sponsor id with illegal characters', () {
      expect(parseBoothPayload('mortaralumni://booth/v1/has space'), isNull);
      expect(parseBoothPayload('mortaralumni://booth/v1/../../etc'), isNull);
    });

    test('an over-length sponsor id', () {
      expect(parseBoothPayload('mortaralumni://booth/v1/${'a' * 129}'), isNull);
    });
  });

  group('the two payload types never cross-parse', () {
    test('a booth code is not a member card', () {
      expect(parseMemberCardPayload(buildBoothPayload(sponsorId)), isNull);
    });

    test('a member card is not a booth code', () {
      expect(parseBoothPayload(buildMemberCardPayload('uid_123')), isNull);
    });
  });
}
