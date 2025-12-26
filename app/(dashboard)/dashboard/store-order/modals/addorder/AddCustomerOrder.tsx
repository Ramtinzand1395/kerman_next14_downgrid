"use client";
import { useState } from "react";
import GameDropdown from "./GameDropdown";
import { ContrastIcon, DollarSign, X } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Customer, storeOrder } from "@/types";

type ConsoleType = "ps5" | "ps4" | "xbox" | "copy";

interface AddCustomerOrderProps {
  customerData: Customer;
  closeModal: () => void;
  setOrders: React.Dispatch<
    React.SetStateAction<{
      ps5: storeOrder[];
      ps4: storeOrder[];
      xbox: storeOrder[];
      copy: storeOrder[];
    }>
  >;
}

const AddCustomerOrder = ({
  customerData,
  closeModal,
  setOrders,
}: AddCustomerOrderProps) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [Order, setOrder] = useState<storeOrder | null>({
    _id: "",
    list: [],
    price: null,
    customerId: customerData._id,
    description: "",
    consoleType: "",
    deliveryStatus: "",
    createdAt: "",
    updatedAt: "",
    deliveryCode: "",
    deliveryDate: "",
  });
  const handleSubmite = async () => {
    // todo
    // validation

    //   try {
    //     mobileSchema.validateSync(customerData.mobile, { abortEarly: false });
    //   } catch (err) {
    //     if (err instanceof yup.ValidationError) {
    //       err.inner.forEach((e) => toast.error(e.message));
    //     } else {
    //       toast.error("خطای ناشناخته");
    //     }
    //     return;
    //   }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/store-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Order),
      });

      const data = await res.json();
      toast.info(data.message);

      toast.success(data.sms.body);
      closeModal();
      router.push("/dashboard/store-order");
      const consoleType = data.order.consoleType as ConsoleType;
      setOrders((prev) => ({
        ...prev,
        [consoleType]: [data.order, ...(prev[consoleType] || [])],
      }));
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "price") {
      const numericValue = value.replace(/,/g, "");
      if (!/^\d*$/.test(numericValue)) return;

      // setOrder((prev) => ({
      //   ...prev,
      //   price: numericValue === "" ? null : Number(numericValue),
      // }));
      setOrder((prev) => {
        if (!prev) return prev; // do nothing if null
        return {
          ...prev,
          price: numericValue === "" ? null : Number(numericValue),
        };
      });
    } else {
      // setOrder((prev) => ({
      //   ...prev,
      //   [name]: value,
      // }));
      setOrder((prev) => {
        if (!prev) return prev; // do nothing if state is null
        return {
          ...prev,
          [name]: value,
        };
      });
    }
  };

  const removeGame = (gameToRemove: string) => {
    // setOrder((prev) => ({
    //   ...prev,
    //   list: prev?.list.filter((g) => g !== gameToRemove),
    // }));
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        list: prev.list.filter((g) => g !== gameToRemove),
      };
    });
  };

  const inputClasses =
    "w-full px-8 py-1 text-base text-gray-700 bg-transparent rounded-lg focus:outline-none";

  const wrapperClasses =
    "relative w-auto bg-white border rounded-2xl shadow-md p-1.5 transition-all duration-150 ease-in-out hover:scale-105 hover:shadow-lg";

  const iconClasses =
    "absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none";

  function formatNumber(value: number | null) {
    if (value === null || value === undefined) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return (
    <>
      <div className="grid md:grid-cols-3 grid-cols-1 gap-5">
        {/* Price */}
        <div className={wrapperClasses}>
          <input
            type="text"
            name="price"
            value={formatNumber(Order!.price)}
            onChange={handleOrderChange}
            className={inputClasses}
            placeholder=" قیمت (  تومان  ) "
          />
          <div className={iconClasses}>
            <DollarSign size={20} color="gray" />
          </div>
        </div>

        {/* Console Type */}
        <div className={wrapperClasses}>
          <select
            title="select"
            name="consoleType"
            value={Order?.consoleType}
            onChange={handleOrderChange}
            className={inputClasses}
          >
            <option value=""> نوع دستگاه</option>
            <option value="ps4">ps4</option>
            <option value="ps5">ps5</option>
            <option value="copy">کپی خور</option>
            <option value="xbox">Xbox</option>
          </select>
          <div className={iconClasses}>
            <ContrastIcon size={20} color="gray" />
          </div>
        </div>
        <GameDropdown Selectedgames={Order} setSelectedgames={setOrder} />
      </div>
      <h3 className="font-bold my-2">لیست بازی‌ها:</h3>
      <div className="mt-4 overflow-y-auto md:overflow-y-hidden md:h-auto">
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ">
          {Order?.list.map((game, idx) => (
            <li
              key={idx}
              className="bg-white w-full my-2 shadow-md border text-black px-3 py-1 rounded-2xl flex items-center gap-2"
            >
              <button
                title="btn"
                onClick={() => removeGame(game)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                <X />
              </button>
              {game}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${wrapperClasses} mt-5`}>
        <textarea
          name="description"
          value={Order?.description}
          onChange={handleOrderChange}
          className={inputClasses}
          placeholder="توضیحات"
          rows={4}
        ></textarea>
        <button
          type="submit"
          onClick={() => handleSubmite()}
          className={` bg-blue-500 whitespace-nowrap text-sm md:text-xl text-white uppercase md: py-2 md:px-20 px-10  rounded-xl font-semibold cursor-pointer border-2 border-slate-300 hover:bg-blue-600 hover:text-white transition-all duration-200 ease-in-out font-tanha `}
        >
          {loading ? "در حال ثبت" : " ثبت سفارش"}
        </button>
      </div>
    </>
  );
};

export default AddCustomerOrder;
