/// Outbound links to Mortar properties that live outside this app.
abstract final class AppLinks {
  /// Digital Curriculum (the web app) — courses, the alumni application and
  /// the certificate flow. Opened in a browser from the Mortarverse street.
  ///
  /// Defaults to the staging host, the same value `DEFAULT_PLATFORM_URL` in
  /// `functions/src/email/emailConfig.ts` falls back to. When Digital
  /// Curriculum gets its production domain, set it here **and** in that file,
  /// or point a single build at it with
  /// `flutter build … --dart-define=DIGITAL_CURRICULUM_URL=https://…`.
  static const String digitalCurriculum = String.fromEnvironment(
    'DIGITAL_CURRICULUM_URL',
    defaultValue: 'https://mortar-stage-stage.up.railway.app',
  );

  /// Public privacy policy — the URL registered in Play Console and App Store
  /// Connect, and the one linked from the profile screen.
  ///
  /// `.html` is not a typo. The page is a static file (`public/privacy.html`)
  /// rather than a React route, because Google Play's policy checker fetches it
  /// without running JavaScript and a route would hand it an empty shell. That
  /// is what got the previous Canva link rejected. Keep this in step with
  /// `digitalCurriculum` above.
  static const String privacyPolicy = '$digitalCurriculum/privacy.html';

  /// Public account & data deletion page — the URL registered in the Play
  /// Data safety form.
  ///
  /// `.html` for the same reason as [privacyPolicy]: Play's reviewer does not
  /// run JavaScript, so the React route at `/delete-account` reads to them as an
  /// empty page with no app or developer named — which is exactly what the
  /// September 2026 Data safety review flagged. The static page states the app
  /// name, package and developer, and links on to the interactive form.
  static const String deleteAccount = '$digitalCurriculum/delete-account.html';
}
