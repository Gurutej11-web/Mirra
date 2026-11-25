import { Shirt } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Your closet" };

export default function ClosetPage() {
  return (
    <ComingSoon
      icon={Shirt}
      title="Your closet"
      description="Every piece you own, beautifully cut out, auto-tagged and searchable."
      phase={4}
      bullets={["Add by photo, outfit photo, or product link","Automatic background removal","AI tags: category, colors, season, formality","Filters, color view and cost-per-wear"]}
    />
  );
}
