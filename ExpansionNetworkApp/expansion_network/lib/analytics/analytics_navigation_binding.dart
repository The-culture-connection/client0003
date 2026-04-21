import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import 'analytics_service.dart';

/// Resolves stable [screen] (template path) and [route] (location) from [GoRouterState].
({String screen, String route}) analyticsRouteLabels(GoRouterState state) {
  final uri = state.uri;
  final path = uri.path.isEmpty ? '/' : uri.path;
  final query = uri.query;
  final route = query.isEmpty ? path : '$path?$query';

  final template = state.fullPath?.trim();
  final matched = state.matchedLocation.trim();
  final screen = (template != null && template.isNotEmpty)
      ? template
      : (matched.isNotEmpty ? matched : path);

  return (screen: screen.isEmpty ? 'unknown' : screen, route: route.isEmpty ? '/' : route);
}

/// One-shot flush (e.g. after binding) so the initial route emits session events
/// even if [RouteInformationProvider] already notified before the listener was added.
Future<void> syncAnalyticsNavigationOnce(GoRouter router, AnalyticsService analytics) {
  return _flushNavigation(router, analytics);
}

Future<void> _flushNavigation(GoRouter router, AnalyticsService analytics) async {
  final next = analyticsRouteLabels(router.state);
  final signature = '${next.screen}|${next.route}';
  if (!analytics.shouldEmitForNavigationSignature(signature)) {
    return;
  }

  if (analytics.hasActiveScreenSession) {
    await analytics.logScreenSessionEnded();
  }
  analytics.updateNavigationContext(screen: next.screen, route: next.route);
  await analytics.logScreenSessionStarted();
}

/// Attaches navigation analytics to [GoRouter] and returns a disposer.
///
/// Serializes work with an internal Future chain so rapid redirects do not drop events.
VoidCallback attachAnalyticsToGoRouter(GoRouter router, AnalyticsService analytics) {
  Future<void> tail = Future.value();

  void listener() {
    tail = tail.then((_) => _flushNavigation(router, analytics));
  }

  router.routeInformationProvider.addListener(listener);
  return () => router.routeInformationProvider.removeListener(listener);
}
