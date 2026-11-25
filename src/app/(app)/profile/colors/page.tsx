import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/session";
import { ColorAnalysis } from "@/components/profile/color-analysis";

export const metadata = { title: "Color analysis" };

export default async function ColorsPage() {
  const { profile } = await getSession();
  return (
    <section>
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Profile
      </Link>
      <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">Color analysis</h1>
      <p className="mt-2 max-w-xl text-fg-muted">
        One selfie reveals your undertone and seasonal palette — the colors that make your skin glow and the ones that wash you out.
      </p>
      <div className="mt-8">
        <ColorAnalysis initial={profile?.palette ?? null} />
      </div>
    </section>
  );
}
