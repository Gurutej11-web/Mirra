import { Logo } from "@/components/brand/logo";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getSession } from "@/lib/session";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const { user, profile } = await getSession();
  const initialName = profile?.display_name || user.email?.split("@")[0] || "";

  return (
    <div className="relative min-h-dvh overflow-hidden px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-accent/10 blur-[140px]"
      />
      <div className="relative mx-auto max-w-xl">
        <Logo />
        <div className="mt-10">
          <OnboardingFlow initialName={initialName} />
        </div>
      </div>
    </div>
  );
}
