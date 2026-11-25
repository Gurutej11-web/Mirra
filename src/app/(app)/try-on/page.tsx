import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Try-On studio" };

export default function TryOnPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="Try-On studio"
      description="Mix and match pieces on your avatar — or see them on a photo of you."
      phase={7}
      bullets={["Layered 2D avatar, instant and free","Swipe through tops with bottoms locked","Side-by-side outfit compare","Realistic AI try-on (phase 10)"]}
    />
  );
}
