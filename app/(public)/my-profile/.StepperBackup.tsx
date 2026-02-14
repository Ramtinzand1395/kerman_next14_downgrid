"use client";

import { useRouter } from "next/navigation";

export default function Stepper({ activeStep }: { activeStep: number }) {
  const steps = [
    {
      id: 1,
      title: "اطلاعات شخصی",
    },
    {
      id: 2,
      title: "علاقه مندی ها ",
    },
    {
      id: 3,
      title: "آدرس های شما",
    },
    {
      id: 4,
      title: "نظرات",
    },
    {
      id: 5,
      title: "سفارش ها",
    },
  ];
  const router = useRouter();

  return (
    <div className="flex items-start gap-8 lg:gap-16 shadow-2xl text-xs">
      {steps.map((step) => (
        <div
          onClick={() =>
            router.push(`?step=${Number(step.id)}`, { scroll: false })
          }
          className={`flex items-center gap-2 border-b-2 pb-4 cursor-pointer ${
            step.id === activeStep ? "border-gray-800" : "border-gray-200"
          }`}
          key={step.id}
        >
         
          <p
            className={` font-medium ${
              step.id === activeStep ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {step.title}
          </p>
        </div>
      ))}
    </div>
  );
}
