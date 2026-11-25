import type { AvatarConfig } from "@/lib/types";

export const SKIN_TONES = ["#f6dcc8", "#eec3a2", "#d9a37c", "#c08660", "#a26a45", "#7d4e33", "#5c3824", "#3e2618"];
export const HAIR_COLORS = ["#0f0d0d", "#2a1d14", "#4a3020", "#7a4e2d", "#b08850", "#d8c08a", "#8a8a8a", "#b23a2a"];
export const HAIR_STYLES = ["short", "buzz", "medium", "long", "curly", "bun"] as const;
export const BODY_SHAPES = ["slim", "average", "broad", "curvy"] as const;

export const DEFAULT_AVATAR: Required<AvatarConfig> = {
  skin: "#c08660",
  hair: "#2a1d14",
  hairStyle: "short",
  body: "average",
};

/** Stylized 2D mannequin. viewBox is 300×640; clothing layers sit on top of it. */
export function Avatar({ config, className }: { config?: AvatarConfig; className?: string }) {
  const c = { ...DEFAULT_AVATAR, ...config };
  const sh = { slim: 0, average: 8, broad: 18, curvy: 6 }[c.body]; // shoulder extra
  const hip = { slim: 0, average: 6, broad: 8, curvy: 20 }[c.body];
  const skin = c.skin;
  const shade = "rgba(0,0,0,0.12)";

  return (
    <svg viewBox="0 0 300 640" className={className} aria-hidden>
      {/* legs */}
      <path d={`M${118 - hip / 2} 330 L${110 - hip / 3} 600 L140 600 L148 360 L152 360 L160 600 L${190 + hip / 3} 600 L${182 + hip / 2} 330 Z`} fill={skin} />
      <path d="M148 360 L152 360 L150 600" stroke={shade} strokeWidth="2" fill="none" />
      {/* feet */}
      <ellipse cx="124" cy="606" rx="20" ry="8" fill={skin} />
      <ellipse cx="176" cy="606" rx="20" ry="8" fill={skin} />
      {/* arms */}
      <path d={`M${92 - sh} 150 Q${70 - sh} 240 ${74 - sh} 330 L${88 - sh} 332 Q${92 - sh / 2} 250 ${108 - sh / 2} 175 Z`} fill={skin} />
      <path d={`M${208 + sh} 150 Q${230 + sh} 240 ${226 + sh} 330 L${212 + sh} 332 Q${208 + sh / 2} 250 ${192 + sh / 2} 175 Z`} fill={skin} />
      <circle cx={81 - sh} cy="338" r="10" fill={skin} />
      <circle cx={219 + sh} cy="338" r="10" fill={skin} />
      {/* torso */}
      <path
        d={`M${96 - sh} 142 Q150 128 ${204 + sh} 142 L${196 + sh / 2} 230 Q${190 + hip / 3} 280 ${184 + hip / 2} 336 L${116 - hip / 2} 336 Q${110 - hip / 3} 280 ${104 - sh / 2} 230 Z`}
        fill={skin}
      />
      {/* neck */}
      <rect x="138" y="104" width="24" height="34" rx="8" fill={skin} />
      <path d="M138 128 Q150 136 162 128" stroke={shade} strokeWidth="3" fill="none" />
      {/* head */}
      <ellipse cx="150" cy="74" rx="34" ry="42" fill={skin} />
      <Hair style={c.hairStyle} color={c.hair} />
      {/* face hints */}
      <ellipse cx="137" cy="78" rx="3" ry="3.5" fill="rgba(0,0,0,0.55)" />
      <ellipse cx="163" cy="78" rx="3" ry="3.5" fill="rgba(0,0,0,0.55)" />
      <path d="M141 96 Q150 101 159 96" stroke="rgba(0,0,0,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Hair({ style, color }: { style: AvatarConfig["hairStyle"]; color: string }) {
  switch (style) {
    case "buzz":
      return <path d="M117 66 Q118 30 150 30 Q182 30 183 66 Q176 48 150 46 Q124 48 117 66 Z" fill={color} opacity="0.85" />;
    case "medium":
      return <path d="M112 90 Q106 26 150 24 Q194 26 188 90 Q186 60 176 50 Q150 58 122 50 Q114 62 112 90 Z" fill={color} />;
    case "long":
      return <path d="M110 160 Q98 40 150 24 Q202 40 190 160 L180 160 Q186 80 176 54 Q150 60 124 54 Q114 80 120 160 Z" fill={color} />;
    case "curly":
      return (
        <g fill={color}>
          {[[120, 46], [134, 34], [150, 30], [166, 34], [180, 46], [114, 62], [186, 62], [127, 38], [173, 38]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="14" />
          ))}
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <circle cx="150" cy="22" r="16" />
          <path d="M116 70 Q114 32 150 32 Q186 32 184 70 Q178 48 150 46 Q122 48 116 70 Z" />
        </g>
      );
    default:
      return <path d="M115 72 Q110 28 150 26 Q190 28 185 72 Q182 50 168 44 Q150 52 128 44 Q118 52 115 72 Z" fill={color} />;
  }
}
