import { MessageCircle } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Your stylist" };

export default function StylistPage() {
  return (
    <ComingSoon
      icon={MessageCircle}
      title="Your stylist"
      description="Chat with an AI that knows every piece in your closet."
      phase={9}
      bullets={["Outfits for any occasion from what you own","Shown right on your avatar","\"What goes with this?\" for new buys","Capsule and trip planning"]}
    />
  );
}
