export const CATEGORIES = ["top", "bottom", "outerwear", "shoes", "dress", "accessory", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  outerwear: "Outerwear",
  shoes: "Shoes",
  dress: "Dresses & sets",
  accessory: "Accessories",
  other: "Other",
};

export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const ITEM_STATUSES = ["clean", "dirty", "dry_cleaning"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export type Item = {
  id: string;
  user_id: string;
  name: string;
  image_path: string | null;
  cutout_path: string | null;
  category: Category;
  subcategory: string | null;
  colors: string[];
  pattern: string | null;
  material: string | null;
  formality: number | null;
  seasons: Season[];
  tags: string[];
  brand: string | null;
  price: number | null;
  source_url: string | null;
  status: ItemStatus;
  times_worn: number;
  last_worn: string | null;
  created_at: string;
  // added in 0002
  favorite: boolean;
  notes: string | null;
  purchased_on: string | null;
  archived: boolean;
  wear_goal: number | null;
};

/** Item plus a signed, displayable image URL. */
export type ItemWithImage = Item & { image_url: string | null };

export type StyleDNA = {
  primary?: string;
  secondary?: string;
  scores?: Record<string, number>;
  keywords?: string[];
  summary?: string;
  occasions?: string[];
};

export type FitPrefs = {
  tops?: string;
  bottoms?: string;
};

export type Palette = {
  season?: string;
  undertone?: "warm" | "cool" | "neutral";
  depth?: "light" | "medium" | "deep";
  contrast?: "low" | "medium" | "high";
  skin?: string;
  hair?: string;
  eyes?: string;
  best?: string[];
  avoid?: string[];
  metals?: string;
  analyzed_at?: string;
};

export type AvatarConfig = {
  skin?: string;
  hair?: string;
  hairStyle?: "short" | "buzz" | "medium" | "long" | "curly" | "bun";
  body?: "slim" | "average" | "broad" | "curvy";
};

export type Profile = {
  id: string;
  display_name: string | null;
  height_cm: number | null;
  build: string | null;
  fit_prefs: FitPrefs;
  style_dna: StyleDNA;
  palette: Palette;
  avatar_config: AvatarConfig;
  tryon_photo_path: string | null;
  favorite_colors: string[];
  banned_colors: string[];
  budget: string | null;
  roast_mode: boolean;
  onboarded: boolean;
  // added in 0002
  location: { name: string; lat: number; lon: number } | null;
  units: "metric" | "imperial";
  hide_scores: boolean;
  theme: "dark" | "light" | "system";
  // added in 0003
  monthly_budget: number | null;
};

export type Outfit = {
  id: string;
  user_id: string;
  name: string;
  item_ids: string[];
  layout: Record<string, { x: number; y: number; scale: number; rotate?: number; z?: number }>;
  occasion: string | null;
  tryon_image_path: string | null;
  lookbook_id: string | null;
  created_at: string;
  favorite: boolean;
};

export type Lookbook = { id: string; user_id: string; name: string; created_at: string };

export type FitTip = {
  title: string;
  detail: string;
  kind: "color" | "fit" | "swap" | "styling" | "accessory";
  item_id?: string | null;
  color?: string | null;
};

export type FitCheck = {
  id: string;
  user_id: string;
  photo_path: string;
  total_score: number | null;
  breakdown: Record<string, number>;
  tips: FitTip[];
  mode: "honest" | "hype" | "roast";
  occasion: string | null;
  created_at: string;
  headline: string | null;
  verdict: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attached_outfits: { name: string; item_ids: string[]; why?: string }[];
  created_at: string;
};

export type WishlistItem = {
  id: string;
  user_id: string;
  url: string | null;
  name: string | null;
  image_url: string | null;
  price: number | null;
  match_score: number | null;
  outfits_unlocked: number | null;
  created_at: string;
  verdict: string | null;
  analysis: { reasons?: string[]; similar_ids?: string[]; pairs_with?: string[] } | null;
};

export type PlannerEntry = {
  id: string;
  user_id: string;
  day: string;
  outfit_id: string | null;
  note: string | null;
};
