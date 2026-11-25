import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Planner" };

export default function PlannerPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Planner"
      description="A weather-aware outfit of the day, a weekly plan, and packing lists."
      phase={11}
      bullets={["Daily pick based on weather and laundry","Drag outfits onto days","Repeat-outfit warnings","Trip packing list generator"]}
    />
  );
}
