import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, ExternalLink, FileWarning } from "lucide-react";
import { importCycles, getGetBootstrapQueryKey } from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadText, errMessage } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { todayISO } from "@/lib/child";
import { Btn, Chip, Tag } from "@/components/kit";
import { cn } from "@/lib/utils";

const FLO_HELP = "https://help.flo.health/hc/en-us/articles/360054973811-How-do-I-get-a-copy-of-my-data";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
type Fmt = "iso" | "dmy" | "mdy";
type Row = { start: string | null; end: string | null; rawStart: string; rawEnd: string; problem?: string };

function validYMD(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const pad = (n: number) => String(n).padStart(2, "0");
export function parseDate(v: unknown, fmt: Fmt): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (fmt === "iso") {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);
    if (!m) return null;
    return validYMD(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [d, mo] = fmt === "dmy" ? [+m[1], +m[2]] : [+m[2], +m[1]];
  return validYMD(+m[3], mo, d) ? `${m[3]}-${pad(mo)}-${pad(d)}` : null;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Every array of objects in the JSON, by dotted path. No schema is assumed. */
function findArrays(node: unknown, path = "", out: { path: string; items: Record<string, unknown>[] }[] = [], depth = 0) {
  if (depth > 6) return out;
  if (Array.isArray(node)) {
    const objs = node.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
    if (objs.length) out.push({ path: path || "(top level)", items: objs });
    objs.slice(0, 1).forEach((o) => Object.entries(o).forEach(([k, v]) => findArrays(v, `${path || ""}[].${k}`, out, depth + 1)));
  } else if (node && typeof node === "object") {
    Object.entries(node as Record<string, unknown>).forEach(([k, v]) => findArrays(v, path ? `${path}.${k}` : k, out, depth + 1));
  }
  return out;
}

export function FloImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [arrays, setArrays] = useState<{ path: string; items: Record<string, unknown>[] }[] | null>(null);
  const [arrPath, setArrPath] = useState("");
  const [startCol, setStartCol] = useState("");
  const [endCol, setEndCol] = useState("");
  const [fmt, setFmt] = useState<Fmt>("iso");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const reset = () => { setFileName(""); setErr(null); setCsv(null); setArrays(null); setArrPath(""); setStartCol(""); setEndCol(""); setFmt("iso"); setConfirm(false); setResult(null); if (fileRef.current) fileRef.current.value = ""; };

  const pick = async (f?: File) => {
    reset();
    if (!f) return;
    setFileName(f.name);
    if (f.size > MAX_BYTES) return setErr("That file is over 5 MB. Try a smaller export or a CSV with just the period dates.");
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".json") && !lower.endsWith(".csv")) return setErr("Choose a .json or .csv file.");
    const text = await f.text(); // read locally in the browser — the raw file is never uploaded
    if (lower.endsWith(".csv")) {
      const rows = parseCSV(text);
      if (rows.length < 2) return setErr("No data rows found. The first row should be column names.");
      setCsv(rows);
      const h = rows[0].map((x) => x.trim().toLowerCase());
      const si = h.findIndex((x) => x === "start_date" || x === "startdate" || x === "period_start");
      const ei = h.findIndex((x) => x === "end_date" || x === "enddate" || x === "period_end");
      if (si >= 0) setStartCol(rows[0][si]);
      if (ei >= 0) setEndCol(rows[0][ei]);
    } else {
      let json: unknown;
      try { json = JSON.parse(text); } catch { return setErr("This isn't valid JSON. If it came from Flo, check you saved the file as-is."); }
      const found = findArrays(json);
      if (!found.length) return setErr("No lists of entries were found in this file.");
      setArrays(found);
    }
  };

  const columns = csv ? csv[0] : arrays?.find((a) => a.path === arrPath)?.items.slice(0, 20).reduce<string[]>((acc, o) => { Object.entries(o).forEach(([k, v]) => { if ((typeof v === "string" || typeof v === "number") && !acc.includes(k)) acc.push(k); }); return acc; }, []) || [];

  const rows: Row[] = useMemo(() => {
    if (!startCol) return [];
    const today = todayISO();
    const src: Record<string, unknown>[] = csv
      ? csv.slice(1).map((r) => Object.fromEntries(csv[0].map((h, i) => [h, r[i]])))
      : arrays?.find((a) => a.path === arrPath)?.items || [];
    const seen = new Set<string>();
    return src.map((o) => {
      const rawStart = String(o[startCol] ?? ""), rawEnd = endCol ? String(o[endCol] ?? "") : "";
      const start = parseDate(rawStart, fmt), end = endCol && rawEnd.trim() ? parseDate(rawEnd, fmt) : null;
      let problem: string | undefined;
      if (!start) problem = "Start date not recognised";
      else if (endCol && rawEnd.trim() && !end) problem = "End date not recognised";
      else if (start > today) problem = "Start date is in the future";
      else if (end && end < start) problem = "Ends before it starts";
      else if (end && end > today) problem = "End date is in the future";
      else if (seen.has(start)) problem = "Duplicate in this file";
      if (start && !problem) seen.add(start);
      return { start, end, rawStart, rawEnd, problem };
    });
  }, [csv, arrays, arrPath, startCol, endCol, fmt]);
  const good = rows.filter((r) => !r.problem).slice(0, MAX_ROWS);
  const bad = rows.filter((r) => r.problem);
  const looksAmbiguous = fmt === "iso" && rows.length > 0 && bad.length === rows.length && rows.some((r) => /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(r.rawStart.trim()));

  const submit = async () => {
    setBusy(true);
    try {
      const r = await importCycles({ confirmed: true, entries: good.map((g) => (g.end ? { startDate: g.start!, endDate: g.end } : { startDate: g.start! })) });
      setResult(r);
      await qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
      toast({ title: `Imported ${r.imported} period${r.imported === 1 ? "" : "s"}`, description: r.skipped ? `${r.skipped} skipped (already recorded or invalid).` : "Only dates were saved." });
    } catch (e) { toast({ title: "Nothing was imported", description: errMessage(e), variant: "destructive" }); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[20px] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import period dates from a file</DialogTitle>
          <DialogDescription>Kinwell doesn't connect to Flo or any other app, and never asks for your login. You bring a file; only the dates you confirm are saved.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3" data-testid="import-result">
            <p className="rounded-xl bg-sage p-4 text-[15px]"><strong>{result.imported}</strong> imported · <strong>{result.skipped}</strong> skipped (already in your history or not valid).</p>
            <p className="text-sm text-muted-foreground">They're in your own history, with the same privacy as dates you add by hand. You can now delete the export file from your device.</p>
            <Btn onClick={() => onOpenChange(false)}>Done</Btn>
          </div>
        ) : (
          <div className="space-y-5">
            <ol className="space-y-2 rounded-2xl bg-sand p-4 text-[15px]">
              <li><strong>1.</strong> In the Flo app, tap your avatar → <em>Help</em> → <em>Contact us</em>, and ask for a copy of your data. Flo sends a JSON file. <a className="inline-flex items-center gap-1 font-semibold underline" href={FLO_HELP} target="_blank" rel="noreferrer">Flo's instructions<ExternalLink className="h-3.5 w-3.5" /></a></li>
              <li><strong>2.</strong> Choose that file (or any CSV) below. It's read <strong>on this device only</strong> — the raw file is never uploaded.</li>
              <li><strong>3.</strong> Point us at the start (and optional end) date fields, check the preview, confirm.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Choose export file" data-testid="input-cycle-file" />
              <Btn onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{fileName ? "Choose another file" : "Choose file"}</Btn>
              <Btn variant="outline" onClick={() => downloadText("kinwell-period-template.csv", "start_date,end_date\n2025-01-03,2025-01-07\n2025-01-31,\n", "text/csv")}><Download className="h-4 w-4" />CSV template</Btn>
            </div>
            <p className="text-xs text-muted-foreground">JSON or CSV, up to 5 MB and {MAX_ROWS} entries. Dates should be YYYY-MM-DD (ISO timestamps are fine). Flo hasn't published its file layout, so we don't guess — you choose which fields are period dates.</p>
            {fileName && <p className="text-sm font-semibold">File: {fileName}</p>}
            {err && <p role="alert" className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"><FileWarning className="h-4 w-4 shrink-0" />{err}</p>}

            {arrays && (
              <div><p className="mb-1.5 text-sm font-semibold">Which list holds your periods?</p>
                <div className="flex flex-wrap gap-2">{arrays.map((a) => <Chip key={a.path} className="min-h-9 text-sm" active={arrPath === a.path} onClick={() => { setArrPath(a.path); setStartCol(""); setEndCol(""); }}>{a.path} ({a.items.length})</Chip>)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Pick only a list of period entries. Don't pick lists of symptoms, notes or other health dates.</p>
              </div>
            )}
            {columns.length > 0 && (
              <>
                <div><p className="mb-1.5 text-sm font-semibold">Period start date field</p><div className="flex flex-wrap gap-2">{columns.map((c) => <Chip key={c} className="min-h-9 text-sm" active={startCol === c} onClick={() => setStartCol(c)}>{c}</Chip>)}</div></div>
                <div><p className="mb-1.5 text-sm font-semibold">Period end date field (optional)</p><div className="flex flex-wrap gap-2"><Chip className="min-h-9 text-sm" active={!endCol} onClick={() => setEndCol("")}>None</Chip>{columns.filter((c) => c !== startCol).map((c) => <Chip key={c} className="min-h-9 text-sm" active={endCol === c} onClick={() => setEndCol(c)}>{c}</Chip>)}</div></div>
                <div><p className="mb-1.5 text-sm font-semibold">Date format</p><div className="flex flex-wrap gap-2">{([["iso", "YYYY-MM-DD / ISO"], ["dmy", "DD/MM/YYYY"], ["mdy", "MM/DD/YYYY"]] as const).map(([k, l]) => <Chip key={k} className="min-h-9 text-sm" active={fmt === k} onClick={() => setFmt(k)}>{l}</Chip>)}</div>
                  {looksAmbiguous && <p className="mt-1 text-xs font-semibold text-destructive">These look like slash dates. 03/04/2025 could be 3 April or 4 March — choose the format your file uses.</p>}
                </div>
              </>
            )}
            {startCol && (
              <div>
                <div className="flex flex-wrap gap-1.5"><Tag tone="sage">{good.length} ready</Tag>{bad.length > 0 && <Tag tone="warn">{bad.length} will be left out</Tag>}{rows.filter((r) => !r.problem).length > MAX_ROWS && <Tag tone="warn">Only the first {MAX_ROWS}</Tag>}</div>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-card-border bg-card p-2 text-sm" data-testid="import-preview">
                  {rows.slice(0, 60).map((r, i) => <li key={i} className={cn("flex justify-between gap-2 rounded-lg px-2 py-1", r.problem ? "bg-destructive/5 text-muted-foreground" : "")}><span>{r.start ? fmtDate(r.start) : r.rawStart || "—"}{r.end ? ` – ${fmtDate(r.end)}` : ""}</span>{r.problem && <span className="text-xs text-destructive">{r.problem}</span>}</li>)}
                  {rows.length > 60 && <li className="px-2 text-xs text-muted-foreground">…and {rows.length - 60} more</li>}
                </ul>
                <label className="mt-3 flex min-h-11 items-start gap-3 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} data-testid="checkbox-import-confirm" />Save these {good.length} start/end dates to my period history. Nothing else from the file is sent.</label>
                <Btn className="mt-2" disabled={!confirm || !good.length || busy} onClick={submit} data-testid="button-import-cycles">{busy ? "Importing…" : `Import ${good.length} dates`}</Btn>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
