"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

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

  // const submit = async () => {
  //   if (!form.name.trim()) {
  //     toast.warning("نام بازی الزامی است");

  //     return;
  //   }

  //   try {
  //     setLoading(true);

  //     const method = editGame ? "PUT" : "POST";

  //     const body = editGame
  //       ? {
  //           platform,

  //           itemId: editGame._id,

  //           ...form,
  //         }
  //       : form;

  //     const res = await fetch("/api/admin/store-order/game-list", {
  //       method,

  //       headers: {
  //         "Content-Type": "application/json",
  //       },

  //       body: JSON.stringify(body),
  //     });

  //     if (!res.ok) throw new Error();

  //     toast.success(editGame ? "ویرایش شد" : "بازی اضافه شد");

  //     await refresh();

  //     close();
  //   } catch (error) {
  //     console.log(error);

  //     toast.error("عملیات انجام نشد");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.warning("نام بازی الزامی است");
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
        throw new Error(data.message || "خطا");
      }

      toast.success(
        editGame ? "بازی با موفقیت ویرایش شد" : "بازی با موفقیت اضافه شد",
      );

      await refresh();

      close();
    } catch (error) {
      console.log(error);
      toast.error("عملیات انجام نشد");
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
max-w-lg
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
Storage
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
              ? "در حال ثبت..."
              : editGame
                ? "ذخیره تغییرات"
                : "افزودن بازی"}
          </button>
        </div>
      </div>
    </div>
  );
}
