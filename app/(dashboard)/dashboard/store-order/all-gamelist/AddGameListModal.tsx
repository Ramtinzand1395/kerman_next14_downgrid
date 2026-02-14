import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface AddOrderModalProps {
  setOpenModal: (value: boolean) => void;
  onAdded: () => Promise<void>;
}

const AddGameListModal = ({ setOpenModal, onAdded }: AddOrderModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [newGame, setNewGame] = useState({
    platform: "",
    name: "",
  });

  const closeModal = () => {
    if (submitting) return;
    setOpenModal(false);
  };

  const addGameList = async () => {
    if (!newGame.platform || !newGame.name.trim()) {
      toast.warning("نام بازی و پلتفرم را کامل کنید");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGame),
      });

      if (!res.ok) throw new Error("خطا در افزودن بازی");
      const data = await res.json();

      toast.success(data.message || "بازی با موفقیت اضافه شد");
      await onAdded();
      setOpenModal(false);
    } catch (err) {
      console.log(err);
      toast.error("ثبت بازی انجام نشد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      ></div>

      <div className="relative z-50 w-[92vw] max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <button
          title="close"
          onClick={closeModal}
          className="absolute top-4 right-4 text-black hover:text-red-500 transition"
        >
          <X size={18} />
        </button>

        <h3 className="mb-1 text-lg font-extrabold text-gray-800">
          افزودن بازی جدید
        </h3>
        <p className="mb-5 text-xs text-gray-500">
          بازی را در پلتفرم صحیح ثبت کنید.
        </p>

        <div className="space-y-3">
          <select
            title="console"
            value={newGame.platform}
            onChange={(e) =>
              setNewGame((prev) => ({ ...prev, platform: e.target.value }))
            }
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
          >
            <option value="">انتخاب کنسول</option>
            <option value="ps4">PS4</option>
            <option value="ps5">PS5</option>
            <option value="copy">کپی خور</option>
            <option value="xbox">Xbox</option>
          </select>

          <input
            type="text"
            placeholder="نام بازی"
            value={newGame.name}
            onChange={(e) =>
              setNewGame((prev) => ({ ...prev, name: e.target.value }))
            }
            className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
          />
        </div>

        <button
          disabled={submitting}
          className="mt-5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={addGameList}
        >
          {submitting ? "در حال ثبت..." : "افزودن به لیست"}
        </button>
      </div>
    </div>
  );
};

export default AddGameListModal;
