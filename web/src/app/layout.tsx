import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MORTAR - Phase 0",
  description: "MORTAR Foundation - Firebase Monorepo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
