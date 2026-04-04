/**
 * Firebase Functions v2
 * Main entry point for all Cloud Functions
 *
 * All functions now use v2 API (Gen 2)
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {onUserCreated} from "./triggers/onUserCreated";
import {setUserRole} from "./callables/setUserRole";
import {logAnalyticsEvent} from "./callables/logAnalyticsEvent";
import {upsertBusinessProfile} from "./callables/upsertBusinessProfile";
import {trackLessonTime} from "./callables/trackLessonTime";
import {markLessonComplete} from "./callables/markLessonComplete";
import {submitQuizAttempt} from "./callables/submitQuizAttempt";
import {generateDocumentPDF} from "./callables/generateDocumentPDF";
import {finalizeAssetDocument} from "./callables/finalizeAssetDocument";
import {grantHiddenTrainingVideo} from "./callables/grantHiddenTrainingVideo";
import {proposeMeeting} from "./callables/proposeMeeting";
import {approveMeeting} from "./callables/approveMeeting";
import {adminAnalyticsReport} from "./callables/adminAnalyticsReport";
import {upsertMatchProfile} from "./callables/upsertMatchProfile";
import {setUserBusinessProfile} from "./callables/setUserBusinessProfile";
import {updateOnboardingStatus} from "./callables/updateOnboardingStatus";
import {completeOnboarding} from "./callables/completeOnboarding";
import {buildInitialMatches} from "./callables/buildInitialMatches";
import {onMatchProfileWrite} from "./triggers/onMatchProfileWrite";
import {scheduledNudgeIncompleteProfiles} from "./triggers/scheduledNudgeIncompleteProfiles";
import {getCourseFile} from "./callables/getCourseFile";
import {importPptxDeck} from "./callables/importPptxDeck";

// Set global options for all v2 functions only
// Note: v1 functions (like onUserCreated) are configured separately
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Export triggers
// onUserCreated is a v1 function, so it's configured in its own file
export {onUserCreated};
export {onMatchProfileWrite};
export {scheduledNudgeIncompleteProfiles};

// Export callable functions
export {
  setUserRole,
  logAnalyticsEvent,
  upsertBusinessProfile,
  trackLessonTime,
  markLessonComplete,
  submitQuizAttempt,
  generateDocumentPDF,
  finalizeAssetDocument,
  grantHiddenTrainingVideo,
  proposeMeeting,
  approveMeeting,
  adminAnalyticsReport,
  upsertMatchProfile,
  setUserBusinessProfile,
  updateOnboardingStatus,
  completeOnboarding,
  buildInitialMatches,
};

// Export HTTP functions
export {getCourseFile};

// Export PPTX import function
export {importPptxDeck};
