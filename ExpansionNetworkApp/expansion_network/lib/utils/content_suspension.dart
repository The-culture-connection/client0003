/// When `true` on `users/{uid}`, the member must not create content (enforced in app + Firestore rules).
const String kUserFieldContentSuspended = 'content_suspended';

const String kContentSuspendedUserMessage =
    'Your account is under review. Posting, events, groups, and messaging are paused until the review is complete.';

bool isProfileContentSuspended(Map<String, dynamic>? data) {
  if (data == null) return false;
  if (data[kUserFieldContentSuspended] == true) return true;
  if (data['under_investigation'] == true) return true;
  return false;
}
