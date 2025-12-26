"use client";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { ArrowLeft, Smartphone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Customer } from "@/types";


interface RegisterCustomerProps {
  customerData: Customer;
  setCustomerData: React.Dispatch<React.SetStateAction<Customer>>;
}

// todo
// loading
const RegisterCustomer = ({ setCustomerData, customerData }:RegisterCustomerProps) => {
  const router = useRouter();

  const handleUserChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const inputClasses =
    "w-full px-8 py-1 text-base text-gray-700 bg-transparent rounded-lg focus:outline-none";

  const wrapperClasses =
    "relative w-auto bg-white rounded-2xl border shadow-md p-1.5 transition-all duration-150 ease-in-out hover:scale-105 hover:shadow-lg";

  const iconClasses =
    "absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none";

  const HandleCustomer = async () => {
    try {
      const res = await fetch("/api/admin/store-order/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();

      if (res.status === 201) {
        setCustomerData((prev) => ({ ...prev, _id: data.data._id }));
      }
      toast.info(data.message);
      router.push("/dashboard/store-order?step=3", {
        scroll: false,
      });
    } catch (err) {
      console.error(err);
      toast.error("خطای سرور");
    }
  };

  return (
    <div className="grid md:grid-cols-3 grid-cols-1 gap-5">
      {/* Name */}
      <div className={wrapperClasses}>
        <input
          type="text"
          name="name"
          value={customerData.name}
          onChange={handleUserChange}
          className={inputClasses}
          placeholder="نام را وارد کنید"
          disabled={!!customerData._id}
        />
        <div className={iconClasses}>
          <User size={16} color="gray" />
        </div>
      </div>

      {/* Last Name */}
      <div className={wrapperClasses}>
        <input
          type="text"
          name="lastName"
          value={customerData.lastName}
          onChange={handleUserChange}
          className={inputClasses}
          placeholder="نام خانوادگی را وارد کنید"
          disabled={!!customerData._id}
        />
        <div className={iconClasses}>
          <User size={16} color="gray" />
        </div>
      </div>

      {/* Sex */}
      <div className={wrapperClasses}>
        <select
          title="sex"
          name="sex"
          className={inputClasses}
          value={customerData.sex}
          onChange={handleUserChange}
          disabled={!!customerData.sex}
        >
          <option value="">انتخاب جنسیت</option>
          <option value="مرد">مرد</option>
          <option value="زن">زن</option>
        </select>
        <div className={iconClasses}>
          <User size={16} color="gray" />
        </div>
      </div>

      {/* Mobile */}
      <div className={wrapperClasses}>
        <input
          type="text"
          name="mobile"
          value={customerData.mobile}
          onChange={handleUserChange}
          className={inputClasses}
          placeholder="شماره تماس"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled
        />
        <div className={iconClasses}>
          <Smartphone size={16} color="gray" />
        </div>
      </div>
      {/* birday */}
      <div className={wrapperClasses}>
        {/* <label className="">تاریخ  از</label> */}
        <DatePicker
          calendarPosition="bottom-left"
          inputClass={inputClasses}
          containerStyle={{ width: "100%" }}
          style={{
            minWidth: "150px",
          }}
          calendar={persian}
          locale={persian_fa}
          value={customerData.birthday}
          placeholder="تاریخ تولد"
          onChange={(date) => {
            setCustomerData((prev) => ({
              ...prev,
              birthday: date?.toString() || "",
            }));
          }}
        />
      </div>
      {/* description */}
      <div className={wrapperClasses}>
        <textarea
          value={customerData.description}
          onChange={handleUserChange}
          name="description"
          id=""
          placeholder="توضیحات"
          className="h-6"
        ></textarea>
      </div>
      <button
        onClick={() =>
          router.push("/dashboard/store-order?step=1", { scroll: false })
        }
      >
        قبلی
      </button>
      <button
        onClick={HandleCustomer}
        className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2"
      >
        ادامه
        <ArrowLeft className="w-3 h-3" />
      </button>
    </div>
  );
};

export default RegisterCustomer;
