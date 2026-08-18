import { Link } from "react-router";
import { Smartphone, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { GET_THE_APP_PATH, MOBILE_APP_NAME } from "../lib/appStoreLinks";

/**
 * In-platform pointer to the mobile app. Deliberately links to the public
 * /get-the-app page rather than straight to a store, so there is one place that
 * decides which store a visitor is sent to and one URL to update if we re-list.
 */
export function GetTheAppCallout({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <Link
        to={GET_THE_APP_PATH}
        className="group flex items-center gap-4 p-5 transition-colors hover:bg-accent/5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-accent/10">
          <Smartphone className="h-5 w-5 text-accent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-headline block text-base font-black uppercase tracking-wider text-foreground">
            Get {MOBILE_APP_NAME}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            The alumni network on iPhone and Android — feed, groups, events and
            matching.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>
    </Card>
  );
}
