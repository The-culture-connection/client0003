import 'dart:async';

import 'package:flutter/widgets.dart';

import '../models/conference.dart';
import '../services/conference_repository.dart';

/// Data exposed by [ConferenceScope] to descendant conference screens.
class ConferenceScopeData {
  const ConferenceScopeData({required this.conferenceId, required this.conference});

  final String conferenceId;

  /// Null until the first snapshot arrives (or if the doc doesn't exist).
  final Conference? conference;
}

/// Provides the current [conferenceId] + a live [Conference] stream to every
/// screen nested under a `/conference/:conferenceId` route, so screens don't
/// each re-parse route params or open their own Firestore listener.
class ConferenceScope extends StatefulWidget {
  const ConferenceScope({
    required this.conferenceId,
    required this.child,
    super.key,
  });

  final String conferenceId;
  final Widget child;

  static ConferenceScopeData of(BuildContext context) {
    final inherited =
        context.dependOnInheritedWidgetOfExactType<_ConferenceInherited>();
    assert(inherited != null, 'No ConferenceScope found in context');
    return inherited!.data;
  }

  @override
  State<ConferenceScope> createState() => _ConferenceScopeState();
}

class _ConferenceScopeState extends State<ConferenceScope> {
  final ConferenceRepository _repository = ConferenceRepository();
  StreamSubscription<Conference?>? _subscription;
  Conference? _conference;

  @override
  void initState() {
    super.initState();
    _listen();
  }

  @override
  void didUpdateWidget(covariant ConferenceScope oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.conferenceId != widget.conferenceId) {
      _conference = null;
      _listen();
    }
  }

  void _listen() {
    _subscription?.cancel();
    _subscription = _repository.watchConference(widget.conferenceId).listen((c) {
      if (mounted) setState(() => _conference = c);
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _ConferenceInherited(
      data: ConferenceScopeData(
        conferenceId: widget.conferenceId,
        conference: _conference,
      ),
      child: widget.child,
    );
  }
}

class _ConferenceInherited extends InheritedWidget {
  const _ConferenceInherited({required this.data, required super.child});

  final ConferenceScopeData data;

  @override
  bool updateShouldNotify(_ConferenceInherited oldWidget) =>
      oldWidget.data.conference != data.conference ||
      oldWidget.data.conferenceId != data.conferenceId;
}
