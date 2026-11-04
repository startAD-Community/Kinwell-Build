import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRecord,
  updateRecord,
  deleteRecord,
  updateProfile,
  exportRecords,
  requestUpload,
  getGetBootstrapQueryKey,
  type Bootstrap,
  type FamilyRecord,
  type RecordInput,
  type RecordUpdate,
  type ProfileInput,
  type ExportInput,
} from "@workspace/api-client-react";
import { toast } from "@/hooks/use-toast";

export const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`.replace(/^\/+/, "/");

export function errStatus(e: unknown): number | undefined {
  return (e as { status?: number } | null)?.status;
}
export function errMessage(e: unknown): string {
  const data = (e as { data?: { error?: string; message?: string } } | null)?.data;
  return data?.error || data?.message || (e as Error)?.message || "Something went wrong";
}

function ensureOnline() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("You're offline. Nothing was saved — changes need a connection in this prototype.");
  }
}

export function useRecords() {
  const qc = useQueryClient();
  const key = getGetBootstrapQueryKey();
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => {
    if (errStatus(e) === 409) return;
    toast({ title: "Not saved", description: errMessage(e), variant: "destructive" });
  };
  const create = useMutation({
    mutationFn: async (d: RecordInput) => {
      ensureOnline();
      return createRecord(d);
    },
    onSuccess: inv,
    onError,
  });
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecordUpdate }) => {
      ensureOnline();
      return updateRecord(id, data);
    },
    onSuccess: inv,
    onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      ensureOnline();
      return deleteRecord(id);
    },
    onSuccess: inv,
    onError,
  });
  return { create, update, remove };
}

export function useProfileUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: ProfileInput) => {
      ensureOnline();
      return updateProfile(d);
    },
    onSuccess: (b: Bootstrap) => {
      qc.setQueryData(getGetBootstrapQueryKey(), b);
      qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
    },
    onError: (e) => toast({ title: "Not saved", description: errMessage(e), variant: "destructive" }),
  });
}

async function jsonFetch(path: string, method: string, body: unknown) {
  ensureOnline();
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
    Object.assign(err, { status: res.status, data });
    throw err;
  }
  return data;
}

export function useMemberAdmin() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
  const onError = (e: unknown) => toast({ title: "Not changed", description: errMessage(e), variant: "destructive" });
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: string; grants?: string[]; expiresAt?: string | null; confirmTransfer?: boolean } }) =>
      jsonFetch(`/together/members/${id}`, "PATCH", body),
    onSuccess: inv,
    onError,
  });
  const transfer = useMutation({
    mutationFn: (targetMemberId: string) => jsonFetch(`/together/transfer`, "POST", { targetMemberId, confirmed: true }),
    onSuccess: inv,
    onError,
  });
  return { patch, transfer };
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function runExport(input: ExportInput, download = true) {
  ensureOnline();
  const res = await exportRecords(input);
  if (download) downloadText(res.filename.replace(/^together/i, "kinwell"), res.content, res.mimeType);
  return res;
}

export const UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "text/plain"];
export const UPLOAD_MAX = 10 * 1024 * 1024;

export function validateFile(f: File): string | null {
  if (!UPLOAD_TYPES.includes(f.type)) return "Use a PDF, JPEG, PNG or plain-text file.";
  if (f.size > UPLOAD_MAX) return "Files must be 10 MB or smaller.";
  if (f.size === 0) return "That file looks empty.";
  return null;
}

export async function uploadDocument(file: File, scope: "private" | "baby", label: string, notes?: string) {
  ensureOnline();
  const bad = validateFile(file);
  if (bad) throw new Error(bad);
  const up = await requestUpload({ name: file.name, size: file.size, contentType: file.type, scope });
  const put = await fetch(up.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("The file didn't upload. Please try again.");
  return updateRecord(up.documentId, {
    title: label || file.name,
    notes,
    status: "ready",
    data: { objectPath: up.objectPath, contentType: file.type, size: file.size, fileName: file.name },
  });
}

export const documentUrl = (id: string) => `/api/together/documents/${id}/file`;

/* ---------- record helpers ---------- */
export type Rec = FamilyRecord;
export function dget<T = unknown>(r: Rec | undefined | null, k: string): T | undefined {
  return (r?.data as Record<string, unknown> | undefined)?.[k] as T | undefined;
}
export function ds(r: Rec | undefined | null, k: string): string {
  const v = dget(r, k);
  return v === undefined || v === null ? "" : String(v);
}
export function when(r: Rec) {
  return r.occurredAt || r.createdAt;
}
export function byKind(records: Rec[], ...kinds: string[]) {
  return records
    .filter((r) => kinds.includes(r.kind))
    .sort((a, b) => +new Date(when(b)) - +new Date(when(a)));
}
export function edited(r: Rec) {
  return Math.abs(+new Date(r.updatedAt) - +new Date(r.createdAt)) > 2000;
}

export function useAccountActions() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: getGetBootstrapQueryKey() });
  const onError = (e: unknown) => toast({ title: "Not completed", description: errMessage(e), variant: "destructive" });
  const acceptTransfer = useMutation({
    mutationFn: (id: string) => jsonFetch(`/together/transfer/${id}/accept`, "POST", { confirmed: true }),
    onSuccess: inv,
    onError,
  });
  const deleteMyAccount = useMutation({
    mutationFn: async () => {
      ensureOnline();
      const res = await fetch(`/api/together/account`, { method: "DELETE", credentials: "include", headers: { "x-confirm-delete": "delete-my-private-data" } });
      if (!res.ok) throw new Error(`Deletion failed (${res.status})`);
    },
    onError,
  });
  return { acceptTransfer, deleteMyAccount };
}

export function clearLocalData() {
  Object.keys(localStorage).filter((k) => k.startsWith("together.")).forEach((k) => localStorage.removeItem(k));
}
