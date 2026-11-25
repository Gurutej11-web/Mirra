import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { ToolsTabs } from "@/components/tools/tools-tabs";

export const metadata = { title: "Style tools" };

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, profile } = await getSession();
  const { items } = await getCloset(supabase);
  return (
    <section>
      <h1 className="font-display text-5xl tracking-tight md:text-6xl">Style tools</h1>
      <p className="mt-2 text-sm text-fg-muted">Little helpers for big decisions.</p>
      <ToolsTabs
        initialTab={tab}
        items={items}
        palette={{ best: profile?.palette?.best ?? [], avoid: profile?.palette?.avoid ?? [] }}
      />
    </section>
  );
}
