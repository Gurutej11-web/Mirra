import { getSession } from "@/lib/session";
import { getCloset } from "@/lib/storage";
import { StylistChat } from "@/components/stylist/chat";
import type { ChatMessage } from "@/lib/types";

export const metadata = { title: "Stylist" };

export default async function StylistPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, profile, user } = await getSession();
  const [{ items }, { data }] = await Promise.all([
    getCloset(supabase, { includeArchived: true }),
    supabase.from("chat_messages").select("id, role, content, attached_outfits, created_at").order("created_at", { ascending: false }).limit(60),
  ]);

  return (
    <section className="mx-auto max-w-3xl">
      <StylistChat
        initial={((data ?? []) as ChatMessage[]).reverse()}
        items={items.map((i) => ({ id: i.id, name: i.name, image_url: i.image_url, color: i.colors[0] ?? null }))}
        firstName={profile?.display_name ?? user.email?.split("@")[0] ?? "there"}
        prefill={q?.slice(0, 1500)}
      />
    </section>
  );
}
