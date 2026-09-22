import 'package:expansion_network/mortarverse/mortarverse_popup.dart';
import 'package:flutter_test/flutter_test.dart';

/// Fixed clock so "expires in an hour" means the same thing on every run.
final DateTime now = DateTime.utc(2026, 9, 22, 12);

MortarversePopupCandidate candidate(
  MortarversePopupKind kind, {
  required String seenKey,
  DateTime? expiresAt,
  DateTime? sortAt,
}) =>
    MortarversePopupCandidate(
      kind: kind,
      seenKey: seenKey,
      eyebrow: 'EYEBROW',
      headline: 'Headline',
      body: 'Body',
      ctaLabel: 'Go',
      route: '/somewhere',
      expiresAt: expiresAt,
      sortAt: sortAt,
    );

void main() {
  group('selectMortarversePopup picks', () {
    test('nothing when there are no candidates', () {
      expect(
        selectMortarversePopup(candidates: [], seenKeys: {}, now: now),
        isNull,
      );
    });

    test('the only candidate when just one qualifies', () {
      final c = candidate(MortarversePopupKind.event, seenKey: 'event:a');
      expect(
        selectMortarversePopup(candidates: [c], seenKeys: {}, now: now)?.seenKey,
        'event:a',
      );
    });

    test('an announcement over an event and a message', () {
      // Priority is the product decision this encodes: a human flagged the
      // announcement, so it outranks the automatic ones.
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.message, seenKey: 'messages:x'),
          candidate(MortarversePopupKind.event, seenKey: 'event:a'),
          candidate(MortarversePopupKind.announcement, seenKey: 'announcement:p'),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked?.kind, MortarversePopupKind.announcement);
    });

    test('an event over a message', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.message, seenKey: 'messages:x'),
          candidate(MortarversePopupKind.event, seenKey: 'event:a'),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked?.kind, MortarversePopupKind.event);
    });

    test('the newest of two candidates of the same kind', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:old',
              sortAt: now.subtract(const Duration(days: 3))),
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:new',
              sortAt: now.subtract(const Duration(hours: 2))),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked?.seenKey, 'announcement:new');
    });

    test('a dated candidate over an undated one of the same kind', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement, seenKey: 'announcement:undated'),
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:dated', sortAt: now),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked?.seenKey, 'announcement:dated');
    });
  });

  group('selectMortarversePopup skips', () {
    test('anything already seen', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement, seenKey: 'announcement:p'),
          candidate(MortarversePopupKind.event, seenKey: 'event:a'),
        ],
        seenKeys: {'announcement:p'},
        now: now,
      );
      // Falls through to the next priority rather than showing nothing.
      expect(picked?.seenKey, 'event:a');
    });

    test('an expired candidate', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:p',
              expiresAt: now.subtract(const Duration(minutes: 1))),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked, isNull);
    });

    test('a candidate expiring exactly now', () {
      // Boundary: an expiry of "now" is over, not still running.
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:p', expiresAt: now),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked, isNull);
    });

    test('but keeps one expiring in a minute', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement,
              seenKey: 'announcement:p',
              expiresAt: now.add(const Duration(minutes: 1))),
        ],
        seenKeys: {},
        now: now,
      );
      expect(picked?.seenKey, 'announcement:p');
    });

    test('everything when all are seen or expired', () {
      final picked = selectMortarversePopup(
        candidates: [
          candidate(MortarversePopupKind.announcement, seenKey: 'announcement:p'),
          candidate(MortarversePopupKind.event,
              seenKey: 'event:a',
              expiresAt: now.subtract(const Duration(hours: 1))),
        ],
        seenKeys: {'announcement:p'},
        now: now,
      );
      expect(picked, isNull);
    });
  });

  group('mortarverseMessagesSeenKey', () {
    test('does not depend on the order ids arrive in', () {
      expect(
        mortarverseMessagesSeenKey(['b', 'a', 'c']),
        mortarverseMessagesSeenKey(['c', 'b', 'a']),
      );
    });

    test('changes when a new person starts waiting', () {
      // The behaviour that matters: a genuinely new conversation earns one
      // nudge even though an earlier one was dismissed.
      expect(
        mortarverseMessagesSeenKey(['a']) == mortarverseMessagesSeenKey(['a', 'b']),
        isFalse,
      );
    });

    test('stays the same as an ignored backlog gets noisier', () {
      // Same people, more messages — the key is over who, not how many.
      expect(
        mortarverseMessagesSeenKey(['a', 'b']),
        mortarverseMessagesSeenKey(['a', 'b']),
      );
    });

    test('stays bounded for a large inbox', () {
      final many = List.generate(40, (i) => 'uid${i.toString().padLeft(3, '0')}');
      final key = mortarverseMessagesSeenKey(many);
      expect(key.length, lessThan(200));
      expect(key, endsWith('+32'));
    });
  });

  group('pruneMortarversePopupSeen', () {
    test('drops entries past the retention window', () {
      final seen = {
        'old': now.subtract(const Duration(days: 91)),
        'fresh': now.subtract(const Duration(days: 1)),
      };
      final pruned = pruneMortarversePopupSeen(seen, now);
      expect(pruned.keys, ['fresh']);
    });

    test('keeps an entry right at the edge', () {
      final seen = {'edge': now.subtract(const Duration(days: 89))};
      expect(pruneMortarversePopupSeen(seen, now).keys, ['edge']);
    });

    test('does not modify the input', () {
      final seen = {'old': now.subtract(const Duration(days: 200))};
      pruneMortarversePopupSeen(seen, now);
      expect(seen.length, 1);
    });

    test('handles an empty map', () {
      expect(pruneMortarversePopupSeen({}, now), isEmpty);
    });
  });
}
