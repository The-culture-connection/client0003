/// Result row for Explore → Network Search (`users/{uid}`).
class NetworkMemberHit {
  const NetworkMemberHit({
    required this.uid,
    required this.displayName,
    this.profession,
    this.locationLine,
  });

  final String uid;
  final String displayName;
  final String? profession;
  final String? locationLine;
}
