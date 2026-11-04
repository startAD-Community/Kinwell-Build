import { useBoot } from "@/lib/boot";
import { byKind, ds } from "@/lib/api";
import { babyAge } from "@/lib/format";
import { subMonths } from "date-fns";

/** The selected child record is authoritative for name/birth date. Profile values are only a fallback when no record exists. */
export function useChild() {
  const { boot, childId } = useBoot();
  const kids = byKind(boot.records, "child");
  const child = kids.find((k) => k.id === childId) || kids[0];
  const recordDate = ds(child, "birthDate");
  const birthDate = recordDate || (child ? "" : boot.profile.birthDate || "");
  const name = child?.title || boot.profile.childName || "";
  return { child, kids, birthDate, name, age: babyAge(birthDate), fromRecord: !!child };
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function monthsAgoISO(m: number) {
  const d = subMonths(new Date(), m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
