 
import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

/** Item picture on a soft tinted background (works for cutouts and photos). */
export function ItemImage({
  src,
  alt,
  tint,
  className,
  fit = "contain",
}: {
  src: string | null;
  alt: string;
  tint?: string;
  className?: string;
  fit?: "contain" | "cover";
}) {
  return (
    <div
      className={cn("relative grid place-items-center overflow-hidden bg-surface-2", className)}
      style={tint ? { background: `radial-gradient(circle at 50% 40%, ${tint}33, var(--surface-2) 70%)` } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn("h-full w-full p-[8%]", fit === "contain" ? "object-contain" : "object-cover p-0")}
        />
      ) : (
        <Shirt className="size-1/3 text-fg-subtle" style={tint ? { color: tint } : undefined} />
      )}
    </div>
  );
}
