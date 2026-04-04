import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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
    return _jobs
        .where('author_id', isEqualTo: authorId)
        .orderBy('created_at', descending: true)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => ExploreJob.fromDoc(d.id, d.data()))
              .whereType<ExploreJob>()
              .toList(),
        );
  }

  Stream<List<ExploreSkillListing>> watchSkillListingsByAuthor(String authorId) {
    return _skills
        .where('author_id', isEqualTo: authorId)
        .orderBy('created_at', descending: true)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((d) => ExploreSkillListing.fromDoc(d.id, d.data()))
              .whereType<ExploreSkillListing>()
              .toList(),
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
    String? company,
    String? location,
    String? description,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final name = await _users.getDisplayNameForUser(uid);
    final ref = _jobs.doc();
    await ref.set({
      'title': title,
      if (company != null && company.isNotEmpty) 'company': company,
      if (location != null && location.isNotEmpty) 'location': location,
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
    String? summary,
  }) async {
    final uid = _auth.currentUser?.uid;
    if (uid == null) throw StateError('Not signed in');
    final name = await _users.getDisplayNameForUser(uid);
    final ref = _skills.doc();
    await ref.set({
      'title': title,
      if (summary != null && summary.isNotEmpty) 'summary': summary,
      'author_id': uid,
      'author_name': name,
      'created_at': FieldValue.serverTimestamp(),
      'updated_at': FieldValue.serverTimestamp(),
    });
    return ref.id;
  }
}
