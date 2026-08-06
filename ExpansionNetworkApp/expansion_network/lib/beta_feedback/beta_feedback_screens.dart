/// Human-readable names for the router's screen templates.
///
/// Beta reports are triaged by someone reading a list, not by someone reading
/// `go_router` paths, so every report carries a label as well as the raw
/// template. Keep this in sync with [createAppRouter]; an unmapped template
/// falls back to a prettified version of the path rather than going blank.
library;

const Map<String, String> kBetaFeedbackScreenLabels = <String, String>{
  // Session / auth
  '/session': 'Session gate',
  '/': 'Landing',
  '/auth/sign-in': 'Sign in',
  '/auth/sign-up': 'Sign up',
  '/auth/claim': 'Claim account',
  '/expansion/enter-code': 'Enter invite code',
  '/onboarding': 'Onboarding',
  '/welcome-intro': 'Mortarverse welcome intro',
  '/mortarverse': 'Mortarverse chooser',

  // Expansion — main shell
  '/home': 'Home',
  '/feed': 'Community feed',
  '/groups': 'Groups',
  '/explore': 'Explore',
  '/posts': 'Social feed',
  '/matching': 'Matching',

  // Commons shell
  '/commons/profile': 'Commons · Profile',
  '/commons/messages': 'Commons · Messages',
  '/commons/badges': 'Commons · Achievements',

  // Messaging
  '/messages/:id': 'Group chat room',
  '/messages/direct/:userId': 'Direct chat',

  // Member card
  '/card': 'Member card',

  // Explore
  '/explore/jobs/create': 'Explore · Post a job',
  '/explore/skills': 'Explore · Skills',
  '/explore/skills/create': 'Explore · Offer a skill',

  // Groups
  '/groups/create': 'Create group',
  '/groups/:groupId': 'Group detail',
  '/groups/:groupId/edit': 'Edit group',

  // Events
  '/events': 'Events',
  '/events/create': 'Create event',
  '/events/:eventId': 'Event detail',

  // Feed / MORTAR Info
  '/feed/post/create': 'Create post',
  '/feed/post/:postId': 'Post detail',
  '/mortar-feed': 'MORTAR Info feed',
  '/mortar-info/:postId': 'MORTAR Info post',

  // Profile
  '/profile/edit': 'Edit profile',
  '/profile/achievements': 'Achievements',

  // In-app admin
  '/admin/events': 'Admin · Events',
  '/admin/reports': 'Admin · Reports',

  // Conference
  '/conference/gate': 'Conference · Entry gate',
  '/conference/lobby': 'Conference · Lobby',
  '/conference/map': 'Conference · Venue map',
  '/conference/schedule': 'Conference · Schedule',
  '/conference/schedule/:sessionId': 'Conference · Session detail',
  '/conference/session/:sessionId/chat': 'Conference · Session chat',
  '/conference/community': 'Conference · Community feed',
  '/conference/community/compose': 'Conference · New community post',
  '/conference/community/:postId': 'Conference · Community post',
  '/conference/sponsors': 'Conference · Sponsors',
  '/conference/sponsor-hall': 'Conference · Sponsor hall',
  '/conference/sponsor/:sponsorId': 'Conference · Sponsor detail',
  '/conference/network': 'Conference · Networking',
  '/conference/booth/scan': 'Conference · Booth scan',
};

/// Friendly name for a router template such as `/conference/schedule/:sessionId`.
///
/// Falls back to title-casing the path segments so a route added after this map
/// was last updated still reads as something ("/foo/bar-baz" → "Foo · Bar baz").
String betaFeedbackScreenLabel(String screenTemplate) {
  final template = screenTemplate.trim();
  if (template.isEmpty || template == 'unknown') return 'Unknown screen';

  final mapped = kBetaFeedbackScreenLabels[template];
  if (mapped != null) return mapped;

  final segments = template
      .split('/')
      .where((s) => s.isNotEmpty && !s.startsWith(':'))
      .map((s) {
        final words = s.replaceAll('-', ' ').replaceAll('_', ' ');
        return words.isEmpty ? words : '${words[0].toUpperCase()}${words.substring(1)}';
      })
      .toList();

  return segments.isEmpty ? template : segments.join(' · ');
}
