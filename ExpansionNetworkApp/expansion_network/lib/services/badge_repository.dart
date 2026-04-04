import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/badge_definition.dart';

class BadgeRepository {
  BadgeRepository({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  Stream<List<BadgeDefinition>> watchDefinitions() {
    return _db.collection('badge_definitions').snapshots().map(
          (snap) => snap.docs
              .map((d) => BadgeDefinition.fromDoc(d.id, d.data()))
              .whereType<BadgeDefinition>()
              .toList()
            ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder)),
        );
  }
}
