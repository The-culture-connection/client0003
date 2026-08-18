import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// The external beta tester checklist for the MORTARverse round.
///
/// Nothing here is tickable by hand. Each step reads the trace the tester's own
/// actions already left in Firestore, so a step crosses itself off the moment
/// the work is genuinely done — the same contract as the Digital Curriculum
/// rail on the web.
///
/// Every read below is a single-field query the member is already allowed to
/// make under `firestore.rules`, so none of this needs a rules change or a
/// composite index.
class BetaStep {
  const BetaStep({
    required this.id,
    required this.title,
    required this.detail,
    this.note,
    this.optional = false,
  });

  final String id;

  /// Short label for the collapsed banner.
  final String title;

  final List<String> detail;

  /// Extra warning or expectation, shown under the detail when expanded.
  final String? note;

  /// Optional steps never block "all done" and are counted separately.
  final bool optional;
}

const List<BetaStep> kBetaSteps = [
  BetaStep(
    id: 'profile',
    title: 'Sweep the screen and finish your profile',
    detail: [
      'Swipe the whole top carousel and check each screen opens.',
      'Open Complete Profile, fill in your bio properly, and save.',
      'Check your badge shows under your profile, then open Badges.',
    ],
    note: 'Crosses off once your profile reaches 100%.',
  ),
  BetaStep(
    id: 'event',
    title: 'Register for the test event',
    detail: [
      'Scroll to the lowest widget and tap Register.',
      'Check the calendar pops up and the details look right.',
      'Look at the RSVP list and try messaging someone on it.',
    ],
  ),
  BetaStep(
    id: 'matching',
    title: 'Run smart matching',
    detail: [
      'Enter the Networking Hall and tap Run Smart Matching, then Start Matching.',
      'Message one of your matches and open their profile.',
      'Check Mortar Shop opens, and that the Mortar Info video plays with sound.',
    ],
  ),
  BetaStep(
    id: 'explore',
    title: 'Post a job and a skill',
    detail: [
      'Open Explore and check the All, Jobs and Skills tabs each fill up.',
      'Search for someone, open their profile, and message them.',
      'Tap Add to post a job, then again to post a skill.',
    ],
    note: 'Needs both a job and a skill before it crosses off.',
  ),
  BetaStep(
    id: 'feed',
    title: 'Post to the home feed',
    detail: [
      'Open Recent Activity and tap View All.',
      'Like a few posts and reply to one.',
      'Tap Add, write a post, attach an image, and publish.',
    ],
  ),
  BetaStep(
    id: 'community',
    title: 'Join a community and start one',
    detail: [
      'Under Your Communities, tap Groups and join any group.',
      'Publish a message, then comment on your own message.',
      'Tap Add and create a community of your own.',
      'In Events, register for one and check the Registered tab.',
    ],
    note: 'Needs both joining and creating before it crosses off.',
  ),
  BetaStep(
    id: 'conference',
    title: 'Buy a Conference Center ticket',
    detail: [
      'Go to the Conference Center and buy a ticket to Our North Star.',
      'Watch for the confirmation email with your access code.',
    ],
    note: 'Real money — your card is charged. Skip it if you would rather not; '
        'nothing else depends on it.',
    optional: true,
  ),
];

/// Which steps are done, and the counts the banner shows.
class BetaChecklistState {
  const BetaChecklistState(this.done);

  const BetaChecklistState.empty() : done = const {};

  final Map<String, bool> done;

  bool isDone(String id) => done[id] ?? false;

  static Iterable<BetaStep> get _required =>
      kBetaSteps.where((s) => !s.optional);

  int get totalRequired => _required.length;

  int get completedRequired =>
      _required.where((s) => isDone(s.id)).length;

  bool get allRequiredDone => completedRequired == totalRequired;

  double get progress =>
      totalRequired == 0 ? 0 : completedRequired / totalRequired;
}

/// Reads every completion signal for the signed-in tester.
class BetaChecklistService {
  BetaChecklistService({FirebaseFirestore? firestore, FirebaseAuth? auth})
      : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  /// True when at least one document matches. A denied or offline read resolves
  /// to false rather than throwing, so one unavailable signal cannot blank the
  /// whole checklist.
  Future<bool> _any(Query<Map<String, dynamic>> query) async {
    try {
      final snap = await query.limit(1).get();
      return snap.docs.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  /// [profileComplete] comes from `MortarverseSignals`, which the chooser
  /// already streams — no point reading the profile twice.
  ///
  /// [openConferenceId] is the conference currently open, if any. With no
  /// conference open there is no ticket to buy, so that step stays unticked.
  Future<BetaChecklistState> load({
    required bool profileComplete,
    String? openConferenceId,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) return const BetaChecklistState.empty();

    final results = await Future.wait([
      _any(_db.collection('events_mobile').where(
            'registered_users',
            arrayContains: uid,
          )),
      _any(_db.collection('users').doc(uid).collection('expansion_matches')),
      _any(_db.collection('expansion_jobs').where('author_id', isEqualTo: uid)),
      _any(_db.collection('expansion_skills').where('author_id', isEqualTo: uid)),
      _any(_db.collection('feed_posts').where('author_id', isEqualTo: uid)),
      _any(_db.collection('groups_mobile').where(
            'GroupMembers',
            arrayContains: uid,
          )),
      _any(_db.collection('groups_mobile').where('createdBy', isEqualTo: uid)),
      _hasConferenceTicket(uid, openConferenceId),
    ]);

    final registeredForEvent = results[0];
    final hasMatches = results[1];
    final postedJob = results[2];
    final postedSkill = results[3];
    final postedToFeed = results[4];
    final joinedGroup = results[5];
    final createdGroup = results[6];
    final hasTicket = results[7];

    return BetaChecklistState({
      'profile': profileComplete,
      'event': registeredForEvent,
      'matching': hasMatches,
      // The step asks for both, so both are required before it crosses off.
      'explore': postedJob && postedSkill,
      'feed': postedToFeed,
      'community': joinedGroup && createdGroup,
      'conference': hasTicket,
    });
  }

  Future<bool> _hasConferenceTicket(String uid, String? conferenceId) async {
    if (conferenceId == null) return false;
    try {
      final snap = await _db
          .collection('conferences')
          .doc(conferenceId)
          .collection('attendees')
          .doc(uid)
          .get();
      return snap.exists;
    } catch (e) {
      return false;
    }
  }
}
