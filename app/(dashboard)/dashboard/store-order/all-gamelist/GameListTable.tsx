"use client";

import { GameItem } from "@/types";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface GameListTableProps {
  title: string;
  platform: string;
  list: GameItem[];
  onChanged: () => Promise<void>;
}

const GameListTable = ({
  title,
  platform,
  list,
  onChanged,
}: GameListTableProps) => {
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [newGameName, setNewGameName] = useState("");
  const [pending, setPending] = useState(false);

  const handleEdit = (game: GameItem) => {
    setEditingGame(game);
    setNewGameName(game?.name || "");
  };

  const updateList = async () => {
    if (!editingGame || !newGameName.trim()) return;

    try {
      setPending(true);
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          itemId: editingGame._id,
          name: newGameName,
        }),
      });

      if (!res.ok) throw new Error("خطا در ویرایش");

      toast.success("بازی با موفقیت ویرایش شد");
      setEditingGame(null);
      setNewGameName("");
      await onChanged();
    } catch (err) {
      console.log(err);
      toast.error("خطا در ویرایش بازی");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    const confirmChange = window.confirm("آیا از حذف بازی مطمئن هستید؟");
    if (!confirmChange) return;

    try {
      setPending(true);
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          itemId,
        }),
      });

      if (!res.ok) throw new Error("خطا در حذف");

      const data = await res.json();
      toast.success(data.message || "بازی حذف شد");
      await onChanged();
    } catch (err) {
      console.log(err);
      toast.error("حذف بازی انجام نشد");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <h2 className="mb-3 text-base font-extrabold text-gray-800">{title}</h2>

      <div className="space-y-2">
        {list?.map((item) => (
          <div
            key={item._id}
            className="rounded-lg border border-gray-200 bg-white p-2 text-xs"
          >
            {editingGame?._id === item._id ? (
              <div className="flex items-center gap-2">
                <input
                  title="name"
                  type="text"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-gray-200 px-2"
                />

                <button
                  title="update"
                  onClick={updateList}
                  disabled={pending}
                  className="rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
                >
                  <Save size={14} />
                </button>

                <button
                  title="setEdite"
                  onClick={() => setEditingGame(null)}
                  disabled={pending}
                  className="rounded-md border border-gray-200 p-2 text-gray-600 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="line-clamp-2 font-semibold text-gray-700">
                  {item.name}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    title="edite"
                    onClick={() => handleEdit(item)}
                    className="rounded-md border border-blue-100 p-1.5 text-blue-600"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    title="delete"
                    onClick={() => handleDelete(item._id)}
                    disabled={pending}
                    className="rounded-md border border-red-100 p-1.5 text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!list?.length && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-6 text-center text-xs text-gray-400">
          بازی‌ای ثبت نشده است.
        </div>
      )}
    </div>
  );
};

export default GameListTable;
