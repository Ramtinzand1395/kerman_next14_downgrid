"use client";

import { toPersianDate } from "@/helpers/toPersianDate";
import { X } from "lucide-react";

interface User {
  username: string;
  mobile: string;
  createdAt?: string;
}

interface Target {
  kind: "User";
  item: User;
}

interface UserNotification {
  _id: string;
  target: Target;
}

interface UserModalProps {
  selected: UserNotification;
  closeModal: () => void;
}

const UserModal = ({ selected, closeModal }: UserModalProps) => {
  const user = selected.target.item;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      ></div>

      <div className="relative bg-white w-[520px] rounded-2xl p-5 shadow-xl animate-fadeIn">
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute right-4 top-4"
        >
          <X size={20} />
        </button>
        <div className="mt-5 flex flex-col items-start justify-between">
          <p>نام کاربری:{user.username}</p>
          <p>شماره تماس:{user.mobile}</p>
          <p>
            تاریخ ثبت نام:{" "}
            {user.createdAt ? toPersianDate(user.createdAt) : "نامشخص"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
