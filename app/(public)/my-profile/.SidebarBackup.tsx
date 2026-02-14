import { User2Icon } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-60 bg-white shadow rounded-xl p-4  flex-col gap-4 hidden md:flex text-shadow-sm">
      <div className="text-sm flex items-center">
        {/* اگر عکس داشت → نمایش میدم */}
        <div className="bg-gray-300/50 rounded-full p-5 ml-5">
          <User2Icon className="w-6 h-6 text-blue-500" />
        </div>
        <div className="flex flex-col gap-5">
          {/* نام کاربر */}
          <div className="flex items-center justify-around">
            {/* <span>{session?.user?.name}</span>{" "}
            <span>{session?.user?.lastName}</span> */}
          </div>

          <p className="text-xs">حساب کاربری</p>
        </div>
      </div>
      <button className="bg-blue-50 p-3 rounded-lg text-blue-600">
        کیف پول و پرداخت
      </button>
      <div className="bg-gray-100 p-4 rounded-lg">باشگاه مشتریان</div>
      <div className="flex flex-col gap-3">
        <button className="p-3 rounded-lg bg-white shadow">سفارشات</button>
        <button className="p-3 rounded-lg bg-white shadow">
          درخواست های مرجوعی
        </button>
        <button className="p-3 rounded-lg bg-white shadow">رزرو حضوری</button>
      </div>
      <button className="mt-auto bg-orange-500 text-white rounded-lg py-3 text-center">
        دعوت از دوستان
      </button>
    </div>
  );
}
