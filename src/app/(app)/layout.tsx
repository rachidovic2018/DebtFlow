import { requireUser } from "@/lib/rbac";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// Auth + DB access → render per request (never statically prerender).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-60">
        <Topbar name={user.name ?? user.email ?? "User"} role={user.role} />
        <main className="min-h-[calc(100vh-4rem)] px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
