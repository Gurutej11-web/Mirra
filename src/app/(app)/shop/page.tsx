import { ShoppingBag } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Smart shopping" };

export default function ShopPage() {
  return (
    <ComingSoon
      icon={ShoppingBag}
      title="Smart shopping"
      description="Know if something is worth buying before you buy it."
      phase={12}
      bullets={["\"Do I need this?\" link checker","Outfits unlocked by a new piece","Gap finder for your closet","Wishlist"]}
    />
  );
}
