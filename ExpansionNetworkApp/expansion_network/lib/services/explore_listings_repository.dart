import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../data/curriculum_onboarding_data.dart';
import '../models/explore_job.dart';
import '../models/explore_skill_listing.dart';
import 'user_profile_repository.dart';

/// Firestore `expansion_jobs` and `expansion_skills` for the Explore tab.
class ExploreListingsRepository {
  ExploreListingsRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    UserProfileRepository? users,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _users = users ?? UserProfileRepository();

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;
  final UserProfileRepository _users;

  static final Set<String> _curriculumSkillLabels = kCurriculumSkillLabelsFlat.toSet();

  static const int maxSkillsPerListing = 30;

  static void _validateCurriculumSkillList(List<String> skills) {
    if (skills.isEmpty) {
      throw ArgumentError('Select at least one curriculum skill.');
    }
    if (skills.length > maxSkillsPerListing) {
      throw ArgumentError('At most $maxSkillsPerListing skills per listing.');
    }
    for (final s in skills) {
      if (!_curriculumSkillLabels.contains(s)) {
        throw ArgumentError('Skill is not in the curriculum list: $s');
      }
    }
  }

  CollectionReference<Map<String, dynamic>> get _jobs => _db.collection('expansion_jobs');
  CollectionReference<Map<String, dynamic>> get _skills => _db.collection('expansion_skills');

  Stream<List<ExploreJob>> watchJobs() {
    return _jobs.orderBy('created_at', descending: true).snapshots().map(
          (snap) => snap.docs
              .map((d) => ExploreJob.fromDoc(d.id, d.data()))
              .whereType<ExploreJob>()
              .toList(),
        );
  }

  Stream<List<ExploreSkillListing>> watchSkillListings() {
    return _skills.orderBy('created_at', descending: true).snapshots().map(
          (snap) => snap.docs
              .map((d) => ExploreSkillListing.fromDoc(d.id, d.data()))
              .whereType<ExploreSkillListing>()
              .toList(),
        );
  }

  Stream<List<ExploreJob>> watchJobsByAuthor(String authorId) {
    // Single-field equality only (no orderBy) so profile modal works without a composite index.
    return _jobs.where('author_id', isEqualTo: authorId).snapshots().map(
          (snap) {
            final list = snap.docs
                .map((d) => ExploreJob.fromDoc(d.id, d.data()))
                .whereType<ExploreJob>()
                .toList();
            list.sort((a, b) {
              final ca = a.createdAt;
              final cb = b.createdAt;
              if (ca == null && cb == null) return 0;
              if (ca == null) return 1;
              if (cb == null) return -1;
              return cb.compareTo(ca);
            });
            return list;
          },
        );
  }

  Stream<List<ExploreSkillListing>> watchSkillListingsByAuthor(String authorId) {
    return _skills.where('author_id', isEqualTo: authorId).snapshots().map(
          (snap) {
            final list = snap.docs
                .map((d) => ExploreSkillListing.fromDoc(d.id, d.data()))
                .whereType<ExploreSkillListing>()
                .toList();
            list.sort((a, b) {
              final ca = a.createdAt;
              final cb = b.createdAt;
              if (ca == null && cb == null) return 0;
              if (ca == null) return 1;
              if (cb == null) return -1;
              return cb.compareTo(ca);
            });
            return list;
          },
        );
  }

  Future<ExploreJob?> getJob(String id) async {
    final doc = await _jobs.doc(id).get();
    if (!doc.exists) return null;
    return ExploreJob.fromDoc(doc.id, doc.data()!);
  }

  Future<ExploreSkillListing?> getSkillListing(String id) async {
    final doc = await _skills.doc(id).get();
    if (!doc.exists) return null;
    return ExploreSkillListing.fromDoc(doc.id, doc.data()!);
  }

  Future<String> createJob({
    required String title,
    required List<String> skillsSeeking,
    String? company,
    required String location,
    required String locationMode,
    required String industry,
    String? description,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    _validateCurriculumSkillList(skillsSeeking);
    final name = await _users.getDisplayNameForUser(uid);
    final ref = _jobs.doc();
    await ref.set({
      'title': title,
      'skill_seeking': skillsSeeking,
      'industry': industry,
      'location_mode': locationMode,
      'location': location,
      if (company != null && company.isNotEmpty) 'company': company,
      if (description != null && description.isNotEmpty) 'description': description,
      'author_id': uid,
      'author_name': name,
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  Future<String> createSkillListing({
    required String title,
    required List<String> skillsOffering,
    String? summary,
    required String location,
    required String locationMode,
    required String industry,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    _validateCurriculumSkillList(skillsOffering);
    final name = await _users.getDisplayNameForUser(uid);
    final ref = _skills.doc();
    await ref.set({
      'title': title,
      'skill_offering': skillsOffering,
      'industry': industry,
      'location_mode': locationMode,
      'location': location,
      if (summary != null && summary.isNotEmpty) 'summary': summary,
      'author_id': uid,
      'author_name': name,
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }
}
