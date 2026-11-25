import { LogOut, Palette, Sparkles, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, created_at").eq("id", user.id).maybeSingle()
    : { data: null };

  const name = profile?.display_name || user?.email?.split("@")[0] || "You";

  return (
    <section>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-accent font-display text-3xl text-accent-fg">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-4xl tracking-tight md:text-5xl">{name}</h1>
            <p className="text-sm text-fg-muted">{user?.email}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <Button variant="secondary" type="submit">
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </div>

      {!profile && (
        <p className="mt-6 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          Your profile table isn&apos;t set up yet. Run <code>npm run db:migrate</code> once.
        </p>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: Sparkles, title: "Style DNA", body: "Take the style quiz to unlock it.", phase: 3 },
          { icon: Palette, title: "Color palette", body: "One selfie reveals your best colors.", phase: 6 },
          { icon: User, title: "Avatar", body: "Build the avatar you try outfits on.", phase: 7 },
        ].map((c) => (
          <Card key={c.title}>
            <c.icon className="size-6 text-accent" />
            <h2 className="mt-4 text-lg font-medium">{c.title}</h2>
            <p className="mt-1 text-sm text-fg-muted">{c.body}</p>
            <Badge className="mt-4">Phase {c.phase}</Badge>
          </Card>
        ))}
      </div>
    </section>
  );
}
