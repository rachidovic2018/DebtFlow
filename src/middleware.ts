import { withAuth } from "next-auth/middleware";

// Protect all app routes; redirect unauthenticated users to /login.
// Excludes: /login, NextAuth, provider webhooks, dev simulator, cron jobs
// (cron routes self-authenticate via CRON_SECRET), and static assets.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/webhooks|api/dev|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
