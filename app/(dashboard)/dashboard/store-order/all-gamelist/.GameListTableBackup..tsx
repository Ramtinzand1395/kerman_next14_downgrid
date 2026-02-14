"use client";

import { GameItem } from "@/types";
import { useState } from "react";
import { toast } from "react-toastify";

interface GameListTableProps {
  title: string;
  platform: string;
  list: GameItem[];
}

const GameListTable = ({ title, platform, list }: GameListTableProps) => {
  const [editeGame, setediteGame] = useState<GameItem | null>(null);
  const [newGame, setnewGame] = useState<{
    _id: string;
    name: string;
    platform?: string;
  }>({
    _id: "",
    name: "",
    platform: "",
  });
  const handleEdite = (game: GameItem) => {
    setediteGame(game);
    setnewGame({ _id: game?._id, name: game?.name, platform: game?.platform });
  };
  const updateList = async () => {
    try {
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          itemId: newGame._id,
          name: newGame.name,
        }),
      });

      if (!res.ok) throw new Error("خطا در ویرایش");

      toast.success("بازی با موفقیت ویرایش شد");
      setediteGame(null);
    } catch (err) {
      console.log(err);
      toast.error("خطا در ویرایش بازی");
    }
  };
  const handleDelete = async (platform: string, itemId: string) => {
    const confirmChange = window.confirm(`آیا از تغییر وضعیت  مطمئن هستید؟`);
    if (!confirmChange) return;
    try {
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          itemId,
        }),
      });

      if (!res.ok) throw new Error("خطا در ویرایش");

      const data = await res.json();

      toast.success(data.message);
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <table className="min-w-full text-sm font-light text-surface border border-neutral-300">
        <thead className="border-b border-neutral-200 font-medium bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-start">نام بازی</th>
            <th className="px-4 py-2 text-start">عملیات</th>
          </tr>
        </thead>
        <tbody>
          {list?.map((item, idx) => (
            <tr key={idx} className="border-b border-neutral-200 text-xs">
              {editeGame && editeGame._id === item._id ? (
                <input
                  title="name"
                  type="text"
                  value={newGame.name}
                  onChange={(e) =>
                    setnewGame((prev) => ({
                      ...prev,
                      name: e.target.value,
                      platform,
                    }))
                  }
                  className="border px-2 py-1 w-full"
                />
              ) : (
                <td className="px-4 py-2 max-w-[220px] wrap-break-word whitespace-normal">
                  {item.name}
                </td>
              )}
              <td className="px-4 py-2 flex items-center">
                {editeGame && editeGame._id === item._id ? (
                  <button onClick={updateList} className="text-blue-600 ml-2">
                    ذخیره
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdite(item)}
                    className="text-blue-600 ml-2"
                  >
                    ویرایش
                  </button>
                )}
                <button
                  onClick={() => handleDelete(platform, item._id)}
                  className="text-red-600"
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GameListTable;
