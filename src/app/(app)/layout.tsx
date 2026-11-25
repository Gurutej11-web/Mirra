import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, dbMissing, user } = await getSession();

  if (profile && !profile.onboarded) redirect("/onboarding");

  const name = profile?.display_name || user.email?.split("@")[0] || "You";

  return (
    <AppShell userName={name}>
      {dbMissing && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          The database isn&apos;t set up yet. Add <code>SUPABASE_DB_URL</code> to <code>.env.local</code> and run{" "}
          <code>npm run db:migrate</code>.
        </div>
      )}
      {children}
    </AppShell>
  );
}
