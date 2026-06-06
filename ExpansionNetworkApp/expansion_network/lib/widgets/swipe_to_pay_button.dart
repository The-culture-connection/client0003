import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_theme.dart';

class SwipeToPayButton extends StatefulWidget {
  const SwipeToPayButton({
    super.key,
    required this.priceCents,
    required this.onConfirmed,
    this.busy = false,
  });

  final int priceCents;
  final VoidCallback onConfirmed;
  final bool busy;

  @override
  State<SwipeToPayButton> createState() => _SwipeToPayButtonState();
}

class _SwipeToPayButtonState extends State<SwipeToPayButton>
    with SingleTickerProviderStateMixin {
  static const double _thumbSize = 52;
  static const double _trackPadding = 4;
  static const double _confirmThreshold = 0.85;

  double _dragFraction = 0;
  bool _confirmed = false;
  late AnimationController _resetController;
  late Animation<double> _resetAnimation;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _resetAnimation = CurvedAnimation(
      parent: _resetController,
      curve: Curves.easeOut,
    );
    _resetController.addListener(() {
      setState(() {
        _dragFraction = _resetAnimation.value * _dragFraction;
      });
    });
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  String get _priceLabel =>
      '\$${(widget.priceCents / 100).toStringAsFixed(2)}';

  void _onDragUpdate(DragUpdateDetails details, double trackWidth) {
    if (_confirmed || widget.busy) return;
    final maxTravel = trackWidth - _thumbSize - (_trackPadding * 2);
    if (maxTravel <= 0) return;
    setState(() {
      _dragFraction =
          (_dragFraction + details.delta.dx / maxTravel).clamp(0.0, 1.0);
    });
  }

  void _onDragEnd(DragEndDetails details) {
    if (_confirmed || widget.busy) return;
    if (_dragFraction >= _confirmThreshold) {
      setState(() {
        _confirmed = true;
        _dragFraction = 1.0;
      });
      HapticFeedback.heavyImpact();
      widget.onConfirmed();
    } else {
      final startFraction = _dragFraction;
      _resetController.reset();
      _resetAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
        CurvedAnimation(parent: _resetController, curve: Curves.easeOut),
      );
      _resetController.removeListener(_onResetTick);
      _dragFraction = startFraction;
      _resetController.addListener(_onResetTick);
      _resetController.forward();
    }
  }

  void _onResetTick() {
    // handled via the listener added in _onDragEnd
  }

  @override
  void didUpdateWidget(SwipeToPayButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.busy && oldWidget.busy && _confirmed) {
      setState(() {
        _confirmed = false;
        _dragFraction = 0;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final trackWidth = constraints.maxWidth;
        final maxTravel = trackWidth - _thumbSize - (_trackPadding * 2);
        final thumbOffset = _trackPadding + (_dragFraction * maxTravel);

        return Container(
          height: _thumbSize + (_trackPadding * 2),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular((_thumbSize / 2) + _trackPadding),
            color: AppColors.secondary,
            border: Border.all(
              color: Color.lerp(
                AppColors.border,
                AppColors.primary,
                _dragFraction,
              )!,
              width: 1.5,
            ),
          ),
          child: Stack(
            children: [
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(_thumbSize / 2 + _trackPadding),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 50),
                      width: thumbOffset + _thumbSize,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(_thumbSize / 2),
                        color: AppColors.primary.withValues(alpha: 0.15 + (_dragFraction * 0.25)),
                      ),
                    ),
                  ),
                ),
              ),
              Center(
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 150),
                  opacity: widget.busy ? 0 : (1.0 - _dragFraction).clamp(0.3, 1.0),
                  child: Text(
                    'Swipe to pay $_priceLabel',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.mutedForeground,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
              if (widget.busy)
                const Center(
                  child: SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.onPrimary,
                    ),
                  ),
                ),
              Positioned(
                left: thumbOffset,
                top: _trackPadding,
                child: GestureDetector(
                  onHorizontalDragUpdate: (d) => _onDragUpdate(d, trackWidth),
                  onHorizontalDragEnd: _onDragEnd,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 50),
                    width: _thumbSize,
                    height: _thumbSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color.lerp(
                        AppColors.primary,
                        AppColors.primary,
                        _dragFraction,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.4 + (_dragFraction * 0.3)),
                          blurRadius: 8 + (_dragFraction * 8),
                          spreadRadius: _dragFraction * 2,
                        ),
                      ],
                    ),
                    child: Icon(
                      _confirmed ? Icons.check : Icons.arrow_forward_rounded,
                      color: AppColors.onPrimary,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
