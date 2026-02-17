"use client";

import { ContactMessage, Notification } from "@/types/notifType";
import { toPersianDate } from "@/helpers/toPersianDate";
import { Mail, Phone, User2, X } from "lucide-react";

interface ContactModalProps {
  selected: Notification & {
    target: {
      kind: "ContactMessage";
      item: ContactMessage | string;
    };
  };
  closeModal: () => void;
}

export default function ContactModal({
  selected,
  closeModal,
}: ContactModalProps) {
  const contact = selected.target.item;

  if (!contact || typeof contact === "string") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          aria-label="بستن"
          onClick={closeModal}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl md:p-6">
          <button
            title="close"
            onClick={closeModal}
            className="absolute right-4 top-4 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <X size={18} />
          </button>

          <h3 className="mb-4 border-b border-gray-200 pb-3 text-lg font-bold text-gray-900">
            جزئیات پیام تماس
          </h3>

          <p className="text-sm text-gray-600">
            جزئیات این پیام در دسترس نیست. لطفاً دوباره بروزرسانی کنید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="بستن"
        onClick={closeModal}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl md:p-6">
        <button
          title="close"
          onClick={closeModal}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <X size={18} />
        </button>

        <h3 className="mb-4 border-b border-gray-200 pb-3 text-lg font-bold text-gray-900">
          جزئیات پیام تماس
        </h3>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">نام</p>
            <p className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900">
              <User2 size={14} /> {contact.name}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">شماره تماس</p>
            <p className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900">
              <Phone size={14} /> {contact.phone}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">ایمیل</p>
            <p className="mt-1 inline-flex items-center gap-1 font-semibold text-gray-900">
              <Mail size={14} /> {contact.email}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">زمان ثبت</p>
            <p className="mt-1 font-semibold text-gray-900">
              {toPersianDate(contact.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-700">موضوع</p>
          <p className="mt-1 font-semibold text-blue-900">{contact.subject}</p>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">متن پیام</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-800">
            {contact.message}
          </p>
        </div>
      </div>
    </div>
  );
}
