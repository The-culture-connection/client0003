import 'package:expansion_network/constants/app_links.dart';
import 'package:expansion_network/services/deep_link_resolver.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // The host the app claims, derived the same way the resolver derives it, so
  // these tests keep passing if the Digital Curriculum origin is repointed.
  final claimedHost = Uri.parse(AppLinks.digitalCurriculum).host;

  group('resolveDeepLink accepts', () {
    test('an https ticket link on the claimed host', () {
      expect(
        resolveDeepLink('https://$claimedHost/tickets'),
        '/tickets',
      );
    });

    test('a ticket link naming a conference by query parameter', () {
      expect(
        resolveDeepLink('https://$claimedHost/tickets?c=summit26'),
        '/tickets?c=summit26',
      );
    });

    test('a ticket link naming a conference by path segment', () {
      expect(
        resolveDeepLink('https://$claimedHost/tickets/summit26'),
        '/tickets?c=summit26',
      );
    });

    test('the custom scheme, where the target sits in the host', () {
      expect(resolveDeepLink('mortaralumni://tickets'), '/tickets');
      expect(
        resolveDeepLink('mortaralumni://tickets?c=summit26'),
        '/tickets?c=summit26',
      );
    });

    test('a bare in-app path, which is how push payloads arrive', () {
      expect(
        resolveDeepLink('/messages/direct/abc123'),
        '/messages/direct/abc123',
      );
    });

    test('surrounding whitespace', () {
      expect(resolveDeepLink('  https://$claimedHost/tickets  '), '/tickets');
    });
  });

  group('resolveDeepLink rejects', () {
    test('a ticket path on a host we do not claim', () {
      // The guard that matters: without it, any site could hand the app a link
      // and steer it.
      expect(resolveDeepLink('https://evil.example.com/tickets'), isNull);
    });

    test('an unknown path on the claimed host', () {
      expect(resolveDeepLink('https://$claimedHost/admin'), isNull);
      expect(resolveDeepLink('https://$claimedHost/'), isNull);
    });

    test('an unknown target on the custom scheme', () {
      expect(resolveDeepLink('mortaralumni://admin'), isNull);
    });

    test('the member card payload, which only the in-app scanner consumes', () {
      expect(resolveDeepLink('mortaralumni://card/v1/someuid'), isNull);
    });

    test('a foreign scheme', () {
      expect(resolveDeepLink('ftp://$claimedHost/tickets'), isNull);
      expect(resolveDeepLink('javascript:alert(1)'), isNull);
    });

    test('empty and null input', () {
      expect(resolveDeepLink(null), isNull);
      expect(resolveDeepLink(''), isNull);
      expect(resolveDeepLink('   '), isNull);
    });

    test('a malformed conference id rather than passing it through', () {
      // Falls back to the untargeted flow instead of forwarding junk into a
      // route parameter.
      expect(
        resolveDeepLink('https://$claimedHost/tickets?c=../../etc/passwd'),
        '/tickets',
      );
      expect(
        resolveDeepLink('https://$claimedHost/tickets?c='),
        '/tickets',
      );
    });
  });

  group('ticketsShareUrl', () {
    test('builds the public link for a QR code', () {
      expect(ticketsShareUrl(), 'https://$claimedHost/tickets');
    });

    test('targets one conference when given an id', () {
      expect(
        ticketsShareUrl(conferenceId: 'summit26'),
        'https://$claimedHost/tickets?c=summit26',
      );
    });

    test('drops an id that could not be a conference', () {
      expect(ticketsShareUrl(conferenceId: '  '), 'https://$claimedHost/tickets');
      expect(
        ticketsShareUrl(conferenceId: 'not a valid id'),
        'https://$claimedHost/tickets',
      );
    });

    test('round-trips: a shared link resolves back to the same route', () {
      final url = ticketsShareUrl(conferenceId: 'summit26');
      expect(resolveDeepLink(url), '/tickets?c=summit26');
    });
  });
}
