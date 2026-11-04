import { useState } from "react";
import { Check } from "lucide-react";
import { AnimalAvatar, ANIMALS, AVATAR_COLORS, ANIMAL_LABEL, COLOR_LABEL, FAMILY_ROLES, colorSwatch, type Animal, type AvatarColor } from "./avatar";
import { Chip, inputCls } from "./kit";
import { cn } from "@/lib/utils";

export type Identity = { name?: string; familyRole?: string; avatar?: Animal; avatarColor?: AvatarColor };

export function FamilyRolePicker({ value, onChange, idPrefix = "fr", optional }: { value: string; onChange: (v: string) => void; idPrefix?: string; optional?: boolean }) {
  const preset = (FAMILY_ROLES as readonly string[]).includes(value);
  const [custom, setCustom] = useState(!!value && !preset);
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold" id={`${idPrefix}-label`}>Family role{optional && " (optional)"}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`${idPrefix}-label`}>
        {optional && <Chip role="radio" aria-checked={!value && !custom} active={!value && !custom} className="min-h-9 text-sm" onClick={() => { setCustom(false); onChange(""); }}>Not set</Chip>}
        {FAMILY_ROLES.map((r) => <Chip key={r} role="radio" aria-checked={!custom && value === r} active={!custom && value === r} className="min-h-9 text-sm" onClick={() => { setCustom(false); onChange(r); }} data-testid={`chip-family-role-${r.toLowerCase()}`}>{r}</Chip>)}
        <Chip role="radio" aria-checked={custom} active={custom} className="min-h-9 text-sm" onClick={() => { setCustom(true); if (preset) onChange(""); }}>Your own words</Chip>
      </div>
      {custom && <input className={cn(inputCls, "mt-2")} maxLength={40} value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Mum, Papa, Nana, Co-parent" aria-label="Custom family role" data-testid="input-family-role" />}
      <p className="mt-1 text-xs text-muted-foreground">How you'd like to be known in the family. It's a name, not a permission — it never changes what anyone can see.</p>
    </div>
  );
}

export function ProfileEditor({ value, onChange, memberId }: { value: Identity; onChange: (v: Identity) => void; memberId?: string }) {
  const set = (p: Partial<Identity>) => onChange({ ...value, ...p });
  const preview = { id: memberId, name: value.name, avatar: value.avatar, avatarColor: value.avatarColor };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl bg-muted/50 p-3" aria-live="polite">
        <AnimalAvatar member={preview} size="xl" />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight">{value.name || "Your name"}</p>
          <p className="text-sm text-muted-foreground">{value.familyRole || "Family role not set"}</p>
        </div>
      </div>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold">Name</span><input className={inputCls} value={value.name || ""} onChange={(e) => set({ name: e.target.value })} data-testid="input-profile-name" /></label>
      <FamilyRolePicker value={value.familyRole || ""} onChange={(familyRole) => set({ familyRole })} />
      <div>
        <p className="mb-1.5 text-sm font-semibold" id="animal-label">Avatar</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" role="radiogroup" aria-labelledby="animal-label">
          {ANIMALS.map((a) => {
            const on = (value.avatar || "") === a;
            return (
              <button key={a} type="button" role="radio" aria-checked={on} aria-label={ANIMAL_LABEL[a]} onClick={() => set({ avatar: a })} data-testid={`button-avatar-${a}`}
                className={cn("press flex flex-col items-center gap-1 rounded-2xl border p-1.5 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-primary bg-sage" : "border-input bg-card")}>
                <AnimalAvatar member={{ ...preview, avatar: a }} size="md" decorative />{ANIMAL_LABEL[a]}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold" id="color-label">Colour</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-label">
          {AVATAR_COLORS.map((c) => {
            const on = value.avatarColor === c;
            return (
              <button key={c} type="button" role="radio" aria-checked={on} aria-label={COLOR_LABEL[c]} onClick={() => set({ avatarColor: c })} data-testid={`button-avatar-color-${c}`}
                className={cn("press flex h-11 w-11 items-center justify-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "border-primary" : "border-transparent")} style={{ background: colorSwatch(c) }}>
                {on && <Check className="h-4 w-4 text-[#3b3a36]" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
