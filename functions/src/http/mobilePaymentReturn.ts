/**
 * mobilePaymentReturn — lightweight HTML redirect that sends the user back to the
 * mobile app after a successful Stripe Checkout.
 *
 * Stripe redirects here (success_url) → page auto-opens the app via custom URL
 * scheme → the app's WidgetsBindingObserver reloads the event to reflect payment.
 */

import {onRequest} from "firebase-functions/v2/https";

const APP_SCHEME = "mortaralumni";

export const mobilePaymentReturn = onRequest(
  {region: "us-central1"},
  (req, res) => {
    const type = String(req.query.type ?? "event");
    const eventId = String(req.query.event_id ?? "");
    const orderId = String(req.query.order_id ?? "");

    const deepLink = eventId
      ? `${APP_SCHEME}://events/${encodeURIComponent(eventId)}?order_id=${encodeURIComponent(orderId)}`
      : `${APP_SCHEME}://home`;

    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Successful</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 60px 24px; background: #fafafa; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #666; font-size: 15px; margin-bottom: 24px; }
    a.btn { display: inline-block; padding: 14px 32px; background: #111; color: #fff; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }
  </style>
</head>
<body>
  <h1>Payment Successful &#10003;</h1>
  <p>Returning you to the app&hellip;</p>
  <a class="btn" id="open" href="${deepLink}">Open Mortar App</a>
  <script>
    setTimeout(function() { window.location.href = "${deepLink}"; }, 600);
  </script>
</body>
</html>`);
  }
);
