"use client";
// todo
// در موبایل وقتی ویراش زده میشه بره روش
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Mail,
  Phone,
  User,
  type LucideIcon,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import { ProfileFormPayload, UserProfileForm } from "@/types";

export default function Profile() {
  type FieldKey = keyof ProfileFormPayload;

  const [editField, setEditField] = useState<FieldKey | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<ProfileFormPayload>({
    username: "",
    gender: "",
    birthday: "",
    nationalCode: "",
    email: "",
    mobile: "",
    newsletter: true,
  });

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
          gender: user.gender || "",
          birthday: user.birthday || "",
          nationalCode: user.nationalCode || "",
          email: user.email || "",
          mobile: user.mobile || "",
          newsletter: user.newsletter ?? true,
        });
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const fields: ReadonlyArray<{ key: FieldKey; label: string; icon: LucideIcon }> = [
    { key: "username", label: "نام کاربری", icon: User },
    { key: "email", label: "ایمیل", icon: Mail },
    { key: "mobile", label: "شماره موبایل", icon: Phone },
    { key: "gender", label: "جنسیت", icon: CircleDashed },
    { key: "birthday", label: "تاریخ تولد", icon: CalendarDays },
    { key: "nationalCode", label: "کد ملی", icon: CheckCircle2 },
    { key: "newsletter", label: "خبرنامه", icon: Mail },
  ] as const;

  const completedFields = fields.filter((field) => {
    if (field.key === "newsletter") return true;
    return Boolean(formData[field.key]);
  }).length;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const name = e.target.name as FieldKey;
    setFormData({ ...formData, [name]: e.target.value });
  };

  const handleNewsletterChange = (value: boolean) => {
    setFormData({ ...formData, newsletter: value });
  };

  const handleGenderChange = (value: string) => {
    setFormData({ ...formData, gender: value });
  };

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

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              اطلاعات حساب کاربری
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              برای ویرایش، روی هر کارت اطلاعات کلیک کنید.
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {completedFields} از {fields.length} مورد تکمیل شده
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <button
                type="button"
                key={field.key}
                className={`rounded-xl border p-3 text-right transition-all ${
                  editField === field.key
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setEditField(field.key)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs text-slate-400">ویرایش</span>
                </div>
                <p className="mb-1 text-xs text-slate-500">{field.label}</p>
                <p className="truncate text-sm font-semibold text-slate-800">
                  {loading ? (
                    <Skeleton width={140} height={18} borderRadius={6} />
                  ) : field.key === "newsletter" ? (
                    formData.newsletter ? (
                      "فعال"
                    ) : (
                      "غیرفعال"
                    )
                  ) : formData[field.key] ? (
                    formData[field.key]
                  ) : (
                    "ثبت نشده"
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {!editField ? (
            <>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                پیشنهاد سریع
              </h3>
              <p className="text-xs leading-6 text-slate-600">
                برای تجربه بهتر خرید، ایمیل و کد ملی خود را تکمیل کنید تا فرآیند
                پیگیری سفارش‌ها سریع‌تر انجام شود.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                ویرایش {fields.find((f) => f.key === editField)?.label}
              </p>

              {editField === "gender" ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleGenderChange("مرد")}
                    className={`rounded-lg border p-2 ${
                      formData.gender === "مرد"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200"
                    }`}
                  >
                    مرد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderChange("زن")}
                    className={`rounded-lg border p-2 ${
                      formData.gender === "زن"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200"
                    }`}
                  >
                    زن
                  </button>
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
                  className="w-full"
                  inputClass="w-full rounded-lg border border-slate-200 p-2 text-sm"
                />
              ) : editField === "newsletter" ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleNewsletterChange(true)}
                    className={`rounded-lg border p-2 ${
                      formData.newsletter
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200"
                    }`}
                  >
                    فعال
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNewsletterChange(false)}
                    className={`rounded-lg border p-2 ${
                      !formData.newsletter
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200"
                    }`}
                  >
                    غیرفعال
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  name={editField}
                  value={String(formData[editField] ?? "")}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                  placeholder={`ویرایش ${
                    fields.find((f) => f.key === editField)?.label
                  }`}
                />
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditField(null)}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
                >
                  لغو
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  ذخیره تغییرات
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
          خرید و فروش بازی‌های پلی‌استیشن، کنسول و اکانت‌های دیجیتالی با بهترین
          قیمت در کرمان.
          <br />
          آدرس: کرمان، میدان شهدا، خیابان زینبیه، جنب داروخانه
          <br />
          شماره تماس: 09383077225
        </div>
      </div>
    </section>
  );
}
