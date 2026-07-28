"use client";

import { Pencil, Trash2 } from "lucide-react";

import { toast } from "react-toastify";

import { GameItem } from "@/types";

interface Props {
  title: string;

  platform: string;

  list: GameItem[];

  onChanged: () => Promise<void>;

  onEdit: (game: GameItem) => void;
}

export default function GameListTable({
  title,

  platform,

  list,

  onChanged,

  onEdit,
}: Props) {
  const deleteGame = async (game: GameItem) => {
    const confirmDelete = confirm(`آیا بازی ${game.name} حذف شود؟`);

    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          platform,

          itemId: game._id,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("بازی حذف شد");

      await onChanged();
    } catch (error) {
      console.log(error);

      toast.error("حذف بازی انجام نشد");
    }
  };

  return (
    <div
      className="
w-full
"
    >
      <div
        className="
flex
items-center
justify-between
bg-gray-50
px-5
py-4
"
      >
        <h2
          className="
font-black
text-gray-800
"
        >
          {title}
        </h2>

        <span
          className="
rounded-lg
bg-blue-100
px-3
py-1
text-xs
font-bold
text-blue-700
"
        >
          {list.length}
          بازی
        </span>
      </div>

      <div
        className="
overflow-x-auto
"
      >
        <table
          className="
w-full
text-right
text-sm
"
        >
          <thead
            className="
bg-gray-100
text-gray-600
"
          >
            <tr>
              <th
                className="
px-5
py-4
"
              >
                نام بازی
              </th>

              <th
                className="
px-5
py-4
"
              >
                حجم
              </th>

              <th
                className="
px-5
py-4
"
              >
                Storage
              </th>

              <th
                className="
px-5
py-4
"
              >
                قیمت
              </th>

              <th
                className="
px-5
py-4
"
              >
                عملیات
              </th>
            </tr>
          </thead>

          <tbody>
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="
py-10
text-center
text-gray-400
"
                >
                  بازی‌ای ثبت نشده است
                </td>
              </tr>
            ) : (
              list.map((game) => (
                <tr
                  key={game._id}
                  className="
border-t
hover:bg-gray-50
transition
"
                >
                  <td
                    className="
px-5
py-4
font-bold
text-gray-800
"
                  >
                    {game.name}
                  </td>

                  <td
                    className="
px-5
py-4
"
                  >
                    {game.size ? `${game.size} GB` : "-"}
                  </td>

                  <td
                    className="
px-5
py-4
"
                  >
                    {game.storage || "-"}
                  </td>

                  <td
                    className="
px-5
py-4
font-bold
text-emerald-600
"
                  >
                    {game.price ? `${game.price.toLocaleString()} تومان` : "-"}
                  </td>

                  <td
                    className="
px-5
py-4
"
                  >
                    <div
                      className="
flex
gap-2
"
                    >
                      <button
                        onClick={() => onEdit(game)}
                        className="
rounded-lg
bg-blue-100
p-2
text-blue-700
hover:bg-blue-200
"
                        title="ویرایش"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteGame(game)}
                        className="
rounded-lg
bg-red-100
p-2
text-red-700
hover:bg-red-200
"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
