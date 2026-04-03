import 'package:flutter/material.dart';

/// Matches [UI Basis/src/styles/theme.css] — dark alumni networking palette.
abstract final class AppColors {
  static const Color background = Color(0xFF000000);
  static const Color foreground = Color(0xFFFFFFFF);
  static const Color card = Color(0xFF1A1A1A);
  static const Color secondary = Color(0xFF2A2A2A);
  static const Color mutedForeground = Color(0xFF999999);
  static const Color primary = Color(0xFFC1121F);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color border = Color(0x1AFFFFFF);
  static const Color inputBackground = Color(0xFF1A1A1A);
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
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0,
    ),
    cardTheme: CardThemeData(
      color: AppColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.secondary,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      hintStyle: const TextStyle(color: AppColors.mutedForeground),
      labelStyle: const TextStyle(color: AppColors.foreground),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.card,
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
