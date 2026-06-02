import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trackEvent } from "../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { clearCart } from "../lib/cart";
import { useAuth } from "../components/auth/AuthProvider";

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const sessionId = params.get("session_id");
  const purchaseType = params.get("type");
  const { user } = useAuth();
  const reportedRef = useRef(false);
  const cartClearedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    const dedupe_key = orderId ?? sessionId ?? "payment_success";
    trackEvent(
      WEB_ANALYTICS_EVENTS.PAYMENT_SUCCEEDED,
      {
        order_id: orderId,
        session_id: sessionId,
        purchase_type: purchaseType,
      },
      { dedupe_key }
    );
  }, [orderId, sessionId, purchaseType]);

  useEffect(() => {
    if (purchaseType !== "shop" || !user?.uid || cartClearedRef.current) return;
    cartClearedRef.current = true;
    clearCart(user.uid);
  }, [purchaseType, user?.uid]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Payment received</h1>
        <p className="text-muted-foreground mb-6">
          Thank you. Your access is updating now — if something does not appear immediately, refresh
          the page in a few seconds.
        </p>
        <div className="flex flex-col gap-2">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          {purchaseType === "module" && (
            <Button variant="outline" asChild>
              <Link to="/curriculum">Go to curriculum</Link>
            </Button>
          )}
          {purchaseType === "event" && (
            <Button variant="outline" asChild>
              <Link to="/events">View events</Link>
            </Button>
          )}
          {purchaseType === "shop" && (
            <Button variant="outline" asChild>
              <Link to="/shop">Back to shop</Link>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export function PaymentCancelPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    trackEvent(
      WEB_ANALYTICS_EVENTS.PAYMENT_FAILED,
      {
        order_id: orderId,
        reason: "user_cancelled",
      },
      { dedupe_key: orderId ?? "payment_cancel" }
    );
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Checkout cancelled</h1>
        <p className="text-muted-foreground mb-6">
          No charge was made. You can try again whenever you are ready.
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </Card>
    </div>
  );
}

export function PaymentSuccessLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-12 h-12 animate-spin text-accent" />
    </div>
  );
}
