import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../theme/cosmic_widgets.dart';
import 'beta_feedback_repository.dart';

/// The comment sheet a shake (or the floating bug button) opens.
///
/// [screenshot] is captured *before* this sheet is built, so the image the
/// tester previews here — and the one staff sees in the admin tab — is the
/// screen as it looked untouched, with no report UI over it.
class BetaFeedbackSheet extends StatefulWidget {
  const BetaFeedbackSheet({
    super.key,
    required this.screenLabel,
    required this.route,
    required this.onSubmit,
    this.screenshot,
  });

  final String screenLabel;
  final String route;
  final Uint8List? screenshot;

  /// Files the report. Throws with a user-readable message on failure.
  final Future<void> Function(String comment) onSubmit;

  @override
  State<BetaFeedbackSheet> createState() => _BetaFeedbackSheetState();
}

class _BetaFeedbackSheetState extends State<BetaFeedbackSheet> {
  final TextEditingController _controller = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Tell us what you would change.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.onSubmit(text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e is StateError ? e.message : 'Could not send that. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: GlassPanel(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
            bloomAt: const Alignment(0, -1.4),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Cosmic.textFaint,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.bug_report_outlined,
                          size: 20, color: Cosmic.accentExpansion),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'What would you change?',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: Cosmic.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                      IconButton(
                        onPressed: _sending ? null : () => Navigator.of(context).pop(false),
                        icon: const Icon(Icons.close_rounded, size: 20),
                        color: Cosmic.textMuted,
                        tooltip: 'Close',
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  _ScreenChip(label: widget.screenLabel, route: widget.route),
                  const SizedBox(height: 14),
                  if (widget.screenshot != null) ...[
                    _ScreenshotPreview(bytes: widget.screenshot!),
                    const SizedBox(height: 14),
                  ],
                  TextField(
                    controller: _controller,
                    autofocus: true,
                    enabled: !_sending,
                    minLines: 3,
                    maxLines: 6,
                    maxLength: BetaFeedbackRepository.maxCommentLength,
                    textCapitalization: TextCapitalization.sentences,
                    style: const TextStyle(color: Cosmic.textPrimary, fontSize: 14, height: 1.4),
                    decoration: InputDecoration(
                      hintText: 'e.g. this button is too small to tap',
                      hintStyle: const TextStyle(color: Cosmic.textFaint, fontSize: 14),
                      counterStyle: const TextStyle(color: Cosmic.textFaint, fontSize: 11),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.04),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Cosmic.chipBorder),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Cosmic.accentExpansion),
                      ),
                      disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Cosmic.chipBorder),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      _error!,
                      style: const TextStyle(color: Cosmic.alert, fontSize: 12, height: 1.35),
                    ),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 4),
                  if (_sending)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 10),
                        child: SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    )
                  else
                    GlowPill(label: 'Send to the team', expand: true, onTap: _send),
                  const SizedBox(height: 10),
                  Text(
                    widget.screenshot != null
                        ? 'Sends your note plus the screenshot above.'
                        : 'Sends your note. (The screenshot could not be captured on this screen.)',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Cosmic.textFaint, fontSize: 11, height: 1.35),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScreenChip extends StatelessWidget {
  const _ScreenChip({required this.label, required this.route});

  final String label;
  final String route;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        border: Border.all(color: Cosmic.chipBorder),
        borderRadius: BorderRadius.circular(999),
        color: Colors.white.withValues(alpha: 0.03),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.place_outlined, size: 13, color: Cosmic.textMuted),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Cosmic.textBody,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScreenshotPreview extends StatelessWidget {
  const _ScreenshotPreview({required this.bytes});

  final Uint8List bytes;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 180),
        width: double.infinity,
        decoration: BoxDecoration(
          border: Border.all(color: Cosmic.chipBorder),
          borderRadius: BorderRadius.circular(14),
        ),
        // `topCenter` so the preview shows the top of the screen rather than a
        // slice from the middle — the header is what identifies the screen.
        child: Image.memory(bytes, fit: BoxFit.fitWidth, alignment: Alignment.topCenter),
      ),
    );
  }
}
