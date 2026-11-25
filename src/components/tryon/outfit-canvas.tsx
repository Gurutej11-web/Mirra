/* Static render of an outfit on the avatar (or on the user's photo). */
import { Avatar } from "@/components/tryon/avatar";
import { SLOTS, defaultLayer, type Layer } from "@/lib/layout";
import type { AvatarConfig, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CanvasItem = { id: string; name: string; category: Category; image_url: string | null; colors: string[] };

export function OutfitCanvas({
  items,
  layout,
  avatar,
  photoUrl,
  className,
  showAvatar = true,
}: {
  items: CanvasItem[];
  layout?: Record<string, Layer>;
  avatar?: AvatarConfig;
  photoUrl?: string | null;
  className?: string;
  showAvatar?: boolean;
}) {
  const ordered = [...items].sort(
    (a, b) => (layout?.[a.id]?.z ?? SLOTS[a.category].z) - (layout?.[b.id]?.z ?? SLOTS[b.category].z),
  );
  return (
    <div className={cn("relative aspect-[300/640] overflow-hidden", className)}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        showAvatar && <Avatar config={avatar} className="absolute inset-0 h-full w-full" />
      )}
      {ordered.map((it) => {
        const l = layout?.[it.id] ?? defaultLayer(it.category);
        const w = SLOTS[it.category].w * l.scale;
        return (
          <div
            key={it.id}
            className="absolute"
            style={{
              left: `${l.x}%`,
              top: `${l.y}%`,
              width: `${w}%`,
              transform: `translate(-50%, -50%) rotate(${l.rotate ?? 0}deg)`,
              zIndex: l.z ?? SLOTS[it.category].z,
            }}
          >
            {it.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image_url} alt={it.name} className="w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" draggable={false} />
            ) : (
              <div className="aspect-square w-full rounded-xl" style={{ background: it.colors[0] ?? "#555" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
