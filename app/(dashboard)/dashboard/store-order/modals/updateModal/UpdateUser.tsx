"use client";

import { useState } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Pencil, Save } from "lucide-react";
import { toast } from "react-toastify";

import { Customer } from "@/types";
import { customerSchema } from "@/validations/CustomerAppValidation";

const fieldLabels = {
  name: "نام",
  lastName: "نام خانوادگی",
  mobile: "شماره تماس",
  sex: "جنسیت",
  birthday: "تاریخ تولد",
  description: "توضیحات",
};

type EditableCustomerFields = keyof typeof fieldLabels;

const editableFields: EditableCustomerFields[] = [
  "name",
  "lastName",
  "mobile",
  "sex",
  "birthday",
  "description",
];

interface UpdateUserProps {
  customer: Customer | null;
  setCustomer: React.Dispatch<React.SetStateAction<Customer | null>>;
  closeModal?: () => void;
}

const UpdateUser = ({ customer, setCustomer, closeModal }: UpdateUserProps) => {
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  const handleCustomerChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof Customer,
  ) => {
    setCustomer((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
  };

  const handleSaveCustomer = async (customerId: string) => {
    try {
      await customerSchema.validate(customer, { abortEarly: false });

      const res = await fetch(`/api/admin/store-order/customer/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message || "اطلاعات مشتری ذخیره شد.");
      setIsEditingCustomer(false);
     closeModal?.();
    } catch (err) {
      console.error(err);
      toast.error("خطا در ویرایش اطلاعات مشتری");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">اطلاعات مشتری</h3>
        <button
          onClick={() => setIsEditingCustomer((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" />
          {isEditingCustomer ? "لغو ویرایش" : "ویرایش"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {editableFields.map((field) => (
          <label key={field} className="space-y-1 text-sm text-slate-600">
            <span>{fieldLabels[field]}</span>

            {isEditingCustomer ? (
              field === "sex" ? (
                <select
                  title="جنسیت"
                  value={customer?.[field] || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-2"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="مرد">مرد</option>
                  <option value="زن">زن</option>
                </select>
              ) : field === "birthday" ? (
                <DatePicker
                  calendar={persian}
                  locale={persian_fa}
                  value={customer?.birthday}
                  onChange={(date) =>
                    setCustomer((prev) =>
                      prev ? { ...prev, birthday: date?.toString() ?? "" } : prev,
                    )
                  }
                  inputClass="h-10 w-full rounded-lg border border-slate-300 px-2"
                  containerStyle={{ width: "100%" }}
                />
              ) : field === "description" ? (
                <textarea
                  title="توضیحات"
                  value={customer?.description || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="min-h-24 w-full rounded-lg border border-slate-300 p-2"
                />
              ) : (
                <input
                  title="فیلد"
                  type="text"
                  value={customer?.[field] || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-2"
                />
              )
            ) : (
              <p>{customer?.[field] || "---"}</p>
            )}
          </label>
        ))}
      </div>

      {isEditingCustomer && customer?._id && (
        <button
          onClick={() => handleSaveCustomer(customer._id)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" />
          ذخیره اطلاعات مشتری
        </button>
      )}
    </section>
  );
};

export default UpdateUser;
