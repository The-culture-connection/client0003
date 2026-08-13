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
}
