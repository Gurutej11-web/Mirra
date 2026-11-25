import { ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Welcome" };

/** Placeholder until the style quiz lands in phase 3. */
export default function OnboardingPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12 text-center">
      <div className="max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Sparkles className="mx-auto mt-12 size-10 text-accent" />
        <h1 className="mt-5 font-display text-5xl tracking-tight">You&apos;re in.</h1>
        <p className="mt-3 text-fg-muted">
          Your closet is ready. The style quiz that builds your Style DNA is coming next.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/closet" size="lg">
            Go to my closet <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
