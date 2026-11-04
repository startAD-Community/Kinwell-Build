import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ANIMALS = ["bunny", "bear", "fox", "cat", "panda", "koala", "owl", "penguin"] as const;
export const AVATAR_COLORS = ["sage", "peach", "sky", "lavender", "butter"] as const;
export type Animal = (typeof ANIMALS)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const ANIMAL_LABEL: Record<Animal, string> = { bunny: "Bunny", bear: "Bear", fox: "Fox", cat: "Cat", panda: "Panda", koala: "Koala", owl: "Owl", penguin: "Penguin" };
export const COLOR_LABEL: Record<AvatarColor, string> = { sage: "Sage", peach: "Peach", sky: "Sky", lavender: "Lavender", butter: "Butter" };
const BG: Record<AvatarColor, string> = { sage: "#dfeadf", peach: "#f8e1d2", sky: "#dde7f1", lavender: "#e7e1f0", butter: "#f6ecc8" };

export const FAMILY_ROLES = ["Mother", "Father", "Parent", "Partner", "Grandparent", "Helper"] as const;

/** Deterministic fallback for members who never customised. */
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function resolveAvatar(m: { id?: string; name?: string; avatar?: string; avatarColor?: string }): { animal: Animal; color: AvatarColor } {
  const h = hash(m.id || m.name || "you");
  const animal = (ANIMALS as readonly string[]).includes(m.avatar || "") ? (m.avatar as Animal) : ANIMALS[h % ANIMALS.length];
  const color = (AVATAR_COLORS as readonly string[]).includes(m.avatarColor || "") ? (m.avatarColor as AvatarColor) : AVATAR_COLORS[(h >>> 3) % AVATAR_COLORS.length];
  return { animal, color };
}

/** Permission label — access, not identity. */
export function permissionLabel(role: string) {
  if (role.includes("admin")) return "Administrator";
  if (role.includes("helper")) return "Helper access";
  return "Caregiver";
}

const INK = "#3b3a36";
function Face({ animal }: { animal: Animal }): ReactNode {
  const eyes = (y = 52, dx = 9, c = INK) => <><circle cx={50 - dx} cy={y} r="3.4" fill={c} /><circle cx={50 + dx} cy={y} r="3.4" fill={c} /></>;
  const cheeks = <><circle cx="35" cy="62" r="4" fill="#f2a99a" opacity=".55" /><circle cx="65" cy="62" r="4" fill="#f2a99a" opacity=".55" /></>;
  const smile = <path d="M45 63 q5 4 10 0" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />;
  switch (animal) {
    case "bunny": return <g><ellipse cx="38" cy="22" rx="7" ry="18" fill="#fbf8f3" /><ellipse cx="62" cy="22" rx="7" ry="18" fill="#fbf8f3" /><ellipse cx="38" cy="24" rx="3.5" ry="12" fill="#f4c6c0" /><ellipse cx="62" cy="24" rx="3.5" ry="12" fill="#f4c6c0" /><circle cx="50" cy="57" r="24" fill="#fbf8f3" />{eyes()}{cheeks}<ellipse cx="50" cy="59" rx="3" ry="2.2" fill="#e8958a" />{smile}</g>;
    case "bear": return <g><circle cx="31" cy="35" r="9" fill="#a9785a" /><circle cx="69" cy="35" r="9" fill="#a9785a" /><circle cx="31" cy="35" r="4.5" fill="#d9b298" /><circle cx="69" cy="35" r="4.5" fill="#d9b298" /><circle cx="50" cy="56" r="25" fill="#b98663" />{eyes(51)}<ellipse cx="50" cy="63" rx="10" ry="8" fill="#e6c8ae" /><ellipse cx="50" cy="60" rx="3.5" ry="2.6" fill={INK} /><path d="M46 66 q4 3 8 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case "fox": return <g><path d="M28 22 L40 40 L26 44Z" fill="#e0844f" /><path d="M72 22 L60 40 L74 44Z" fill="#e0844f" /><path d="M50 82 C30 80 24 62 26 46 C34 38 66 38 74 46 C76 62 70 80 50 82Z" fill="#e8925a" /><path d="M50 82 C40 80 34 70 34 62 C42 64 46 68 50 72 C54 68 58 64 66 62 C66 70 60 80 50 82Z" fill="#fbf3ea" />{eyes(54, 10)}<ellipse cx="50" cy="70" rx="3" ry="2.3" fill={INK} /></g>;
    case "cat": return <g><path d="M28 26 L42 38 L27 48Z" fill="#c9c2b8" /><path d="M72 26 L58 38 L73 48Z" fill="#c9c2b8" /><circle cx="50" cy="57" r="24" fill="#d6cfc4" />{eyes(54, 9)}{cheeks}<path d="M48 60 h4 l-2 2.5z" fill="#e8958a" /><path d="M50 62.5 q-3 3 -6 1 M50 62.5 q3 3 6 1" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M27 58 h10 M27 63 h10 M63 58 h10 M63 63 h10" stroke={INK} strokeWidth="1.2" opacity=".5" /></g>;
    case "panda": return <g><circle cx="31" cy="34" r="9" fill={INK} /><circle cx="69" cy="34" r="9" fill={INK} /><circle cx="50" cy="56" r="25" fill="#fbf8f3" /><ellipse cx="40" cy="53" rx="6" ry="7.5" fill={INK} transform="rotate(-20 40 53)" /><ellipse cx="60" cy="53" rx="6" ry="7.5" fill={INK} transform="rotate(20 60 53)" /><circle cx="41" cy="52" r="2.2" fill="#fff" /><circle cx="59" cy="52" r="2.2" fill="#fff" /><ellipse cx="50" cy="63" rx="3.5" ry="2.5" fill={INK} />{cheeks}<path d="M46 67 q4 3 8 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
    case "koala": return <g><circle cx="27" cy="40" r="13" fill="#9fa3a6" /><circle cx="73" cy="40" r="13" fill="#9fa3a6" /><circle cx="27" cy="40" r="7" fill="#e9dfe0" /><circle cx="73" cy="40" r="7" fill="#e9dfe0" /><circle cx="50" cy="57" r="23" fill="#b0b4b7" />{eyes(53, 10)}<ellipse cx="50" cy="61" rx="6" ry="8" fill="#4f4d4b" />{cheeks}</g>;
    case "owl": return <g><path d="M30 30 L38 40 L28 42Z M70 30 L62 40 L72 42Z" fill="#8f6f55" /><ellipse cx="50" cy="57" rx="24" ry="26" fill="#a78466" /><ellipse cx="50" cy="66" rx="14" ry="14" fill="#ecdcc6" /><circle cx="40" cy="50" r="9" fill="#fbf8f3" /><circle cx="60" cy="50" r="9" fill="#fbf8f3" /><circle cx="40" cy="50" r="4" fill={INK} /><circle cx="60" cy="50" r="4" fill={INK} /><path d="M46 58 L54 58 L50 65Z" fill="#e6a84f" /></g>;
    case "penguin": return <g><ellipse cx="50" cy="56" rx="25" ry="27" fill="#3f4650" /><path d="M50 40 C36 40 32 54 34 64 C36 76 44 82 50 82 C56 82 64 76 66 64 C68 54 64 40 50 40Z" fill="#fbf8f3" />{eyes(54, 8)}{cheeks}<path d="M45 60 L55 60 L50 66Z" fill="#e8a24f" /></g>;
  }
}

const SIZE = { xs: "h-7 w-7", sm: "h-9 w-9", md: "h-11 w-11", lg: "h-16 w-16", xl: "h-24 w-24" } as const;

export function AnimalAvatar({ member, size = "md", className, decorative }: { member: { id?: string; name?: string; avatar?: string; avatarColor?: string }; size?: keyof typeof SIZE; className?: string; decorative?: boolean }) {
  const { animal, color } = resolveAvatar(member);
  const label = `${member.name || "Member"}'s avatar: ${COLOR_LABEL[color].toLowerCase()} ${ANIMAL_LABEL[animal].toLowerCase()}`;
  return (
    <svg viewBox="0 0 100 100" className={cn("shrink-0 rounded-full ring-1 ring-black/5", SIZE[size], className)} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} data-testid="img-avatar">
      <circle cx="50" cy="50" r="50" fill={BG[color]} />
      <Face animal={animal} />
    </svg>
  );
}

export function colorSwatch(c: AvatarColor) { return BG[c]; }
