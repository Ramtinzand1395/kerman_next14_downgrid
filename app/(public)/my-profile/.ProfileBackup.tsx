"use client";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ProfileFormPayload, UserProfileForm } from "@/types";
import DateObject from "react-date-object";
import Skeleton from "react-loading-skeleton";
// todo
// !فرم ولیدیشن
// !خبرنامه
// !تغییر شماره موبایل
// !درست کردن سایدبار
export default function Profile() {
  const [editField, setEditField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<ProfileFormPayload>({
    username: "",
    gender: "",
    birthday: "",
    nationalCode: "",
    email: "",
    mobile: "",
    newsletter: true, // مقدار اولیه خبرنامه
  });

  // مقداردهی اولیه از session
  async function getUserByMobile() {
    const res = await fetch(`/api/profile/account`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "خطا در دریافت کاربر");
    }
    return res.json();
  }
  useEffect(() => {
    getUserByMobile()
      .then((user) => {
        setFormData({
          username: user.username || "",
          gender: user.gender,
          birthday: user.birthday || "",
          nationalCode: user.nationalCode || "",
          email: user.email || "",
          mobile: user.mobile || "",
          newsletter: user.newsletter ?? true, // مقداردهی اولیه از سرور
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  // تمام فیلدها
  const fields = [
    { key: "username", label: "نام کاربری" },
    { key: "email", label: "ایمیل" },
    { key: "mobile", label: "شماره موبایل" },
    { key: "gender", label: "جنسیت" },
    { key: "birthday", label: "تاریخ تولد" },
    { key: "nationalCode", label: "کد ملی" },
    { key: "newsletter", label: "خبرنامه" },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleNewsletterChange = (value: boolean) => {
    setFormData({ ...formData, newsletter: value });
  };
  const handleGenderChange = (value: string) => {
    setFormData({ ...formData, gender: value });
  };

  // ---------- API ----------------
  async function updateProfileInfo(data: UserProfileForm) {
    const res = await fetch("/api/profile/account", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  const handleSave = async () => {
    if (!editField) return;
    const res = await updateProfileInfo(formData as unknown as UserProfileForm);

    if (res.success) {
      toast.success("اطلاعات با موفقیت ذخیره شد");
      setEditField(null);
    } else {
      toast.error(res.error || "خطا در ذخیره اطلاعات");
    }
  };

  // -----------------------------------------------------

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm">
      {/* نمایش اطلاعات */}
      <div className="border p-4 rounded-xl shadow space-y-3 bg-white">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex justify-between items-center p-2 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => setEditField(field.key)}
          >
            <p className="text-gray-600">{field.label}</p>
            <p className="text-gray-800">
              {loading ? (
                <Skeleton
                  width={160}
                  height={20}
                  baseColor="#dbeafe" // آبی بسیار ملایم
                  highlightColor="#bfdbfe" // آبی روشن‌تر برای افکت زیبا
                  borderRadius={8}
                />
              ) : field.key === "newsletter" ? (
                formData.newsletter ? (
                  "فعال"
                ) : (
                  "غیرفعال"
                )
              ) : formData[field.key as keyof typeof formData] ? (
                formData[field.key as keyof typeof formData]
              ) : (
                `برای ثبت ${field.label} کلیک کنید`
              )}
            </p>
          </div>
        ))}
      </div>

      {/* فرم ادیت */}
      {editField && (
        <div className="border p-4 rounded-xl shadow bg-white min-h-[100px] h-fit">
          <div className="space-y-3">
            <p className="font-semibold text-gray-700 mb-2">
              ویرایش {fields.find((f) => f.key === editField)?.label}
            </p>

            {editField === "gender" ? (
              <div className="flex gap-5">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="مرد"
                    checked={formData.gender === "مرد"}
                    onChange={() => handleGenderChange("مرد")}
                  />
                  مرد
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="زن"
                    checked={formData.gender === "زن"}
                    onChange={() => handleGenderChange("زن")}
                  />
                  زن
                </label>
              </div>
            ) : editField === "birthday" ? (
              <DatePicker
                value={formData.birthday || ""}
                onChange={(date: DateObject | null) =>
                  setFormData({
                    ...formData,
                    birthday: date?.format?.("YYYY-MM-DD") ?? "",
                  })
                }
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                className="w-full p-2 border rounded"
              />
            ) : editField === "newsletter" ? (
              <div className="flex gap-5">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="newsletter"
                    value="true"
                    checked={formData.newsletter === true}
                    onChange={() => handleNewsletterChange(true)}
                  />
                  فعال
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="newsletter"
                    value="false"
                    checked={formData.newsletter === false}
                    onChange={() => handleNewsletterChange(false)}
                  />
                  غیرفعال
                </label>
              </div>
            ) : (
              <input
                type="text"
                name={editField}
                value={String(
                  formData[editField as keyof typeof formData] ?? ""
                )}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder={`ویرایش ${
                  fields.find((f) => f.key === editField)?.label
                }`}
              />
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditField(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                لغو
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {!editField && (
        <div className="flex flex-col gap-5">
          <p className="">
            خرید و فروش بازی‌های پلی‌استیشن، کنسول و اکانت‌های دیجیتالی با
            بهترین قیمت در کرمان.
          </p>
          <p>آدرس: کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه</p>
          <p>شماره تماس: 09383077225</p>
        </div>
      )}
    </div>
  );
}
