"use client";

import { X } from "lucide-react";
import RegisterCustomer from "./RegisterCustomer";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import SearchCustomer from "./SearchCustomer";
import AddCustomerOrder from "./AddCustomerOrder";
import { Customer, storeOrder } from "@/types";
interface AddOrderModalProps {
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

const AddOrderModal = ({ closeModal , setOrders }: AddOrderModalProps) => {
  const searchParams = useSearchParams();

  const router = useRouter();
  const activeStep = parseInt(searchParams.get("step") || "1");

  const steps = [
    {
      id: 1,
      title: "جستجو شماره موبایل",
    },
    {
      id: 2,
      title: "تایید مشخصات",
    },
    {
      id: 3,
      title: "ثبت سفارش ",
    },
  ];
  const [customerData, setCustomerData] = useState<Customer>({
    _id: "",
    name: "",
    mobile: "",
    lastName: "",
    createdAt: "",
    updatedAt: "",
    sex: "",
    birthday: "",
    description: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          closeModal();
          router.push("/dashboard/store-order");
        }}
      ></div>

      {/* Modal content */}
      <div className="relative z-50 w-[80vw] max-w-3xl bg-white rounded-2xl p-6 shadow-xl animate-fadeIn h-[60vh] overflow-y-auto">
        {/* Close Button */}
        <button
          title="btn"
          onClick={() => {
            closeModal();
            router.push("/dashboard/store-order");
          }}
          className="absolute top-4 right-4 text-gray-500 hover:text-black transition"
        >
          <X size={18} />
        </button>

        {/* Modal Body */}
        <div className="flex lg:flex-row items-start gap-8 lg:gap-16">
          {steps.map((step) => (
            <div
              onClick={() =>
                router.push(`/dashboard/store-order?step=${step.id}`, {
                  scroll: false,
                })
              }
              className={`flex items-center gap-2 border-b-2 pb-4 cursor-pointer ${
                step.id === activeStep ? "border-gray-800" : "border-gray-200"
              }`}
              key={step.id}
            >
              <div
                className={`w-6 h-6 rounded-full text-white p-4 flex items-center justify-center ${
                  step.id === activeStep ? "bg-gray-800" : "bg-gray-400"
                }`}
              >
                {step.id}
              </div>
              <p
                className={`text-sm font-medium ${
                  step.id === activeStep ? "text-gray-800" : "text-gray-400"
                }`}
              >
                {step.title}
              </p>
            </div>
          ))}
        </div>
        {activeStep === 1 && (
          <SearchCustomer
            customerData={customerData}
            setCustomerData={setCustomerData}
          />
        )}
        {activeStep === 2 && (
          <RegisterCustomer
            customerData={customerData}
            setCustomerData={setCustomerData}
          />
        )}
        {activeStep === 3 && (
          <AddCustomerOrder
            customerData={customerData}
            closeModal={closeModal}
            setOrders={setOrders}
          />
        )}
      </div>
    </div>
  );
};

export default AddOrderModal;
