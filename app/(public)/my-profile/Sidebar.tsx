import {
  BadgeCheck,
  Gift,
  ShieldCheck,
  User2Icon,
  WalletCards,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex h-fit sticky top-24 flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm gap-4">
      <div className="rounded-xl bg-gradient-to-l from-indigo-50 to-cyan-50 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white p-3 border border-slate-200">
            <User2Icon className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">کاربر عزیز</p>
            <p className="text-xs text-slate-500">مدیریت کامل حساب کاربری</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-right text-sm text-slate-700 hover:border-indigo-300 transition-colors">
          <span className="flex items-center gap-2">
            <WalletCards className="w-4 h-4 text-indigo-500" />
            کیف پول و پرداخت
          </span>
        </button>

        <button className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-right text-sm text-slate-700 hover:border-indigo-300 transition-colors">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            امنیت حساب
          </span>
        </button>

        <button className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-right text-sm text-slate-700 hover:border-indigo-300 transition-colors">
          <span className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-amber-500" />
            باشگاه مشتریان
          </span>
        </button>
      </div>

      <button className="mt-2 w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-medium hover:bg-indigo-700 transition-colors">
        <span className="inline-flex items-center gap-2">
          <Gift className="w-4 h-4" />
          دعوت از دوستان
        </span>
      </button>
    </aside>
  );
}
