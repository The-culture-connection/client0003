import { redirect } from "next/navigation";

export default function MobileRedirect() {
  redirect("/mobile/feed");
}
