Firestore:
rules_version = '2';

/**
 * Testing rules: wide open read + write until 2026-12-31, EXCEPT signed-in users whose
 * `users/{uid}` has `content_suspended: true` or `account_banned: true` cannot write.
 *

 */
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function callerUserDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function callerUserExists() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    /** Mirrors app: `content_suspended` or legacy `under_investigation`. */
    function callerContentSuspended() {
      return callerUserExists()
        && (callerUserDoc().data.get('content_suspended', false) == true
          || callerUserDoc().data.get('under_investigation', false) == true);
    }

    function callerAccountBanned() {
      return callerUserExists()
        && callerUserDoc().data.get('account_banned', false) == true;
    }

    function callerBlockedFromWrites() {
      return callerContentSuspended() || callerAccountBanned();
    }

    function devWindowOpen() {
      return request.time < timestamp.date(2026, 12, 31);
    }

    match /{document=**} {
      allow read: if devWindowOpen();
      allow write: if devWindowOpen()
        && (!isSignedIn() || !callerBlockedFromWrites());
    }
  }
}

Storage:
service firebase.storage {
  match /b/{bucket}/o {

    // --- Default for testing with Auth (emulator or real project): signed-in = full access ---
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }

    // --- Optional: completely open bucket (emulator only, never deploy to prod) ---
    // match /{allPaths=**} {
    //   allow read, write: if true;
    // }
  }
}


analytics_events	
user_id
timestamp
__name__
Collection	CICAgOjXh4EK		Enabled	
analytics_events	
event_type
timestamp
__name__
Collection	CICAgJiUpoMK		Enabled	
analytics_events	
user_id
created_at
__name__
Collection	CICAgNirtJAK		Enabled	
analytics_raw_events	
user_id
created_at
__name__
Collection	CICAgOi39IkK		Enabled	
courses	
assignedRoles
status
createdAt
__name__
Collection	CICAgJim14AK		Enabled	
courses	
assignedUserIds
status
createdAt
__name__
Collection	CICAgJjF9oIK		Enabled	
dm_threads	
participant_ids
updated_at
__name__
Collection	CICAgJj7z4EK		Enabled	
events	
event_date
created_at
__name__
Collection	CICAgNjpgYIK		Enabled	
Groups	
isFeatured
featuredRank
__name__
Collection	CICAgJiH2JAK		Enabled	
items	
is_active
name
__name__
Collection	CICAgNi47oMK		Enabled	
jobs	
industry_id
status
created_at
__name__
Collection	CICAgNjp5ZMK		Enabled	
match_profiles	
visibility.discovery
updated_at
__name__
Collection	CICAgNiroIEK		Enabled	
meeting_proposals	
status
created_at
__name__
Collection	CICAgOi3kJAK		Enabled	
mortar_info_posts	
published
created_at
__name__
Collection	CICAgLjy8IAK		Enabled	
quiz_attempts	
user_id
quiz_id
created_at
__name__
Collection	CICAgNiav4AK		Enabled	
skill_ads	
offered_skills
status
__name__
Collection	CICAgLiIkYMK		Enabled	
users	
onboarding_status
updated_at
__name__
Collection	CICAgJjmiJEK		Enabled