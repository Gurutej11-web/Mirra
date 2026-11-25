import {
  BarChart3,
  CalendarDays,
  Camera,
  Home,
  Layers,
  MessageCircle,
  Shirt,
  ShoppingBag,
  Sparkles,
  User,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar */
  primary?: boolean;
  /** Keyboard shortcut after pressing "g" */
  key?: string;
};

export const appNav: NavItem[] = [
  { href: "/home", label: "Home", icon: Home, primary: true, key: "h" },
  { href: "/closet", label: "Closet", icon: Shirt, primary: true, key: "c" },
  { href: "/fit-check", label: "Fit Check", icon: Camera, primary: true, key: "f" },
  { href: "/try-on", label: "Try-On", icon: Sparkles, primary: true, key: "t" },
  { href: "/stylist", label: "Stylist", icon: MessageCircle, primary: true, key: "s" },
  { href: "/outfits", label: "Outfits", icon: Layers, key: "o" },
  { href: "/planner", label: "Planner", icon: CalendarDays, key: "p" },
  { href: "/shop", label: "Shop", icon: ShoppingBag, key: "b" },
  { href: "/tools", label: "Style tools", icon: Wand2, key: "l" },
  { href: "/insights", label: "Insights", icon: BarChart3, key: "i" },
  { href: "/profile", label: "Profile", icon: User, key: "u" },
];
