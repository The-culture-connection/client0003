import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../commons/widgets/commons_shell.dart';
import '../conference/screens/conference_booth_scan_screen.dart';
import '../conference/screens/conference_community_compose_screen.dart';
import '../conference/screens/conference_community_post_screen.dart';
import '../conference/screens/conference_community_screen.dart';
import '../conference/screens/conference_gate_screen.dart';
import '../conference/screens/conference_lobby_screen.dart';
import '../conference/screens/conference_map_screen.dart';
import '../conference/screens/conference_schedule_screen.dart';
import '../conference/screens/conference_session_chat_screen.dart';
import '../conference/screens/conference_session_detail_screen.dart';
import '../conference/screens/conference_sponsor_detail_screen.dart';
import '../conference/screens/conference_sponsors_screen.dart';
import '../conference/screens/conference_networking_screen.dart';
import '../conference/current_conference_holder.dart';
import '../conference/theme/conference_buttons.dart';
import '../conference/widgets/conference_shell.dart';
import '../mortarverse/screens/mortarverse_chooser_screen.dart';
import '../screens/admin_events_screen.dart';
import '../screens/admin_reports_screen.dart';
import '../screens/auth_claim_screen.dart';
import '../screens/auth_sign_in_screen.dart';
import '../screens/auth_sign_up_screen.dart';
import '../screens/expansion_enter_code_screen.dart';
import '../screens/chat_room_screen.dart';
import '../screens/direct_chat_screen.dart';
import '../screens/create_post_screen.dart';
import '../screens/delete_account_screen.dart';
import '../screens/event_create_screen.dart';
import '../screens/explore_skills_screen.dart';
import '../screens/job_create_screen.dart';
import '../screens/skill_create_screen.dart';
import '../screens/event_detail_screen.dart';
import '../screens/events_screen.dart';
import '../screens/explore_screen.dart';
import '../screens/feed_screen.dart';
import '../screens/post_detail_screen.dart';
import '../screens/social_feed_screen.dart';
import '../screens/group_create_screen.dart';
import '../screens/group_detail_screen.dart';
import '../screens/group_edit_screen.dart';
import '../screens/groups_screen.dart';
import '../screens/home_screen.dart';
import '../screens/landing_screen.dart';
import '../screens/session_gate_screen.dart';
import '../screens/welcome_mortarverse_intro_screen.dart';
import '../screens/mortar_feed_screen.dart';
import '../screens/mortar_info_detail_screen.dart';
import '../screens/matches_screen.dart';
import '../screens/matching_screen.dart';
import '../screens/member_card_screen.dart';
import '../screens/messages_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/achievements_screen.dart';
import '../screens/profile_edit_screen.dart';
import '../screens/profile_screen.dart';
import '../widgets/expansion_shell.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

/// For global overlays (e.g. content suspension dialog) that use the root navigator.
GlobalKey<NavigatorState> get expansionRootNavigatorKey => _rootNavigatorKey;

/// Auth + main app routes. [initialLocation] is `/session` so the marketing landing does not flash before session resolves.
GoRouter createAppRouter(AuthController auth) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/session',
    // The holder is a refresh source as well as auth: when a conference closes
    // or its window lapses mid-session it notifies, the redirect below re-runs,
    // and anyone sitting inside is ejected to the gate.
    refreshListenable: Listenable.merge([auth, CurrentConferenceHolder.instance]),
    redirect: (context, state) {
      final loc = state.matchedLocation;

      // ---- Conference entry gate -------------------------------------
      // The single choke point for getting *inside* a conference. Every
      // `/conference/*` destination except the gate itself requires an
      // admitted, currently-open conference — a redeemed ticket alone is not
      // enough, because a conference that has closed or run past its
      // `activeUntil` must stop admitting even people who already hold codes.
      //
      // It fails closed: `isOpenForEntry` is false until a conference doc has
      // been read and checked, so a cold deep link into `/conference/lobby`
      // bounces to the gate, which resolves it properly and forwards on.
      // The gate is exempt, so this cannot loop.
      if (loc.startsWith('/conference/') && loc != '/conference/gate') {
        if (!CurrentConferenceHolder.instance.isOpenForEntry) {
          return '/conference/gate';
        }
      }

      /// Where a signed-in, onboarded user belongs: through the Mortarverse
      /// welcome animation once after an actual sign-in, otherwise straight to
      /// the chooser.
      ///
      /// Both exits from auth must agree. A sign-in resolves while the user is
      /// still on `/auth/*`, so `refreshListenable` can redirect from there
      /// before the screen's own `go('/session')` runs — if only the `/session`
      /// branch checked the flag, the intro would be skipped in that race.
      String postAuthDestination() =>
          auth.welcomeIntroPending ? '/welcome-intro' : '/mortarverse';

      if (auth.loading) {
        if (loc == '/session' || loc.startsWith('/auth') || loc == '/welcome-intro') return null;
        return '/session';
      }

      if (loc == '/session') {
        final loggedIn = auth.user != null;
        if (!loggedIn) return '/';
        // Onboarding (the shared profile questionnaire) applies to every
        // signed-in account, regardless of Expansion access — see
        // AuthController._applySessionForUser's NO_EXPANSION_ACCESS branch.
        if (auth.needsExpansionOnboarding == true) return '/onboarding';
        // A restored session lands here on every cold start, so the intro is
        // gated on the flag rather than played unconditionally. (New profiles
        // reach it from the last onboarding step instead.) The intro screen
        // clears the flag itself, so this may run twice without losing it.
        return postAuthDestination();
      }

      final loggedIn = auth.user != null;
      final publicAuth = loc == '/' || loc.startsWith('/auth');

      if (!loggedIn && !publicAuth && !loc.startsWith('/onboarding')) {
        if (loc == '/welcome-intro' && FirebaseAuth.instance.currentUser != null) {
          return null;
        }
        return '/';
      }
      if (!loggedIn && loc.startsWith('/onboarding')) {
        return '/auth/sign-in';
      }

      final needsOnboarding = auth.needsExpansionOnboarding == true;
      final doneOnboarding = auth.needsExpansionOnboarding == false;

      if (loggedIn && needsOnboarding && !loc.startsWith('/onboarding') && loc != '/welcome-intro') {
        return '/onboarding';
      }
      if (loggedIn && doneOnboarding && publicAuth) {
        return postAuthDestination();
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/session',
        builder: (context, state) => const SessionGateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/mortarverse',
        builder: (context, state) => const MortarverseChooserScreen(),
      ),
      // Every `/conference/*` screen is wrapped in [ConferenceTheme] so the
      // gold sub-brand keeps its accent instead of inheriting the app-wide
      // Expansion red. Wrapping here rather than inside each screen means a
      // new conference route picks it up for free.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/gate',
        // `?switch=1` — arrived by leaving a conference, so show the list
        // instead of forwarding straight back into the one they just left.
        builder: (context, state) => ConferenceTheme(
          child: ConferenceGateScreen(
            switchMode: state.uri.queryParameters['switch'] == '1',
          ),
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/map',
        builder: (context, state) => ConferenceTheme(
          child: ConferenceMapScreen(
            initialFloorId: state.uri.queryParameters['floor'],
            highlightRoomId: state.uri.queryParameters['room'],
          ),
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/schedule/:sessionId',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          return ConferenceTheme(
            child: ConferenceSessionDetailScreen(sessionId: sessionId),
          );
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/session/:sessionId/chat',
        builder: (context, state) {
          final sessionId = state.pathParameters['sessionId']!;
          return ConferenceTheme(
            child: ConferenceSessionChatScreen(sessionId: sessionId),
          );
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/community',
        builder: (context, state) =>
            const ConferenceTheme(child: ConferenceCommunityScreen()),
      ),
      // Declared before `/conference/community/:postId` so "compose" is not
      // swallowed as a post id.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/community/compose',
        builder: (context, state) =>
            const ConferenceTheme(child: ConferenceCommunityComposeScreen()),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/community/:postId',
        builder: (context, state) => ConferenceTheme(
          child: ConferenceCommunityPostScreen(
            postId: state.pathParameters['postId']!,
          ),
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/sponsors',
        builder: (context, state) =>
            const ConferenceTheme(child: ConferenceSponsorsScreen()),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/network',
        builder: (context, state) =>
            const ConferenceTheme(child: ConferenceNetworkingScreen()),
      ),
      // Declared before `/conference/sponsor/:sponsorId` so "scan" is not
      // swallowed as a sponsor id.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/booth/scan',
        builder: (context, state) =>
            const ConferenceTheme(child: ConferenceBoothScanScreen()),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/conference/sponsor/:sponsorId',
        builder: (context, state) => ConferenceTheme(
          child: ConferenceSponsorDetailScreen(
            sponsorId: state.pathParameters['sponsorId']!,
          ),
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ConferenceTheme(
            child: ConferenceShell(navigationShell: navigationShell),
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/conference/lobby',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: ConferenceLobbyScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/conference/sponsor-hall',
                pageBuilder: (context, state) =>
                    const NoTransitionPage<void>(child: ConferenceSponsorsScreen(showBack: false)),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/conference/schedule',
                pageBuilder: (context, state) => NoTransitionPage<void>(child: ConferenceScheduleScreen()),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/welcome-intro',
        builder: (context, state) => const WelcomeMortarverseIntroScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: '/auth/sign-in',
        builder: (context, state) => const AuthSignInScreen(),
      ),
      GoRoute(
        path: '/auth/claim',
        builder: (context, state) => const AuthClaimScreen(),
      ),
      GoRoute(
        path: '/auth/sign-up',
        builder: (context, state) => const AuthSignUpScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/expansion/enter-code',
        builder: (context, state) => const ExpansionEnterCodeScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ExpansionShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: HomeScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/feed',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: FeedScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/groups',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: GroupsScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                pageBuilder: (context, state) => NoTransitionPage<void>(
                  key: ValueKey<String>('explore-${state.uri}'),
                  child: const ExploreScreen(),
                ),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/posts',
        builder: (context, state) => const SocialFeedScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/matching',
        builder: (context, state) => const MatchingScreen(),
      ),
      // Conference networking matches (mutual likes) — reachable from the
      // Messages header and the Networking Zone, so it lives on the root
      // navigator outside both shells.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/matches',
        builder: (context, state) => const MatchesScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return CommonsShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/commons/profile',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: ProfileScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/commons/messages',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: MessagesScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/commons/badges',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: AchievementsScreen()),
              ),
            ],
          ),
        ],
      ),
      // Push notifications deep-link to bare `/messages` (and `/admin` below)
      // — without these aliases those taps landed on the router's error page
      // with no way back. Redirect-only routes: they never build a page.
      GoRoute(
        path: '/messages',
        redirect: (context, state) => '/commons/messages',
      ),
      GoRoute(
        path: '/admin',
        redirect: (context, state) => '/admin/events',
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/messages/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return ChatRoomScreen(messageId: id);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/messages/direct/:userId',
        builder: (context, state) {
          final userId = state.pathParameters['userId']!;
          final attach = state.uri.queryParameters['attach'];
          final attachId = state.uri.queryParameters['id'];
          return DirectChatScreen(
            userId: userId,
            initialAttachmentType: attach,
            initialAttachmentId: attachId,
          );
        },
      ),
      // Member card ("business card") — shared by the conference lobby FAB and
      // the Profile tab, so it lives outside both shells.
      // `?tab=scan` opens on the scanner; `?ctx=conference` uses the gold accent.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/card',
        builder: (context, state) => MemberCardScreen(
          initialTab: state.uri.queryParameters['tab'] == 'scan' ? 1 : 0,
          conferenceStyled: state.uri.queryParameters['ctx'] == 'conference',
        ),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/explore/jobs/create',
        builder: (context, state) => const JobCreateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/explore/skills',
        builder: (context, state) => const ExploreSkillsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/explore/skills/create',
        builder: (context, state) => const SkillCreateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/groups/create',
        builder: (context, state) => const GroupCreateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/groups/:groupId/edit',
        builder: (context, state) {
          final id = state.pathParameters['groupId']!;
          return GroupEditScreen(groupId: id);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/groups/:groupId',
        builder: (context, state) {
          final id = state.pathParameters['groupId']!;
          return GroupDetailScreen(groupId: id);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/events',
        builder: (context, state) => const EventsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/events/create',
        builder: (context, state) => const EventCreateScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/events/:eventId',
        builder: (context, state) {
          final id = state.pathParameters['eventId']!;
          return EventDetailScreen(eventId: id);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/mortar-feed',
        builder: (context, state) => const MortarFeedScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/mortar-info/:postId',
        builder: (context, state) {
          final id = state.pathParameters['postId']!;
          return MortarInfoDetailScreen(postId: id);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/feed/post/create',
        builder: (context, state) => const CreatePostScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/feed/post/:postId',
        pageBuilder: (context, state) {
          final id = state.pathParameters['postId']!;
          return MaterialPage<void>(
            key: ValueKey<String>(state.uri.toString()),
            child: PostDetailScreen(postId: id),
          );
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/admin/events',
        builder: (context, state) => const AdminEventsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/admin/reports',
        builder: (context, state) => const AdminReportsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/profile/edit',
        builder: (context, state) => const ProfileEditScreen(),
      ),
      // App Store Guideline 5.1.1(v) — account deletion must be reachable from
      // inside the app, not only from the website.
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/profile/delete-account',
        builder: (context, state) => const DeleteAccountScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/profile/achievements',
        builder: (context, state) => const AchievementsScreen(),
      ),
    ],
  );
}
