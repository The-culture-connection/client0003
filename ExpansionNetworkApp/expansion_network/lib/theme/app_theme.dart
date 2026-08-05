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
  );
}
