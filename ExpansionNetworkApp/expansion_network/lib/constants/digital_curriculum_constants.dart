/// Where the "Digital Curriculum" planet on the Mortarverse chooser sends
/// members — the curriculum web app, opened in the external browser.
///
/// URL strategy (for Grace): the mobile app has exactly two compile-time
/// environments — `dev` and `stage`, selected via `FIREBASE_ENV` in
/// `lib/firebase_options.dart` — and no production environment yet. The only
/// Digital Curriculum deployment referenced anywhere in the codebase is the
/// staging one below (it is also `DEFAULT_PLATFORM_URL` in
/// `functions/src/email/emailConfig.ts`), so both environments point at it.
/// When a production deployment exists, either change [kDigitalCurriculumUrl]
/// here or branch on `DefaultFirebaseOptions.isStage` the way
/// `firebase_options.dart` does.
const String kDigitalCurriculumUrl =
    'https://mortar-stage-stage.up.railway.app';
