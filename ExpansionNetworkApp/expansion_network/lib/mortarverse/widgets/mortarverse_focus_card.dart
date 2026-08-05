import 'package:flutter/material.dart';

import '../../commons/theme/commons_colors.dart';
import '../../theme/app_theme.dart';
import '../../theme/cosmic_widgets.dart';

/// One item in the Mortarverse action queue.
///
/// The queue is ordered by priority — conversations waiting → a conference that
/// just opened → profile completion — and falls back to a suggested action so
/// the card is never empty.
class MortarverseAction {
  const MortarverseAction({
    required this.type,
    required this.eyebrow,
    required this.headline,
    required this.body,
    required this.ctaLabel,
    required this.accent,
    required this.route,
    this.urgent = true,
  });

  /// Stable slug for analytics (`messages`, `conference`, `profile`, `suggested`).
  final String type;

  final String eyebrow;

  /// Two lines at most — the card reserves room for exactly that.
  final String headline;

  final String body;
  final String ctaLabel;
  final Color accent;
  final String route;

  /// Urgent items get the glowing status dot; suggestions don't.
  final bool urgent;

  static MortarverseAction messages(int waiting) => MortarverseAction(
        type: 'messages',
        eyebrow: 'WAITING ON YOU',
        headline: waiting == 1
            ? '1 conversation\nwaiting'
            : '$waiting conversations\nwaiting',
        body: waiting == 1
            ? 'Someone replied and is waiting to hear back from you.'
            : 'People are waiting to hear back from you in the Commons.',
        ctaLabel: 'Open messages',
        accent: AppColors.primary,
        route: '/commons/messages',
      );

  static MortarverseAction conference(String name, String route) => MortarverseAction(
        type: 'conference',
        eyebrow: 'JUST OPENED',
        headline: name.length > 22 ? '$name\nis open' : '$name\nis open now',
        body: 'Sessions, booths and the community hub are live. Grab your spot.',
        ctaLabel: 'Enter conference',
        accent: const Color(0xFFE6DBB4),
        route: route,
      );

  /// Next published MORTAR event. [when] is already formatted (e.g. "Thu 6:00 PM").
  static MortarverseAction event({
    required String title,
    required String when,
  }) =>
      MortarverseAction(
        type: 'event',
        eyebrow: 'COMING UP',
        headline: title.length > 20 ? title : '$title\nis coming up',
        body: '$when · Tap to see the details and RSVP.',
        ctaLabel: 'View event',
        accent: AppColors.primary,
        route: '/events',
        urgent: false,
      );

  /// Always available — no data behind it, it's a capability prompt.
  static const MortarverseAction qrCard = MortarverseAction(
    type: 'qr_card',
    eyebrow: 'MEET SOMEONE',
    headline: 'Swap cards\nwith a scan',
    body: 'Show your QR card or scan someone else’s to start a conversation.',
    ctaLabel: 'Open my card',
    accent: AppColors.primary,
    route: '/card',
    urgent: false,
  );

  static MortarverseAction profile(int percent) => MortarverseAction(
        type: 'profile',
        eyebrow: 'FINISH SETTING UP',
        headline: 'Your profile is\n$percent% complete',
        body: 'Members with a complete profile get better matches and intros.',
        ctaLabel: 'Complete profile',
        accent: CommonsColors.accent,
        route: '/profile/edit',
        urgent: false,
      );

  static const MortarverseAction browseMembers = MortarverseAction(
    type: 'suggested',
    eyebrow: 'SUGGESTED',
    headline: 'Find people\nworth meeting',
    body: 'Browse members by skill, industry and what they’re building.',
    ctaLabel: 'Browse members',
    accent: CommonsColors.accent,
    route: '/explore',
    urgent: false,
  );
}

/// The live widget: shows the single highest-priority action, cycling through
/// the queue every few seconds.
class MortarverseFocusCard extends StatefulWidget {
  const MortarverseFocusCard({
    super.key,
    required this.queue,
    required this.onOpen,
    required this.onShown,
  });

  final List<MortarverseAction> queue;

  /// Tapping the card or its CTA.
  final ValueChanged<MortarverseAction> onOpen;

  /// Fired once per item as it surfaces, for analytics.
  final ValueChanged<MortarverseAction> onShown;

  @override
  State<MortarverseFocusCard> createState() => _MortarverseFocusCardState();
}

class _MortarverseFocusCardState extends State<MortarverseFocusCard> {
  int _index = 0;
  String? _lastReported;

  /// Accumulated horizontal drag for the current gesture.
  double _dragDx = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _reportShown());
  }

  @override
  void didUpdateWidget(MortarverseFocusCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Queue changed under us (a message arrived, the conference opened) — snap
    // back to the top rather than leaving the index pointing at nothing.
    if (widget.queue.length != oldWidget.queue.length && _index >= widget.queue.length) {
      _index = 0;
    }
    _reportShown();
  }

  void _reportShown() {
    if (!mounted || widget.queue.isEmpty) return;
    final item = widget.queue[_index.clamp(0, widget.queue.length - 1)];
    if (item.type == _lastReported) return;
    _lastReported = item.type;
    widget.onShown(item);
  }

  void _advance(int delta) {
    if (widget.queue.length < 2) return;
    setState(() {
      _index = (_index + delta) % widget.queue.length;
      if (_index < 0) _index += widget.queue.length;
    });
    _reportShown();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.queue.isEmpty) return const SizedBox.shrink();
    final item = widget.queue[_index.clamp(0, widget.queue.length - 1)];

    return Column(
      children: [
        GestureDetector(
          onTap: () => widget.onOpen(item),
          onHorizontalDragStart: (_) => _dragDx = 0,
          onHorizontalDragUpdate: (d) => _dragDx += d.delta.dx,
          // Accepts either a flick or a slow drag past a third of the card —
          // velocity alone ignored anyone who dragged deliberately.
          onHorizontalDragEnd: (d) {
            final v = d.primaryVelocity ?? 0;
            final w = context.size?.width ?? 320;
            final far = _dragDx.abs() > w / 3;
            final flick = v.abs() > 250;
            if (!far && !flick) return;
            final forward = (flick ? v < 0 : _dragDx < 0);
            _advance(forward ? 1 : -1);
          },
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, animation) => FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 0.06),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            ),
            child: _CardBody(
              key: ValueKey<String>(item.type),
              item: item,
              onCta: () => widget.onOpen(item),
            ),
          ),
        ),
        if (widget.queue.length > 1) ...[
          // 4 + the dots' own 10px touch padding ≈ the 14px gap in the spec.
          const SizedBox(height: 4),
          _PagerDots(
            count: widget.queue.length,
            active: _index,
            colors: [for (final a in widget.queue) a.accent],
            onSelect: (i) {
              setState(() => _index = i);
              _reportShown();
            },
          ),
        ],
      ],
    );
  }
}

class _CardBody extends StatelessWidget {
  const _CardBody({super.key, required this.item, required this.onCta});

  final MortarverseAction item;
  final VoidCallback onCta;

  @override
  Widget build(BuildContext context) {
    final accent = item.accent;

    // The design's glass panel, with the item's own accent driving the bloom
    // and the eyebrow so the queue still reads as distinct items.
    return GlassPanel(
      // 220px circle centred off the top-right corner, per the option.
      bloomAt: const Alignment(1.9, -2.0),
      bloomColor: accent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                item.eyebrow.toUpperCase(),
                style: TextStyle(
                  color: accent,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  fontStyle: FontStyle.italic,
                  // .22em at 10px.
                  letterSpacing: 2.2,
                  height: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            item.headline,
            style: const TextStyle(
              color: Cosmic.textPrimary,
              fontSize: 27,
              height: 1.15,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.27,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            item.body,
            style: const TextStyle(
              color: Cosmic.textBody,
              fontSize: 12.5,
              height: 1.5,
              fontWeight: FontWeight.w300,
            ),
          ),
          const SizedBox(height: 18),
          Align(
            alignment: Alignment.centerRight,
            child: GlowPill(label: item.ctaLabel, onTap: onCta),
          ),
        ],
      ),
    );
  }
}

class _PagerDots extends StatelessWidget {
  const _PagerDots({
    required this.count,
    required this.active,
    required this.colors,
    required this.onSelect,
  });

  final int count;
  final int active;
  final List<Color> colors;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          GestureDetector(
            onTap: () => onSelect(i),
            // The dot itself is 5px tall; the padding gives it a real touch
            // target without changing how it looks.
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: EdgeInsets.fromLTRB(i == 0 ? 0 : 3.5, 10, i == count - 1 ? 0 : 3.5, 10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: i == active ? 16 : 5,
                height: 3,
                decoration: BoxDecoration(
                  // Lit bar for the current item, neutral stubs for the rest.
                  color: i == active ? colors[i] : const Color(0x47FFFFFF),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
