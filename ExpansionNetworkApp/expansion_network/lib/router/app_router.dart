import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../screens/admin_events_screen.dart';
import '../screens/auth_claim_screen.dart';
import '../screens/auth_sign_in_screen.dart';
import '../screens/chat_room_screen.dart';
import '../screens/direct_chat_screen.dart';
import '../screens/create_post_screen.dart';
import '../screens/event_create_screen.dart';
import '../screens/explore_skills_screen.dart';
import '../screens/job_create_screen.dart';
import '../screens/skill_create_screen.dart';
import '../screens/event_detail_screen.dart';
import '../screens/events_screen.dart';
import '../screens/explore_screen.dart';
import '../screens/feed_screen.dart';
import '../screens/post_detail_screen.dart';
import '../screens/group_create_screen.dart';
import '../screens/group_detail_screen.dart';
import '../screens/group_edit_screen.dart';
import '../screens/groups_screen.dart';
import '../screens/home_screen.dart';
import '../screens/landing_screen.dart';
import '../screens/session_gate_screen.dart';
import '../screens/welcome_mortarverse_intro_screen.dart';
import '../screens/matching_screen.dart';
import '../screens/messages_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/achievements_screen.dart';
import '../screens/profile_edit_screen.dart';
import '../screens/profile_screen.dart';
import '../widgets/expansion_shell.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');

/// Auth + main app routes. [initialLocation] is `/session` so the marketing landing does not flash before session resolves.
GoRouter createAppRouter(AuthController auth) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/session',
    refreshListenable: auth,
    redirect: (context, state) {
      final loc = state.matchedLocation;

      if (auth.loading) {
        if (loc == '/session' || loc.startsWith('/auth') || loc == '/welcome-intro') return null;
        return '/session';
      }

      if (loc == '/session') {
        final loggedIn = auth.user != null;
        if (!loggedIn) return '/';
        if (auth.needsExpansionOnboarding == true) return '/onboarding';
        return '/home';
      }

      final loggedIn = auth.user != null;
      final publicAuth = loc == '/' || loc.startsWith('/auth');

      if (!loggedIn && !publicAuth && !loc.startsWith('/onboarding')) {
        // [AuthController] can lag one frame behind Firebase right after sign-in; without this,
        // `/welcome-intro` was redirected to `/` and the post-login animation never showed.
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
        return '/home';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/session',
        builder: (context, state) => const SessionGateScreen(),
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
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: ExploreScreen()),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                pageBuilder: (context, state) => const NoTransitionPage<void>(child: ProfileScreen()),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/matching',
        builder: (context, state) => const MatchingScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/messages',
        builder: (context, state) => const MessagesScreen(),
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
        path: '/profile/edit',
        builder: (context, state) => const ProfileEditScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: '/profile/achievements',
        builder: (context, state) => const AchievementsScreen(),
      ),
    ],
  );
}
