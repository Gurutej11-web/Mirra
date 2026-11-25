/** Achievement badges, computed from stats (no extra tables needed). */
export type BadgeStats = {
  items: number;
  outfits: number;
  fitChecks: number;
  bestScore: number;
  paletteDone: boolean;
  streak: number;
  longestStreak: number;
  wornShare: number; // 0..1 of items worn at least once
  valueHunter: boolean;
  trips: number;
  stylistChats: number;
};

export type Badge = { id: string; emoji: string; name: string; desc: string; earned: boolean; progress?: string };

export function computeBadges(s: BadgeStats): Badge[] {
  const b = (id: string, emoji: string, name: string, desc: string, earned: boolean, progress?: string): Badge => ({ id, emoji, name, desc, earned, progress });
  return [
    b("first", "🧺", "First Steps", "Add your first piece", s.items >= 1),
    b("curator", "🗂️", "Curator", "Catalog 25 pieces", s.items >= 25, `${Math.min(s.items, 25)}/25`),
    b("archivist", "🏛️", "Archivist", "Catalog 100 pieces", s.items >= 100, `${Math.min(s.items, 100)}/100`),
    b("palette", "🎨", "Color Coded", "Find your color season", s.paletteDone),
    b("mirror", "🪞", "Mirror Mirror", "Do your first Fit Check", s.fitChecks >= 1),
    b("fanatic", "📸", "Fit Fanatic", "Do 10 Fit Checks", s.fitChecks >= 10, `${Math.min(s.fitChecks, 10)}/10`),
    b("icon", "👑", "Style Icon", "Score 90+ on a Fit Check", s.bestScore >= 90, s.bestScore ? `best ${s.bestScore}` : undefined),
    b("architect", "📐", "Outfit Architect", "Save 5 outfits", s.outfits >= 5, `${Math.min(s.outfits, 5)}/5`),
    b("roll", "🔥", "On a Roll", "Log outfits 7 days in a row", s.longestStreak >= 7, `${Math.min(s.longestStreak, 7)}/7`),
    b("unstoppable", "⚡", "Unstoppable", "30-day streak", s.longestStreak >= 30, `${Math.min(s.longestStreak, 30)}/30`),
    b("rotation", "🔄", "Rotation Master", "Wear 80% of your closet", s.items >= 10 && s.wornShare >= 0.8, `${Math.round(s.wornShare * 100)}%`),
    b("value", "💎", "Value Hunter", "Get a $20+ piece under $1 per wear", s.valueHunter),
    b("trip", "🧳", "Globetrotter", "Make a packing list", s.trips >= 1),
    b("chat", "💬", "Styled", "Chat with your stylist", s.stylistChats >= 1),
  ];
}

/** Consecutive-day streak ending today (or yesterday) from a set of ISO dates. */
export function streaks(dates: string[], today: string) {
  const set = new Set(dates);
  const step = (iso: string, n: number) => {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  let current = 0;
  let cursor = set.has(today) ? today : step(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = step(cursor, -1);
  }
  let longest = 0;
  for (const d of set) {
    if (set.has(step(d, -1))) continue;
    let len = 0, c = d;
    while (set.has(c)) {
      len++;
      c = step(c, 1);
    }
    longest = Math.max(longest, len);
  }
  return { current, longest };
}
