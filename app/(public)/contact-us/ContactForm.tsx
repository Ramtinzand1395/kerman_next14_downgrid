"use client";
import React, { useState } from "react";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("پیام شما با موفقیت ارسال شد!");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* فرم تماس */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-6 md:p-10 space-y-5 border border-gray-100"
      >
        <input
          type="text"
          name="name"
          placeholder="نام شما"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <input
          type="email"
          name="email"
          placeholder="ایمیل"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <textarea
          name="message"
          placeholder="پیام شما"
          value={formData.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        ></textarea>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-all"
        >
          ارسال پیام
        </button>
      </form>

      {/* اطلاعات تماس */}
      <div className="flex flex-col justify-center space-y-6 text-gray-700 bg-gray-50 p-8 rounded-2xl shadow-inner">
        <div className="flex items-center gap-3">
          <Phone className="text-blue-600" />
          <span>۰۹۳۸۳۰۷۷۲۲۵</span>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="text-blue-600" />
          <span>info@kermanatari.ir</span>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="text-blue-600" />
          <span>کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه</span>
        </div>

      </div>
    </div>
  );
}
