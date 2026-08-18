/**
 * Standing beta-feedback widget — the web counterpart of shake-to-report in
 * the mobile app.
 *
 * Deliberately separate from [ImplicitFeedbackWidget]: that one collects
 * sentiment for Survey Intelligence, this one collects "change this" reports
 * for the Beta Testing triage queue, and mixing them would pollute both.
 *
 * Everything this renders carries `data-beta-feedback-ui` so
 * [captureViewportPng] filters it out — the screenshot is the page as the
 * tester saw it, with no report UI on top.
 */

import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Bug, Loader2, X } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  BETA_FEEDBACK_MAX_COMMENT,
  BETA_FEEDBACK_UI_ATTR,
  captureViewportPng,
  resolveBetaFeedbackScreen,
  submitBetaFeedback,
} from "../../lib/betaFeedback";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const uiProps = { [BETA_FEEDBACK_UI_ATTR]: "true" } as Record<string, string>;

export function BetaFeedbackWidget() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Close and reset if the tester navigates while the panel is open — the
  // captured shot would no longer match the page they are looking at.
  useEffect(() => {
    setOpen(false);
    setScreenshot(null);
    setComment("");
    setError(null);
  }, [location.pathname]);

  if (!user) return null;

  const { screen, screenLabel } = resolveBetaFeedbackScreen(location.pathname);

  async function handleOpen() {
    setCapturing(true);
    setError(null);
    // Captured before the panel mounts, so nothing of ours is on screen yet.
    const png = await captureViewportPng();
    setScreenshot(png);
    setCapturing(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setScreenshot(null);
    setComment("");
    setError(null);
  }

  async function handleSend() {
    const text = comment.trim();
    if (!text) {
      setError("Tell us what you would change.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitBetaFeedback({
        comment: text,
        screen,
        screenLabel,
        route: location.pathname + location.search,
        screenshotDataUrl: screenshot,
      });
      setSentAt(Date.now());
      handleClose();
      window.setTimeout(() => setSentAt(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send that. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Sits above the sentiment widget's bottom-right slot so the two
          never overlap. */}
      {/* `data-tour` anchors the student tour's opening step — the one thing a
          beta tester has to know before anything else. */}
      <div {...uiProps} data-tour="beta-feedback" className="fixed bottom-24 right-6 z-50">
        <button
          type="button"
          onClick={handleOpen}
          disabled={capturing || open}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-black/80 border border-accent/70 shadow-[0_0_18px_rgba(228,26,40,0.35)] text-white backdrop-blur-sm transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          aria-label="Report something to change on this page"
          title="Report something to change on this page"
        >
          {capturing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Bug className="w-5 h-5" />
          )}
        </button>
      </div>

      {sentAt !== null && (
        <div
          {...uiProps}
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-full border border-white/15 bg-black/90 px-4 py-2 text-sm text-white shadow-lg"
        >
          Thanks — sent to the MORTAR team.
        </div>
      )}

      {open && (
        <div {...uiProps} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={sending ? undefined : handleClose}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Beta feedback"
            className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/15 bg-[#0b0b0b] p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3 mb-3">
              <Bug className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  What would you change?
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate" title={screenLabel}>
                  {screenLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {screenshot ? (
              <div className="mb-3 rounded-lg border border-white/10 overflow-hidden max-h-48">
                <img
                  src={screenshot}
                  alt="Screenshot of this page as it will be sent"
                  className="w-full object-cover object-top"
                />
              </div>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">
                The screenshot could not be captured on this page — your note and the page
                name will still be sent.
              </p>
            )}

            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={sending}
              rows={4}
              maxLength={BETA_FEEDBACK_MAX_COMMENT}
              autoFocus
              placeholder="e.g. this button is too small to tap"
              className="resize-none"
            />

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send to the team"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
