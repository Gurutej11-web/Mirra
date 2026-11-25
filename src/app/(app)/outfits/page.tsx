import { Layers } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Outfits & lookbooks" };

export default function OutfitsPage() {
  return (
    <ComingSoon
      icon={Layers}
      title="Outfits & lookbooks"
      description="Save the looks you love and group them into lookbooks."
      phase={7}
      bullets={["Saved outfits with try-on previews","Lookbooks like Date night or Interview","Wear log for each outfit","Share as a Fit Card"]}
    />
  );
}
