import { Camera } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Fit Check" };

export default function FitCheckPage() {
  return (
    <ComingSoon
      icon={Camera}
      title="Fit Check"
      description="Snap what you are wearing and get an honest Fit Score with fixes."
      phase={8}
      bullets={["Score out of 100 with a 5-part breakdown","Color tips matched to your skin tone","Swaps suggested from your own closet","Score history and trend chart"]}
    />
  );
}
