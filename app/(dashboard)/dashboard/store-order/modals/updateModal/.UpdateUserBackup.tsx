"use client";

import { useState } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
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
  closeModal: () => void;
}

const UpdateUser = ({ customer, setCustomer, closeModal }: UpdateUserProps) => {
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  const handleCustomerChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof Customer
  ) => {
    setCustomer((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
  };

  const handleSaveCustomer = async (customerId: string) => {
    try {
      await customerSchema.validate(customer, { abortEarly: false });

      const res = await fetch(`/api/admin/store-order/customer/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer }), // ✅ مهم
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setIsEditingCustomer(false);
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("خطا در ویرایش کاربر");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-b-2 pb-4 mb-4">
        {editableFields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-600">
              {fieldLabels[field]}
            </label>

            {isEditingCustomer ? (
              field === "sex" ? (
                <select
                  title="جنسیت"
                  value={customer?.[field] || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="border p-1 rounded-md w-full"
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
                      prev
                        ? { ...prev, birthday: date?.toString() ?? "" }
                        : prev
                    )
                  }
                  containerStyle={{ width: "100%" }}
                />
              ) : field === "description" ? (
                <textarea
                  title="توضیحات"
                  value={customer?.description || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="border p-1 rounded-md w-full"
                />
              ) : (
                <input
                  title="فیلد ها"
                  type="text"
                  value={customer?.[field] || ""}
                  onChange={(e) => handleCustomerChange(e, field)}
                  className="border p-1 rounded-md w-full"
                />
              )
            ) : (
              <p className="mt-1">{customer?.[field] || "---"}</p>
            )}
          </div>
        ))}

        <div className="col-span-2 lg:col-span-4 flex gap-4 mt-2">
          <button
            onClick={() => setIsEditingCustomer((prev) => !prev)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
          >
            {isEditingCustomer ? "لغو ویرایش" : "ویرایش اطلاعات کاربر"}
          </button>

          {isEditingCustomer && customer?._id && (
            <button
              onClick={() => handleSaveCustomer(customer?._id)}
              className="bg-green-500 text-white px-4 py-2 rounded-md"
            >
              ذخیره
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateUser;
