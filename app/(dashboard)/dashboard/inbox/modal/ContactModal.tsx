import { Notification } from "@/types/notifType";
import { X } from "lucide-react";
import { toPersianDate } from "@/helpers/toPersianDate";

interface ContactModalProps {
  selected: Notification & {
    target: {
      kind: "ContactMessage";
      item: {
        name: string;
        email: string;
        phone: string;
        subject: string;
        message: string;
        createdAt: string;
      };
    };
  };
  closeModal: () => void;
}

export default function ContactModal({ selected, closeModal }: ContactModalProps) {
  const contact = selected.target.item;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl md:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-lg font-bold text-gray-900">جزئیات پیام تماس</h3>
          <button title="close" onClick={closeModal} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">نام</p>
            <p className="mt-1 font-semibold text-gray-900">{contact.name}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">شماره تماس</p>
            <p className="mt-1 font-semibold text-gray-900">{contact.phone}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">ایمیل</p>
            <p className="mt-1 font-semibold text-gray-900">{contact.email}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">زمان ثبت</p>
            <p className="mt-1 font-semibold text-gray-900">{toPersianDate(contact.createdAt)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-700">موضوع</p>
          <p className="mt-1 font-semibold text-blue-900">{contact.subject}</p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">متن پیام</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800">{contact.message}</p>
        </div>
      </div>
    </div>
  );
}
