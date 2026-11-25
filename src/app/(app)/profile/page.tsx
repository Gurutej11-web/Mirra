import { User } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <ComingSoon
      icon={User}
      title="Profile"
      description="Your Style DNA, color palette, avatar and privacy settings."
      phase={3}
      bullets={["Style quiz results","Seasonal color palette","Avatar and try-on photo","Delete-everything privacy control"]}
    />
  );
}
