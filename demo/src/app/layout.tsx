import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = {
  title: "DebtFlow CRM — Debt Settlement Operations Platform",
  description: "Premium debt settlement operations platform (demo).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Sidebar />
        <div className="pl-60">
          <Topbar />
          <main className="min-h-[calc(100vh-4rem)] px-8 py-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
