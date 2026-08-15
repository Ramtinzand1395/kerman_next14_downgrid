"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Customer, storeOrder } from "@/types";
import SearchCustomer from "./SearchCustomer";
import RegisterCustomer from "./RegisterCustomer";
import AddCustomerOrder from "./AddCustomerOrder";
import { readStoreOrderDraft, writeStoreOrderDraft } from "./draft";

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
  ps5Copy: storeOrder[];
};

interface AddOrderModalProps {
  closeModal: () => void;
  setOrders: React.Dispatch<React.SetStateAction<OrdersByConsole>>;
}

const defaultCustomer: Customer = {
  _id: "",
  name: "",
  mobile: "",
  lastName: "",
  createdAt: "",
  updatedAt: "",
  sex: "",
  birthday: "",
  description: "",
};

const steps = [
  { id: 1, title: "جستجوی مشتری" },
  { id: 2, title: "تایید/ثبت اطلاعات" },
  { id: 3, title: "ثبت سفارش" },
] as const;

const AddOrderModal = ({ closeModal, setOrders }: AddOrderModalProps) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [customerData, setCustomerData] = useState<Customer>(defaultCustomer);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // بازیابی پیش‌نویس ذخیره‌شده (مثلا بعد از خطای ثبت سفارش) تا اطلاعات از اول وارد نشود
  useEffect(() => {
    const draft = readStoreOrderDraft();

    if (draft?.customerData) {
      setCustomerData({ ...defaultCustomer, ...draft.customerData });
    }
    if (draft?.activeStep && draft.activeStep >= 1 && draft.activeStep <= 3) {
      setActiveStep(draft.activeStep);
    }

    setDraftLoaded(true);
  }, []);

  // ذخیره خودکار پیش‌نویس در localStorage هنگام هر تغییر
  useEffect(() => {
    if (!draftLoaded) return;
    writeStoreOrderDraft({ customerData, activeStep });
  }, [customerData, activeStep, draftLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 pt-6 sm:p-4 sm:pt-10 md:items-center">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={closeModal}
      />

      <div className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:max-h-[calc(100dvh-2rem)] md:p-6">
        {" "}
        <button
          title="بستن"
          onClick={closeModal}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <X size={18} />
        </button>
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            افزودن سفارش جدید
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {steps.map((step) => {
              const isActive = step.id === activeStep;
              const isDone = step.id < activeStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm ${
                    isActive
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : isDone
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-bold">
                    {step.id}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
        {activeStep === 1 && (
          <SearchCustomer
            customerData={customerData}
            setCustomerData={setCustomerData}
            onNext={() => setActiveStep(2)}
          />
        )}
        {activeStep === 2 && (
          <RegisterCustomer
            customerData={customerData}
            setCustomerData={setCustomerData}
            onBack={() => setActiveStep(1)}
            onNext={() => setActiveStep(3)}
          />
        )}
        {activeStep === 3 && (
          <AddCustomerOrder
            customerData={customerData}
            closeModal={closeModal}
            setOrders={setOrders}
            onBack={() => setActiveStep(2)}
          />
        )}
      </div>
    </div>
  );
};

export default AddOrderModal;
