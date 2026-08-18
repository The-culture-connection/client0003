import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:expansion_network/beta/beta_checklist.dart';
import 'package:expansion_network/beta/beta_checklist_banner.dart';
import 'package:expansion_network/widgets/spotlight_tutorial.dart';

/// The beta checklist banner sits between the Mortarverse focus card and the
/// secondary chips. Two things have to hold: it reports progress without any
/// manual ticking, and it does not interfere with the spotlight tutorial that
/// already runs on that screen.

BetaChecklistState _state({
  bool profile = false,
  bool event = false,
  bool matching = false,
  bool explore = false,
  bool feed = false,
  bool community = false,
  bool conference = false,
}) {
  return BetaChecklistState({
    'profile': profile,
    'event': event,
    'matching': matching,
    'explore': explore,
    'feed': feed,
    'community': community,
    'conference': conference,
  });
}

Widget _host(Widget child) => MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );

void main() {
  group('BetaChecklistState', () {
    test('counts only required steps, so the optional one cannot block', () {
      final s = _state(
        profile: true,
        event: true,
        matching: true,
        explore: true,
        feed: true,
        community: true,
      );
      expect(s.totalRequired, 6);
      expect(s.completedRequired, 6);
      expect(s.allRequiredDone, isTrue);
      expect(s.isDone('conference'), isFalse);
      expect(s.progress, 1.0);
    });

    test('an unfinished required step keeps it incomplete', () {
      final s = _state(profile: true, event: true);
      expect(s.completedRequired, 2);
      expect(s.allRequiredDone, isFalse);
    });
  });

  group('BetaChecklistBanner', () {
    testWidgets('collapsed it shows progress but no step titles',
        (tester) async {
      await tester.pumpWidget(_host(BetaChecklistBanner(
        state: _state(profile: true, event: true),
        loading: false,
        onRefresh: () async {},
      )));

      expect(find.text('BETA CHECKLIST'), findsOneWidget);
      expect(find.text('2 of 6'), findsOneWidget);
      expect(find.text(kBetaSteps.first.title), findsNothing);
    });

    testWidgets('tapping expands to every step and marks done ones struck through',
        (tester) async {
      await tester.pumpWidget(_host(BetaChecklistBanner(
        state: _state(profile: true),
        loading: false,
        onRefresh: () async {},
      )));

      await tester.tap(find.text('BETA CHECKLIST'));
      await tester.pumpAndSettle();

      for (final step in kBetaSteps) {
        expect(find.text(step.title), findsOneWidget,
            reason: '${step.id} should be listed when expanded');
      }

      final doneTitle = tester.widget<Text>(find.text(kBetaSteps.first.title));
      expect(doneTitle.style?.decoration, TextDecoration.lineThrough);

      final notDone = tester.widget<Text>(find.text(kBetaSteps[1].title));
      expect(notDone.style?.decoration, TextDecoration.none);
    });

    testWidgets('tapping a step reveals its detail', (tester) async {
      await tester.pumpWidget(_host(BetaChecklistBanner(
        state: _state(),
        loading: false,
        onRefresh: () async {},
      )));

      await tester.tap(find.text('BETA CHECKLIST'));
      await tester.pumpAndSettle();

      final detail = '• ${kBetaSteps.first.detail.first}';
      expect(find.text(detail), findsNothing);

      await tester.tap(find.text(kBetaSteps.first.title));
      await tester.pumpAndSettle();
      expect(find.text(detail), findsOneWidget);
    });

    testWidgets('expanding asks for fresh state', (tester) async {
      var refreshes = 0;
      await tester.pumpWidget(_host(BetaChecklistBanner(
        state: _state(),
        loading: false,
        onRefresh: () async => refreshes++,
      )));

      await tester.tap(find.text('BETA CHECKLIST'));
      await tester.pumpAndSettle();
      expect(refreshes, 1);
    });

    testWidgets('forceCollapsed folds an open banner away for the tutorial',
        (tester) async {
      Widget build({required bool collapsed}) => _host(BetaChecklistBanner(
            state: _state(),
            loading: false,
            onRefresh: () async {},
            forceCollapsed: collapsed,
          ));

      await tester.pumpWidget(build(collapsed: false));
      await tester.tap(find.text('BETA CHECKLIST'));
      await tester.pumpAndSettle();
      expect(find.text(kBetaSteps.first.title), findsOneWidget);

      await tester.pumpWidget(build(collapsed: true));
      await tester.pumpAndSettle();
      expect(find.text(kBetaSteps.first.title), findsNothing,
          reason: 'an expanded list would cover the spotlight cut-out');
    });
  });

  group('Mortarverse spotlight tutorial with the banner inserted', () {
    // Mirrors the chooser's real order: focus card, then the banner as its own
    // sibling, then the chips, the street and a tile inside it.
    testWidgets('all five steps resolve their targets and reach the end',
        (tester) async {
      final focusCard = GlobalKey();
      final betaChecklist = GlobalKey();
      final street = GlobalKey();
      final networkingTile = GlobalKey();
      final cardScan = GlobalKey();
      var done = false;

      late BuildContext ctx;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Builder(builder: (c) {
            ctx = c;
            return ListView(
              children: [
                SizedBox(key: cardScan, height: 40),
                SizedBox(key: focusCard, height: 120),
                Padding(
                  key: betaChecklist,
                  padding: const EdgeInsets.all(8),
                  child: BetaChecklistBanner(
                    state: _state(profile: true),
                    loading: false,
                    onRefresh: () async {},
                  ),
                ),
                SizedBox(key: street, height: 160,
                    child: SizedBox(key: networkingTile, height: 80)),
                const SizedBox(height: 400),
              ],
            );
          }),
        ),
      ));

      SpotlightTutorial.show(
        ctx,
        onDone: () => done = true,
        steps: [
          SpotlightStep(
            targetKey: focusCard,
            title: 'What needs you',
            body: 'body',
          ),
          SpotlightStep(
            targetKey: betaChecklist,
            title: 'Your beta checklist',
            body: 'body',
          ),
          SpotlightStep(targetKey: street, title: 'Pick a destination', body: 'body'),
          SpotlightStep(
            targetKey: networkingTile,
            title: 'The Networking Hall',
            body: 'body',
          ),
          SpotlightStep(
            targetKey: cardScan,
            title: 'Your member card',
            body: 'body',
          ),
        ],
      );
      await tester.pumpAndSettle();

      // Every step in order, including the new one, then out the far side.
      for (final title in const [
        'What needs you',
        'Your beta checklist',
        'Pick a destination',
        'The Networking Hall',
        'Your member card',
      ]) {
        expect(find.text(title), findsOneWidget,
            reason: 'tutorial should reach "$title"');
        await tester.tap(find.text(find.text('Got it').evaluate().isNotEmpty
            ? 'Got it'
            : 'Next'));
        await tester.pumpAndSettle();
      }

      expect(done, isTrue, reason: 'tutorial should complete');
      expect(find.text('Your member card'), findsNothing);
    });
  });
}
