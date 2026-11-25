import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <ComingSoon
      icon={BarChart3}
      title="Insights"
      description="See how you actually use your closet."
      phase={13}
      bullets={["Most and least worn pieces","Cost per wear and closet value","Color and category breakdown","Declutter suggestions"]}
    />
  );
}
