"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { GameItem } from "@/types";
import GameCover from "@/app/components/games/GameCover";

interface Props {
  platform: string;
  editGame: GameItem | null;
  close: () => void;
  refresh: () => Promise<void>;
}
const platforms = [["ps5", "PS5"], ["ps5Copy", "PS5 کپی خور"], ["ps4", "PS4"], ["copy", "PS4 کپی خور"], ["xbox", "Xbox"]];
const fieldClass = "w-full rounded-xl border border-slate-300 p-3 text-sm";

export default function GameFormModal({ platform, editGame, close, refresh }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus();
    return () => previous?.focus();
  }, []);
  const [form, setForm] = useState({
    platform, name: editGame?.name || "", size: String(editGame?.size ?? ""),
    price: String(editGame?.price ?? ""), storage: editGame?.storage || "",
    imageUrl: editGame?.imageUrl || "", imageAlt: editGame?.imageAlt || "", imagePublicId: editGame?.imagePublicId || "",
  });
  const busy = saving || uploading;
  const change = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const upload = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
      toast.error("تصویر JPG، PNG، WebP یا AVIF با حجم حداکثر ۵ مگابایت انتخاب کنید"); return;
    }
    setUploading(true);
    try {
      const payload = new FormData(); payload.append("file", file);
      const response = await fetch("/api/admin/store-order/game-list/cover", { method: "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "آپلود ناموفق بود");
      setForm(current => ({ ...current, imageUrl: data.url, imagePublicId: data.publicId, imageAlt: current.imageAlt || `کاور بازی ${current.name}` }));
      toast.success("کاور آپلود شد؛ برای اتصال به بازی، تغییرات را ذخیره کنید");
    } catch (error) { toast.error(error instanceof Error ? error.message : "آپلود ناموفق بود"); }
    finally { setUploading(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/store-order/game-list", {
        method: editGame ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(editGame ? { itemId: editGame._id } : {}), size: form.size === "" ? null : Number(form.size), price: form.price === "" ? null : Number(form.price), storage: form.storage || null, imageAlt: form.imageUrl ? form.imageAlt.trim() || `کاور بازی ${form.name.trim()}` : "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "ذخیره ناموفق بود");
      toast.success("بازی ذخیره شد");
      await refresh(); close();
    } catch (error) { toast.error(error instanceof Error ? error.message : "ذخیره ناموفق بود"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="game-form-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && close()} />
      <form ref={dialogRef} onSubmit={submit} onKeyDown={event => {
        if (event.key === "Escape" && !busy) close();
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')).filter(element => element.offsetParent !== null);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }} className="relative z-10 max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <button type="button" onClick={close} disabled={busy} aria-label="بستن فرم" className="absolute left-5 top-5 text-slate-500 disabled:opacity-50"><X size={20} /></button>
        <h2 id="game-form-title" className="text-xl font-black text-slate-800">{editGame ? "ویرایش بازی" : "افزودن بازی"}</h2>
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
          <label className="block text-sm">پلتفرم<select value={form.platform} disabled={!!editGame} onChange={e => change("platform", e.target.value)} className={fieldClass}>{platforms.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-sm">نام بازی<input required maxLength={250} value={form.name} onChange={e => change("name", e.target.value)} className={fieldClass} dir="auto" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">حجم (GB)<input type="number" min="0" step="any" value={form.size} onChange={e => change("size", e.target.value)} className={fieldClass} /></label>
            <label className="text-sm">قیمت (تومان)<input type="number" min="0" step="1" value={form.price} onChange={e => change("price", e.target.value)} className={fieldClass} /></label>
          </div>
          <label className="block text-sm">فضای ذخیره‌سازی<input maxLength={100} value={form.storage} onChange={e => change("storage", e.target.value)} className={fieldClass} /></label>
          <div className="space-y-3 rounded-2xl border p-3">
            <div className="flex items-center gap-3"><GameCover game={form} className="h-20 w-20" /><span className="text-sm text-slate-500">کاور بازی</span></div>
            <label className="block text-sm">آپلود کاور<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} className="mt-1 block w-full text-xs" /></label>
            <label className="block text-sm">آدرس تصویر<input type="url" value={form.imageUrl} onChange={e => setForm(current => ({ ...current, imageUrl: e.target.value, imagePublicId: "" }))} className={fieldClass} dir="ltr" placeholder="https://res.cloudinary.com/aeylqy7h/image/upload/..." /></label>
            <label className="block text-sm">متن جایگزین (alt)<input maxLength={300} value={form.imageAlt} onChange={e => change("imageAlt", e.target.value)} className={fieldClass} placeholder="کاور بازی…" /></label>
            {form.imageUrl && <button type="button" onClick={() => setForm(current => ({ ...current, imageUrl: "", imageAlt: "", imagePublicId: "" }))} className="text-sm text-red-600">حذف تصویر از این بازی</button>}
          </div>
        </fieldset>
        <button disabled={busy} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-50">{uploading ? "در حال آپلود کاور…" : saving ? "در حال ذخیره…" : "ذخیره بازی"}</button>
      </form>
    </div>
  );
}
