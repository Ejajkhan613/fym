import type { Metadata } from "next";
import { AppProviders } from "@/shared/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FYM Web",
    template: "%s | FYM Web",
  },
  description:
    "Find Your Medicines web UI for customers, pharmacies, riders, and admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
