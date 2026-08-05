import 'package:flutter/material.dart';

/// MORTAR "industrial deconstructed in the Mortarverse" palette — mirrors the
/// Digital Curriculum webapp design system (theme.css):
/// brick red accent (#C1442A = trowell red lifted for dark-surface contrast),
/// deep space blacks, glass panels, sharp geometry.
abstract final class AppColors {
  static const Color background = Color(0xFF000000);
  static const Color foreground = Color(0xFFFFFFFF);
  static const Color card = Color(0xFF141414);
  static const Color secondary = Color(0xFF2A2A2A);
  static const Color mutedForeground = Color(0xFF999999);

  /// Brick red — the app-shell accent shared with the curriculum webapp.
  static const Color primary = Color(0xFFC1442A);
  static const Color onPrimary = Color(0xFFFFFFFF);

  /// Deep texture red (webapp's page-bottom grunge wash).
  static const Color deepRed = Color(0xFFA01F10);

  static const Color border = Color(0x1AFFFFFF);
  static const Color inputBackground = Color(0xFF1A1A1A);

  /// Glass panel fill/border over the starfield.
  static const Color glassFill = Color(0x09FFFFFF); // white ~3.5%
  static const Color glassBorder = Color(0x1AFFFFFF); // white 10%

  /// Scorched near-black behind a secondary button — dark enough to read as
  /// a cut-out in the panel, translucent enough for grunge to show through.
  static const Color buttonSunken = Color(0x8C120A08); // ~55% over the panel

  /// Ember ring on a secondary button's edge.
  static const Color emberBorder = Color(0xB3C1442A); // primary @ 70%
}

/// Button geometry and glow, shared by every button theme below so primary,
/// secondary, and tertiary stay dimensionally identical and differ only in
/// weight. Tuned to the Mortarverse mock: tracked-out caps on a tall slab
/// with a red bloom bleeding off the edge.
abstract final class AppButtons {
  /// Full pill, per the Mortarverse mockups: the buttons are stadium-shaped
  /// glow pills while every other surface stays zero-radius.
  static const double radius = 999;

  static const EdgeInsets padding = EdgeInsets.symmetric(
    horizontal: 22,
    vertical: 17,
  );

  /// Uppercase, tracked out. Flutter has no text-transform, so labels are
  /// capitalised at the call site; this supplies the tracking and weight.
  static const TextStyle label = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.7,
  );

  static RoundedRectangleBorder get shape => RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
      );

  /// Buttons sit flat on the surface — no elevation, so Material paints no
  /// drop shadow, and with no `shadowColor` there is nothing to tint one.
  ///
  /// This replaced a state-driven glow that bloomed brick red on every button
  /// in the app. It read as noise rather than emphasis, so weight is carried
  /// by fill and border alone now.
  static const WidgetStateProperty<double> flat = WidgetStatePropertyAll(0);
}

/// Shared text voices from the webapp system.
abstract final class AppText {
  /// Montserrat-Black-style display headline (Archivo Black).
  static const TextStyle headline = TextStyle(
    fontFamily: 'ArchivoBlack',
    color: AppColors.foreground,
    height: 1.05,
    letterSpacing: 0.5,
  );

  /// Accent kicker — "GOOD EVENING //" over the headline.
  static const TextStyle kicker = TextStyle(
    color: AppColors.primary,
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 3.6,
  );

  /// Technical spec label — uppercase, tracked-out metadata.
  static const TextStyle technical = TextStyle(
    color: AppColors.mutedForeground,
    fontSize: 10,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.6,
  );
}

ThemeData buildAppTheme() {
  const scheme = ColorScheme.dark(
    surface: AppColors.background,
    onSurface: AppColors.foreground,
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    secondary: AppColors.secondary,
    onSecondary: AppColors.foreground,
    surfaceContainerHighest: AppColors.card,
    outline: AppColors.border,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.transparent,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: AppColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
      // Headline voice on every screen title (webapp's Montserrat Black).
      titleTextStyle: TextStyle(
        fontFamily: 'ArchivoBlack',
        color: AppColors.foreground,
        fontSize: 16,
        letterSpacing: 1.1,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.glassFill,
      elevation: 0,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.zero,
        side: BorderSide(color: AppColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.secondary,
      border: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide.none,
      ),
      enabledBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide.none,
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      hintStyle: const TextStyle(color: AppColors.mutedForeground),
      labelStyle: const TextStyle(color: AppColors.foreground),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xE6050505),
      indicatorColor: AppColors.primary.withValues(alpha: 0.2),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const TextStyle(
            color: AppColors.primary,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          );
        }
        return const TextStyle(
          color: AppColors.mutedForeground,
          fontSize: 12,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return const IconThemeData(color: AppColors.primary, size: 24);
        }
        return const IconThemeData(color: AppColors.mutedForeground, size: 24);
      }),
    ),
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.onPrimary,
    ),
    dividerTheme: const DividerThemeData(color: AppColors.border),

    // ---- Buttons -------------------------------------------------------
    // Three weights, one silhouette. Set here rather than per screen so all
    // ~220 buttons across the app inherit the Mortarverse look; a screen that
    // needs to deviate still wins by passing its own `styleFrom`.

    // PRIMARY — solid brick red, hottest glow. The single "do the thing" on
    // a screen.
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        disabledBackgroundColor: AppColors.secondary,
        disabledForegroundColor: AppColors.mutedForeground,
        padding: AppButtons.padding,
        shape: AppButtons.shape,
        textStyle: AppButtons.label,
      ).copyWith(elevation: AppButtons.flat),
    ),

    // ElevatedButton is near-extinct in this app but must not fall back to
    // Material's grey-on-lavender default where it survives.
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.onPrimary,
        disabledBackgroundColor: AppColors.secondary,
        disabledForegroundColor: AppColors.mutedForeground,
        padding: AppButtons.padding,
        shape: AppButtons.shape,
        textStyle: AppButtons.label,
      ).copyWith(elevation: AppButtons.flat),
    ),

    // SECONDARY — the mock's signature: a sunken near-black slab ringed in
    // ember, glowing softly. Carries equal visual weight to primary without
    // competing for the eye.
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        backgroundColor: AppColors.buttonSunken,
        foregroundColor: AppColors.foreground,
        disabledForegroundColor: AppColors.mutedForeground,
        padding: AppButtons.padding,
        shape: AppButtons.shape,
        textStyle: AppButtons.label,
      ).copyWith(
        elevation: AppButtons.flat,
        side: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) {
            return const BorderSide(color: AppColors.border);
          }
          if (states.contains(WidgetState.pressed) ||
              states.contains(WidgetState.hovered) ||
              states.contains(WidgetState.focused)) {
            return const BorderSide(color: AppColors.primary, width: 1.6);
          }
          return const BorderSide(color: AppColors.emberBorder, width: 1.2);
        }),
      ),
    ),

    // TERTIARY — no slab, no glow. Reserved for the quiet escape hatch
    // ("Have an invite code?"), so it must stay visually cheap.
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        disabledForegroundColor: AppColors.mutedForeground,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        shape: AppButtons.shape,
        textStyle: AppButtons.label.copyWith(
          fontSize: 12,
          letterSpacing: 1.2,
        ),
      ),
    ),
  );
}
