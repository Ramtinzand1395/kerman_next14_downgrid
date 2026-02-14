import { X } from "lucide-react";
import { useState } from "react";

import { toast } from "react-toastify";
interface AddOrderModalProps {
  setOpenModal: (value: boolean) => void;
}
const AddGameListModal = ({ setOpenModal }: AddOrderModalProps) => {
  const closeModal = () => {
    setOpenModal(false);
  };
  const [newGame, setnewGame] = useState({
    platform: "",
    name: "",
  });
  const addgamelist = async () => {
    try {
      // const { data } = await addGameList(newGame);
      const res = await fetch("/api/admin/store-order/game-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGame),
      });

      if (!res.ok) throw new Error("خطا در ویرایش");
      const data = await res.json();
      toast.success(data.message);
    } catch (err) {
      console.log(err);
    } finally {
      setOpenModal(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      ></div>

      <div className="relative z-50 md:w-[50vw] w-[90vw] bg-white rounded-2xl shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button
          title="close"
          onClick={closeModal}
          className="absolute top-4 right-4 text-black hover:text-red-500 transition"
        >
          <X size={18} />
        </button>

        {/* Body */}
        <div className="">
          <div className="flex flex-col md:flex-row items-center justify-between p-10">
            <select
              title="console"
              value={newGame.platform}
              onChange={(e) =>
                setnewGame((prev) => ({ ...prev, platform: e.target.value }))
              }
              className="border p-1 rounded-md w-full"
            >
              <option value=""> انتخاب کنسول</option>
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
                setnewGame((prev) => ({ ...prev, name: e.target.value }))
              }
              className="border p-1 rounded-md w-full mt-2"
            />
          </div>

          <button
            className="p-4 bg-green-500 rounded-md text-white m-2"
            onClick={() => addgamelist()}
          >
            افزودن به لیست
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGameListModal;
