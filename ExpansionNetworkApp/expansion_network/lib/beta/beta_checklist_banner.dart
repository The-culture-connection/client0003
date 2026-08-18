import 'package:flutter/material.dart';

import '../theme/cosmic.dart';
import 'beta_checklist.dart';

/// Beta checklist banner for the Mortarverse screen.
///
/// Collapsed it is one slim row — a progress bar and a count — so it barely
/// changes the shape of the landing screen. Tapping expands the seven steps
/// inline, each with its detail, mirroring the web rail's short-title-then-tap
/// behaviour.
///
/// It sits between the focus card and the secondary chips as its own sibling,
/// deliberately outside every `GlobalKey` the spotlight tutorial targets, so
/// the tutorial's rects are unchanged. It also collapses itself whenever the
/// tutorial runs, so an expanded list cannot cover a spotlight.
class BetaChecklistBanner extends StatefulWidget {
  const BetaChecklistBanner({
    super.key,
    required this.state,
    required this.loading,
    required this.onRefresh,
    this.forceCollapsed = false,
  });

  final BetaChecklistState state;
  final bool loading;
  final Future<void> Function() onRefresh;

  /// Set while the spotlight tutorial is showing.
  final bool forceCollapsed;

  @override
  State<BetaChecklistBanner> createState() => _BetaChecklistBannerState();
}

class _BetaChecklistBannerState extends State<BetaChecklistBanner> {
  bool _expanded = false;
  String? _openStepId;

  @override
  void didUpdateWidget(covariant BetaChecklistBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    // The tutorial must never be obscured by an expanded list.
    if (widget.forceCollapsed && _expanded) {
      _expanded = false;
      _openStepId = null;
    }
  }

  void _toggle() {
    setState(() {
      _expanded = !_expanded;
      if (!_expanded) _openStepId = null;
    });
    // Opening is the moment a tester most wants current state.
    if (_expanded) _refresh();
  }

  void _refresh() {
    widget.onRefresh().catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final expanded = _expanded && !widget.forceCollapsed;

    return Container(
      decoration: BoxDecoration(
        gradient: Cosmic.chipFill,
        border: Border.all(color: Cosmic.chipBorder),
        borderRadius: BorderRadius.circular(14),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            button: true,
            label: 'Beta checklist, '
                '${s.completedRequired} of ${s.totalRequired} done',
            child: InkWell(
              onTap: _toggle,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'BETA CHECKLIST',
                                style: TextStyle(
                                  color: Color(0xD9FFFFFF),
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 2.2,
                                  height: 1,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                widget.loading
                                    ? 'Checking…'
                                    : s.allRequiredDone
                                        ? 'All done'
                                        : '${s.completedRequired} of ${s.totalRequired}',
                                style: TextStyle(
                                  color: s.allRequiredDone
                                      ? Cosmic.accentExpansion
                                      : Cosmic.textMuted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  height: 1,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 9),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(2),
                            child: LinearProgressIndicator(
                              value: s.progress,
                              minHeight: 3,
                              backgroundColor: const Color(0x1AFFFFFF),
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                Cosmic.accentExpansion,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    AnimatedRotation(
                      turns: expanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 160),
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: Cosmic.textFaint,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 180),
            crossFadeState: expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Divider(height: 1, color: Cosmic.chipBorder),
                for (var i = 0; i < kBetaSteps.length; i++)
                  _StepRow(
                    step: kBetaSteps[i],
                    index: i + 1,
                    done: s.isDone(kBetaSteps[i].id),
                    open: _openStepId == kBetaSteps[i].id,
                    onTap: () => setState(() {
                      _openStepId = _openStepId == kBetaSteps[i].id
                          ? null
                          : kBetaSteps[i].id;
                    }),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 4, 14, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Steps tick themselves once you have done them.',
                          style: TextStyle(
                            color: Cosmic.textFaint,
                            fontSize: 10.5,
                            height: 1.3,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: widget.loading ? null : _refresh,
                        style: TextButton.styleFrom(
                          minimumSize: const Size(0, 30),
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Refresh',
                          style: TextStyle(
                            color: widget.loading
                                ? Cosmic.textFaint
                                : Cosmic.accentExpansion,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({
    required this.step,
    required this.index,
    required this.done,
    required this.open,
    required this.onTap,
  });

  final BetaStep step;
  final int index;
  final bool done;
  final bool open;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 12, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  done
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 16,
                  color: done ? Cosmic.accentExpansion : Cosmic.textFaint,
                ),
                const SizedBox(width: 9),
                Text(
                  index.toString().padLeft(2, '0'),
                  style: const TextStyle(
                    color: Cosmic.textFaint,
                    fontSize: 10,
                    height: 1.45,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    step.title,
                    style: TextStyle(
                      color: done ? Cosmic.textMuted : Cosmic.textPrimary,
                      fontSize: 12.5,
                      height: 1.3,
                      decoration:
                          done ? TextDecoration.lineThrough : TextDecoration.none,
                      decorationColor: Cosmic.textFaint,
                    ),
                  ),
                ),
                if (step.optional)
                  Container(
                    margin: const EdgeInsets.only(left: 6),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      border: Border.all(color: Cosmic.chipBorder),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: const Text(
                      'OPTIONAL',
                      style: TextStyle(
                        color: Cosmic.textFaint,
                        fontSize: 8,
                        letterSpacing: 0.6,
                        height: 1,
                      ),
                    ),
                  ),
              ],
            ),
            if (open) ...[
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 33, right: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final line in step.detail)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '• $line',
                          style: const TextStyle(
                            color: Cosmic.textMuted,
                            fontSize: 11.5,
                            height: 1.35,
                          ),
                        ),
                      ),
                    if (step.note != null)
                      Container(
                        margin: const EdgeInsets.only(top: 4),
                        padding: const EdgeInsets.fromLTRB(8, 6, 8, 6),
                        decoration: BoxDecoration(
                          border: Border(
                            left: BorderSide(
                              color: Cosmic.accentExpansion.withValues(alpha: 0.6),
                              width: 2,
                            ),
                          ),
                          color: const Color(0x08FFFFFF),
                        ),
                        child: Text(
                          step.note!,
                          style: const TextStyle(
                            color: Cosmic.textMuted,
                            fontSize: 11,
                            height: 1.35,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
