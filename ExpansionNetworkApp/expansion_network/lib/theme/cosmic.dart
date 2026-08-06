import 'package:flutter/material.dart';

/// The Mortarverse design system — the app's target visual language, ported
/// from Claude Design `Mortarverse Home.dc.html`, option **1a "Deep field"**.
///
/// This is the successor to the legacy system in `app_theme.dart`. The two are
/// opposites rather than variations:
///
/// | | legacy (`AppColors`) | cosmic |
/// |---|---|---|
/// | geometry | zero radius everywhere | 16–22px panels, 999px pills |
/// | surfaces | flat opaque fills | translucent gradient + backdrop blur |
/// | type | ArchivoBlack + platform sans | Poppins 300–700 |
///
/// Because they are opposites, a screen must be converted whole. Half a screen
/// in each language reads as broken, not as work in progress — which is why
/// [cosmicTheme] is applied per zone via a `Theme` wrapper rather than being
/// switched on globally. See `docs/cosmic-migration.md`.
///
/// Accent colour is the ONLY thing that varies by zone. Surfaces, radii,
/// spacing and type are identical app-wide; the Conference app is gold and the
/// Expansion app is brick red, on the same glass.
abstract final class Cosmic {
  // ---- Accents -------------------------------------------------------
  // One per zone. Everything else in this class is shared.

  /// Expansion / Mortarverse — brick red.
  static const Color accentExpansion = Color(0xFFE41A28);

  /// Conference Center — the gold sub-brand.
  static const Color accentConference = Color(0xFFE6DBB4);

  /// The Commons.
  static const Color accentCommons = Color(0xFF5BA8A0);

  /// Alert red: status dots, active pager bars, urgent rules.
  static const Color alert = Color(0xFFFF3B47);

  // ---- Surfaces ------------------------------------------------------

  /// The deep field behind everything. Screens render transparent over it.
  static const Color space = Color(0xFF000000);

  /// Panel hairline — `1px solid rgba(255,255,255,.26)`.
  static const Color panelBorder = Color(0x42FFFFFF);

  /// The quieter hairline on chips and rows — `rgba(255,255,255,.2)`.
  static const Color chipBorder = Color(0x33FFFFFF);

  /// Panel fill — `linear-gradient(155deg, rgba(255,255,255,.075),
  /// rgba(255,255,255,.012))`. CSS 155° runs top-left → bottom-right.
  static const Gradient panelFill = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x13FFFFFF), Color(0x03FFFFFF)],
  );

  /// Chip / row fill — the same ramp one step quieter.
  static const Gradient chipFill = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x0FFFFFFF), Color(0x03FFFFFF)],
  );

  /// Backdrop blur sigma behind a glass panel — `backdrop-filter: blur(3px)`.
  static const double blurSigma = 3;

  // ---- Text ----------------------------------------------------------

  static const Color textPrimary = Color(0xFFFFFFFF);

  /// Body copy inside a panel — `rgba(255,255,255,.62)`.
  static const Color textBody = Color(0x9EFFFFFF);

  /// The secondary line of a two-line chip — `rgba(255,255,255,.5)`.
  static const Color textMuted = Color(0x80FFFFFF);

  /// Chevrons, trailing hints, captions — `rgba(255,255,255,.45)`.
  static const Color textFaint = Color(0x73FFFFFF);

  /// Italic accent copy — `#ff8b95`.
  static const Color textAccent = Color(0xFFFF8B95);

  // ---- Geometry ------------------------------------------------------
  // Legacy used BorderRadius.zero everywhere (243 sites at time of writing).
  // Nothing in the cosmic language is square.

  /// Focus panels and cards.
  static const double radiusPanel = 22;

  /// Chips, list rows, secondary surfaces.
  static const double radiusChip = 16;

  /// Squircle controls — the card/scan button.
  static const double radiusControl = 15;

  /// Pills and any full-round control.
  static const double radiusPill = 999;

  // Const-constructible forms of the radii above. `BorderRadius.circular` is
  // not a const constructor, so a `const BoxDecoration` — or any default
  // parameter value — needs these instead.
  static const BorderRadius panelRadius =
      BorderRadius.all(Radius.circular(radiusPanel));
  static const BorderRadius chipRadius =
      BorderRadius.all(Radius.circular(radiusChip));
  static const BorderRadius controlRadius =
      BorderRadius.all(Radius.circular(radiusControl));
  static const BorderRadius pillRadius =
      BorderRadius.all(Radius.circular(radiusPill));

  // ---- Type scale ----------------------------------------------------
  // Sizes, weights and tracking taken from option 1a. Tracking is absolute
  // px (Flutter's letterSpacing), converted from the design's em values.

  static const String fontFamily = 'Poppins';

  /// Screen wordmark — 20px/700, `.1em`.
  static const TextStyle wordmark = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    height: 1,
    fontWeight: FontWeight.w700,
    letterSpacing: 2,
    color: textPrimary,
  );

  /// Panel headline — 27px/600.
  static const TextStyle headline = TextStyle(
    fontFamily: fontFamily,
    fontSize: 27,
    height: 1.15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.27,
    color: textPrimary,
  );

  /// Italic tracked eyebrow over a headline — 10px/500, `.22em`.
  static const TextStyle eyebrow = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10,
    height: 1,
    fontWeight: FontWeight.w500,
    fontStyle: FontStyle.italic,
    letterSpacing: 2.2,
  );

  /// Section rule — 11px/600, `.24em`.
  static const TextStyle sectionLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11,
    height: 1,
    fontWeight: FontWeight.w600,
    letterSpacing: 2.64,
    color: Color(0xD9FFFFFF),
  );

  /// Panel body copy — 12.5px/300.
  static const TextStyle body = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.5,
    height: 1.5,
    fontWeight: FontWeight.w300,
    color: textBody,
  );

  /// Chip primary line — 11.5px/400.
  static const TextStyle chipLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11.5,
    height: 1.35,
    fontWeight: FontWeight.w400,
    color: textPrimary,
  );

  /// Trailing hints and captions — 10.5px/300 italic.
  static const TextStyle caption = TextStyle(
    fontFamily: fontFamily,
    fontSize: 10.5,
    height: 1.25,
    fontWeight: FontWeight.w300,
    fontStyle: FontStyle.italic,
    color: textFaint,
  );

  /// Uppercase pill label — 12px/500, `.08em`.
  static const TextStyle pillLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12,
    height: 1,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.96,
    color: textPrimary,
  );

  /// Status capsule over a planet — 9px/500, `.16em`.
  static const TextStyle statusLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 9,
    height: 1,
    fontWeight: FontWeight.w500,
    letterSpacing: 1.44,
  );

  // ---- Spacing -------------------------------------------------------

  /// Screen gutter — the design's `margin: 0 20px`.
  static const double gutter = 20;

  /// Padding inside a glass panel.
  static const EdgeInsets panelPadding = EdgeInsets.fromLTRB(22, 22, 22, 20);

  /// Padding inside a chip or row.
  static const EdgeInsets chipPadding =
      EdgeInsets.symmetric(horizontal: 14, vertical: 13);
}

/// A field outline at option 2e's 14px radius.
///
/// Public so `CosmicField` and any screen overriding one border can reuse the
/// exact geometry instead of restating it.
OutlineInputBorder cosmicFieldBorder(Color color, [double width = 1]) =>
    OutlineInputBorder(
      borderRadius: const BorderRadius.all(Radius.circular(14)),
      borderSide: BorderSide(color: color, width: width),
    );

/// Builds the cosmic [ThemeData] for one zone.
///
/// **Not applied globally yet.** Wrap a route subtree in [CosmicZone] to opt it
/// in; the rest of the app keeps `buildAppTheme()` until its screens are
/// converted. This is what keeps the app shippable mid-migration — see the
/// class docs on [Cosmic] for why a partial conversion cannot be blended.
ThemeData cosmicTheme({required Color accent}) {
  final scheme = ColorScheme.dark(
    surface: Cosmic.space,
    onSurface: Cosmic.textPrimary,
    primary: accent,
    onPrimary: accent.computeLuminance() > 0.5 ? Colors.black : Colors.white,
    secondary: accent,
    outline: Cosmic.panelBorder,
  );

  final panelShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(Cosmic.radiusPanel),
    side: const BorderSide(color: Cosmic.panelBorder),
  );
  final chipShape = RoundedRectangleBorder(
    borderRadius: Cosmic.chipRadius,
    side: const BorderSide(color: Cosmic.chipBorder),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    fontFamily: Cosmic.fontFamily,
    scaffoldBackgroundColor: Colors.transparent,
    canvasColor: Colors.transparent,

    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: Cosmic.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: true,
      titleTextStyle: Cosmic.wordmark,
    ),

    // Glass, not the legacy flat card. The blur itself can't live in a theme,
    // so panels that need it use the GlassPanel widget; this covers the many
    // plain Cards that only need the right fill and geometry.
    cardTheme: CardThemeData(
      color: const Color(0x13FFFFFF),
      elevation: 0,
      shape: panelShape,
      margin: EdgeInsets.zero,
    ),

    // Option 2e's field, specified on the theme rather than only in a widget,
    // so every existing `TextFormField(decoration: InputDecoration(labelText:
    // …))` in the app — 23 files at time of writing — gets the treatment
    // without being rewritten. `CosmicField` is a thin wrapper over this.
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0x08FFFFFF),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
      // Floats into a notch in the stroke, italic and tracked, in the zone
      // accent. Flutter's own outline gap draws the notch — the mockup paints
      // a solid chip over the stroke, which only works on a flat page colour
      // and would leave a visible rectangle over the nebula.
      floatingLabelStyle: TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 11,
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w400,
        letterSpacing: 0.54,
        color: accent,
      ),
      labelStyle: const TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 12,
        fontWeight: FontWeight.w300,
        color: Color(0x6BFFFFFF),
      ),
      hintStyle: const TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 12,
        fontWeight: FontWeight.w300,
        color: Color(0x6BFFFFFF),
      ),
      errorStyle: const TextStyle(
        fontFamily: Cosmic.fontFamily,
        fontSize: 10.5,
        fontWeight: FontWeight.w300,
        color: Cosmic.alert,
      ),
      border: cosmicFieldBorder(const Color(0x2EFFFFFF)),
      enabledBorder: cosmicFieldBorder(const Color(0x2EFFFFFF)),
      focusedBorder: cosmicFieldBorder(accent.withValues(alpha: 0.6), 1.4),
      disabledBorder: cosmicFieldBorder(const Color(0x1AFFFFFF)),
      errorBorder: cosmicFieldBorder(Cosmic.alert.withValues(alpha: 0.7)),
      focusedErrorBorder: cosmicFieldBorder(Cosmic.alert, 1.4),
    ),

    // Every action is a pill in this language.
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: accent,
        foregroundColor: scheme.onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: const StadiumBorder(),
        textStyle: Cosmic.pillLabel,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: Cosmic.textPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        shape: const StadiumBorder(side: BorderSide(color: Color(0x80FFFFFF))),
        textStyle: Cosmic.pillLabel,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: accent,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        shape: const StadiumBorder(),
        textStyle: Cosmic.pillLabel,
      ),
    ),

    chipTheme: ChipThemeData(
      backgroundColor: const Color(0x0FFFFFFF),
      side: const BorderSide(color: Cosmic.chipBorder),
      shape: chipShape,
      labelStyle: Cosmic.chipLabel,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: const Color(0xF00A0508),
      surfaceTintColor: Colors.transparent,
      shape: panelShape,
      titleTextStyle: Cosmic.headline.copyWith(fontSize: 20),
      contentTextStyle: Cosmic.body,
    ),

    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: const Color(0xF00A0508),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(Cosmic.radiusPanel),
        ),
      ),
    ),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xF0140A0E),
      contentTextStyle: Cosmic.chipLabel,
      shape: chipShape,
      behavior: SnackBarBehavior.floating,
    ),

    tabBarTheme: TabBarThemeData(
      labelColor: accent,
      unselectedLabelColor: Cosmic.textFaint,
      indicatorColor: accent,
      dividerColor: Colors.transparent,
      labelStyle: Cosmic.sectionLabel.copyWith(letterSpacing: 1.2),
    ),

    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xE6050505),
      indicatorColor: accent.withValues(alpha: 0.18),
      elevation: 0,
      labelTextStyle: WidgetStatePropertyAll(Cosmic.caption.copyWith(
        fontStyle: FontStyle.normal,
        color: Cosmic.textFaint,
      )),
    ),

    dividerTheme: const DividerThemeData(
      color: Cosmic.chipBorder,
      thickness: 1,
    ),

    listTileTheme: ListTileThemeData(
      shape: chipShape,
      titleTextStyle: Cosmic.chipLabel,
      subtitleTextStyle: Cosmic.caption,
      iconColor: Cosmic.textFaint,
    ),
  );
}

/// Opts a route subtree into the cosmic language.
///
/// Wrap a zone's routes in this as their screens are converted. Mirrors how
/// `ConferenceTheme` already re-themes everything under `/conference/*`, so
/// zones can migrate independently and the app stays shippable throughout.
class CosmicZone extends StatelessWidget {
  const CosmicZone({
    super.key,
    required this.child,
    this.accent = Cosmic.accentExpansion,
  });

  final Widget child;

  /// The zone's accent. Surfaces are identical everywhere; only this varies.
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Theme(data: cosmicTheme(accent: accent), child: child);
  }
}
