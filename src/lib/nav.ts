import {
  BarChart3,
  CalendarDays,
  Camera,
  Shirt,
  ShoppingBag,
  Sparkles,
  User,
  Layers,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar */
  primary?: boolean;
};

export const appNav: NavItem[] = [
  { href: "/closet", label: "Closet", icon: Shirt, primary: true },
  { href: "/try-on", label: "Try-On", icon: Sparkles, primary: true },
  { href: "/fit-check", label: "Fit Check", icon: Camera, primary: true },
  { href: "/stylist", label: "Stylist", icon: MessageCircle, primary: true },
  { href: "/outfits", label: "Outfits", icon: Layers },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User, primary: true },
];
