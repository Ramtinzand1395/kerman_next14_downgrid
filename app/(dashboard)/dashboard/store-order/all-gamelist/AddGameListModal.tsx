"use client";

import { useEffect, useState } from "react";

import { ImagePlus, Trash2, X } from "lucide-react";
import Image from "next/image";

import { toast } from "react-toastify";

import { GameItem } from "@/types";

interface Props {
  platform: string;

  editGame: GameItem | null;

  close: () => void;

  refresh: () => Promise<void>;
}

const PLATFORM_OPTIONS = [
  {
    value: "ps5",
    label: "PS5",
  },

  {
    value: "ps5Copy",
    label: "PS5 کپی خور",
  },

  {
    value: "ps4",
    label: "PS4",
  },

  {
    value: "copy",
    label: "PS4 کپی خور",
  },

  {
    value: "xbox",
    label: "Xbox",
  },
];

export default function GameFormModal({
  platform,

  editGame,

  close,

  refresh,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [removeCover, setRemoveCover] = useState(false);

  const [form, setForm] = useState({
    platform,

    name: "",

    size: "",

    price: "",

    storage: "",
  });

  useEffect(() => {
    if (editGame) {
      setForm({
        platform,

        name: editGame.name,

        size: String(editGame.size || ""),

        price: String(editGame.price || ""),

        storage: editGame.storage || "",
      });
    }
  }, [editGame, platform]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.warning("برای ذخیره بازی، نام آن را وارد کنید.");
      return;
    }

    try {
      setLoading(true);

      const method = editGame ? "PUT" : "POST";

      const body = editGame
        ? {
            itemId: editGame._id,
            platform: form.platform,
            name: form.name.trim(),
            size: form.size ? Number(form.size) : null,
            price: form.price ? Number(form.price) : null,
            storage: form.storage || null,
          }
        : {
            platform: form.platform,
            name: form.name.trim(),
            size: form.size ? Number(form.size) : null,
            price: form.price ? Number(form.price) : null,
            storage: form.storage || null,
          };

      const res = await fetch("/api/admin/store-order/game-list", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "بازی ذخیره نشد.");
      }

      const itemId = editGame?._id || data.item?._id;
      if (coverFile && itemId) {
        const coverData = new FormData();
        coverData.set("platform", form.platform);
        coverData.set("file", coverFile);
        const coverResponse = await fetch(
          `/api/admin/store-order/game-list/${itemId}/image`,
          { method: "POST", body: coverData },
        );
        const coverResult = await coverResponse.json();
        if (!coverResponse.ok) {
          throw new Error(
            coverResult.message || "اطلاعات ذخیره شد اما آپلود کاور ناموفق بود.",
          );
        }
      } else if (removeCover && editGame?.imageUrl && itemId) {
        const coverResponse = await fetch(
          `/api/admin/store-order/game-list/${itemId}/image`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: form.platform }),
          },
        );
        const coverResult = await coverResponse.json();
        if (!coverResponse.ok) {
          throw new Error(coverResult.message || "حذف کاور ناموفق بود.");
        }
      }

      toast.success(
        editGame ? "تغییرات بازی ذخیره شد." : "بازی به فهرست اضافه شد.",
      );

      await refresh();

      close();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "بازی ذخیره نشد؛ اطلاعات را بررسی و دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
fixed
inset-0
z-50
flex
items-center
justify-center
"
    >
      <div
        className="
absolute
inset-0
bg-black/50
backdrop-blur-sm
"
        onClick={close}
      />

      <div
        className="
relative
z-50
w-[95vw]
        max-w-xl
rounded-3xl
bg-white
p-6
shadow-xl
"
      >
        <button
          onClick={close}
          className="
absolute
left-5
top-5
text-gray-500
hover:text-red-500
"
        >
          <X size={20} />
        </button>

        <h2
          className="
text-xl
font-black
text-gray-800
"
        >
          {editGame ? "ویرایش بازی" : "افزودن بازی"}
        </h2>

        <div
          className="
mt-6
space-y-4
"
        >
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Image
                src={
                  coverPreview ||
                  (!removeCover ? editGame?.imageUrl : null) ||
                  "/images/game-cover-placeholder.svg"
                }
                alt={form.name ? `پیش‌نمایش کاور ${form.name}` : "پیش‌نمایش کاور"}
                width={112}
                height={112}
                unoptimized
                className="h-28 w-28 shrink-0 rounded-2xl border bg-slate-100 object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700">
                  <ImagePlus size={18} />
                  {editGame?.imageUrl ? "جایگزینی کاور" : "انتخاب کاور"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        toast.warning("حجم کاور باید کمتر از ۵ مگابایت باشد.");
                        event.target.value = "";
                        return;
                      }
                      setCoverFile(file);
                      setRemoveCover(false);
                    }}
                  />
                </label>
                {(editGame?.imageUrl || coverFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setRemoveCover(Boolean(editGame?.imageUrl));
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} /> حذف کاور
                  </button>
                )}
                <p className="text-xs leading-5 text-gray-500">
                  JPG، PNG یا WebP؛ حداکثر ۵ مگابایت
                </p>
              </div>
            </div>
          </div>

          <select
            value={form.platform}
            disabled={!!editGame}
            onChange={(e) =>
              setForm({
                ...form,

                platform: e.target.value,
              })
            }
            className="
w-full
rounded-xl
border
p-3
"
          >
            {PLATFORM_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <input
            placeholder="
نام بازی
"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,

                name: e.target.value,
              })
            }
            className="
w-full
rounded-xl
border
p-3
"
          />

          <input
            type="number"
            placeholder="
حجم بازی GB
"
            value={form.size}
            onChange={(e) =>
              setForm({
                ...form,

                size: e.target.value,
              })
            }
            className="
w-full
rounded-xl
border
p-3
"
          />

          <input
            type="number"
            placeholder="
قیمت
"
            value={form.price}
            onChange={(e) =>
              setForm({
                ...form,

                price: e.target.value,
              })
            }
            className="
w-full
rounded-xl
border
p-3
"
          />

          <input
            placeholder="
فضای ذخیره‌سازی
"
            value={form.storage}
            onChange={(e) =>
              setForm({
                ...form,

                storage: e.target.value,
              })
            }
            className="
w-full
rounded-xl
border
p-3
"
          />

          <button
            disabled={loading}
            onClick={submit}
            className="
mt-3
w-full
rounded-xl
bg-emerald-600
py-3
font-bold
text-white
disabled:opacity-50
"
          >
            {loading
              ? "در حال ثبت…"
              : editGame
                ? "ذخیره تغییرات"
                : "افزودن بازی"}
          </button>
        </div>
      </div>
    </div>
  );
}
