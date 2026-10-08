"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings2,
  Sparkles,
  Truck,
} from "lucide-react";
import type {
  AppointmentItem,
  AppointmentListResponse,
  AppointmentSettings,
  AppointmentStatus,
  CourierStatus,
  RewardSummary,
} from "@/types/appointments";
import AppointmentDetailsDrawer from "./_components/AppointmentDetailsDrawer";
import AppointmentsFilters from "./_components/AppointmentsFilters";
import AppointmentsOverview from "./_components/AppointmentsOverview";
import AppointmentsTable from "./_components/AppointmentsTable";
import CourierQueue from "./_components/CourierQueue";
import CourierSettings from "./_components/CourierSettings";
import RewardRules from "./_components/RewardRules";
import SettlementModal from "./_components/SettlementModal";
import TransitionConfirmModal from "./_components/TransitionConfirmModal";
import type {
  AdminTab,
  AppointmentFiltersState,
  TransitionRequest,
} from "./_components/admin-types";

type ApiEnvelope<T> = {
  data: T;
  error?: string;
};

const tabs = [
  { key: "appointments", label: "همه درخواست‌ها", icon: CalendarClock },
  { key: "courier", label: "صف پیک", icon: Truck },
  { key: "settings", label: "تنظیمات", icon: Settings2 },
  { key: "rewards", label: "قواعد پاداش", icon: Sparkles },
] satisfies Array<{ key: AdminTab; label: string; icon: typeof CalendarClock }>;

function AppointmentsAdminContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(
    searchParams.get("fulfillment") === "courier"
      ? "courier"
      : "appointments",
  );
  const [filters, setFilters] = useState<AppointmentFiltersState>({
    status: searchParams.get("status") || "",
    serviceType: searchParams.get("service") || "",
    courierStatus: searchParams.get("courierStatus") || "",
    date: searchParams.get("date") || "",
    search: searchParams.get("search") || "",
    page: Math.max(1, Number(searchParams.get("page")) || 1),
  });
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [listMeta, setListMeta] = useState({ total: 0, pages: 1 });
  const [todaySummary, setTodaySummary] =
    useState<AppointmentListResponse["today"]>();
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [rules, setRules] = useState<RewardSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [configError, setConfigError] = useState("");
  const [notice, setNotice] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [detail, setDetail] = useState<AppointmentItem | null>(null);
  const [settlement, setSettlement] = useState<AppointmentItem | null>(null);
  const [completionAmounts, setCompletionAmounts] = useState<
    Record<string, string>
  >({});
  const [transitionRequest, setTransitionRequest] =
    useState<TransitionRequest | null>(null);
  const deferredSearch = useDeferredValue(filters.search);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.page > 1) params.set("page", String(filters.page));
    if (filters.status) params.set("status", filters.status);
    if (filters.serviceType) params.set("service", filters.serviceType);
    if (filters.courierStatus && tab === "courier") {
      params.set("courierStatus", filters.courierStatus);
    }
    if (filters.date) params.set("date", filters.date);
    if (filters.search) params.set("search", filters.search);
    if (tab === "courier") params.set("fulfillment", "courier");
    router.replace(
      params.size ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false },
    );
  }, [filters, pathname, router, tab]);

  const loadAppointments = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: "12",
      });
      if (filters.status) params.set("status", filters.status);
      if (filters.serviceType) {
        params.set("serviceType", filters.serviceType);
      }
      if (filters.date) params.set("date", filters.date);
      if (deferredSearch) params.set("search", deferredSearch);
      if (tab === "courier") {
        params.set("fulfillment", "courier");
        if (filters.courierStatus) {
          params.set("courierStatus", filters.courierStatus);
        }
      }

      const response = await fetch(
        `/api/admin/appointments?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload =
        (await response.json().catch(() => ({}))) as Partial<
          ApiEnvelope<AppointmentListResponse>
        >;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "دریافت درخواست‌ها انجام نشد.");
      }

      setItems(Array.isArray(payload.data.items) ? payload.data.items : []);
      setListMeta({
        total: Number(payload.data.total) || 0,
        pages: Number(payload.data.pages) || 1,
      });
      setTodaySummary(payload.data.today);
    } catch (reason) {
      setListError(
        reason instanceof Error
          ? reason.message
          : "دریافت درخواست‌ها انجام نشد.",
      );
    } finally {
      setListLoading(false);
    }
  }, [
    deferredSearch,
    filters.courierStatus,
    filters.date,
    filters.page,
    filters.serviceType,
    filters.status,
    tab,
  ]);

  const loadConfiguration = useCallback(async () => {
    setConfigLoading(true);
    setConfigError("");
    try {
      const [settingsResponse, rulesResponse] = await Promise.all([
        fetch("/api/admin/appointment-settings", { cache: "no-store" }),
        fetch("/api/admin/visit-reward-rules", { cache: "no-store" }),
      ]);
      const [settingsPayload, rulesPayload] = (await Promise.all([
        settingsResponse.json(),
        rulesResponse.json(),
      ])) as [
        ApiEnvelope<AppointmentSettings>,
        ApiEnvelope<RewardSummary[]>,
      ];
      if (!settingsResponse.ok || !rulesResponse.ok) {
        throw new Error(
          settingsPayload.error ||
            rulesPayload.error ||
            "دریافت تنظیمات انجام نشد.",
        );
      }
      setSettings(settingsPayload.data);
      setRules(Array.isArray(rulesPayload.data) ? rulesPayload.data : []);
    } catch (reason) {
      setConfigError(
        reason instanceof Error
          ? reason.message
          : "دریافت تنظیمات انجام نشد.",
      );
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const refreshAll = async () => {
    setNotice("");
    await Promise.all([loadAppointments(), loadConfiguration()]);
  };

  const updateStatus = async (
    item: AppointmentItem,
    status: AppointmentStatus,
    forcedAmount?: number,
  ) => {
    if (
      status === "completed" &&
      (!Number.isInteger(forcedAmount) || Number(forcedAmount) < 0)
    ) {
      setNotice("مبلغ بررسی‌شده خدمت را به تومان وارد کنید.");
      return;
    }
    setWorkingId(item._id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "completed" ? { baseAmount: forcedAmount } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "تغییر وضعیت انجام نشد.");
      }
      setSettlement(null);
      setTransitionRequest(null);
      setNotice("وضعیت خدمت با موفقیت به‌روزرسانی شد.");
      await loadAppointments();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "تغییر وضعیت انجام نشد.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const updateCourierStatus = async (
    item: AppointmentItem,
    courierStatus: CourierStatus,
  ) => {
    setWorkingId(item._id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courierStatus }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "تغییر وضعیت پیک انجام نشد.");
      }
      setTransitionRequest(null);
      setNotice("وضعیت پیک با موفقیت به‌روزرسانی شد.");
      await loadAppointments();
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "تغییر وضعیت پیک انجام نشد.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setWorkingId("settings");
    setNotice("");
    try {
      const response = await fetch("/api/admin/appointment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload =
        (await response.json().catch(() => ({}))) as Partial<
          ApiEnvelope<AppointmentSettings>
        >;
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "ذخیره تنظیمات انجام نشد.");
      }
      setSettings(payload.data);
      setNotice("تنظیمات با موفقیت ذخیره شد.");
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "ذخیره تنظیمات انجام نشد.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const createRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorkingId("rules");
    setNotice("");
    try {
      const response = await fetch("/api/admin/visit-reward-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title")),
          requiredVisits: Number(form.get("requiredVisits")),
          eligibleServices: form.getAll("services"),
          recurrence: String(form.get("recurrence")),
          reward: {
            type: String(form.get("rewardType")),
            value: Number(form.get("value")) || 0,
            maxDiscountAmount:
              Number(form.get("maxDiscountAmount")) || null,
            minAmount: Number(form.get("minAmount")) || 0,
            combinable: form.get("combinable") === "on",
            eligibleDevices: String(form.get("eligibleDevices") || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            eligibleInstallationTypes: form.getAll("installationTypes"),
            shippingRegion: String(form.get("shippingRegion") || ""),
            maxShippingCost: Number(form.get("maxShippingCost")) || null,
            validityDays: Number(form.get("validityDays")) || 30,
          },
          startsAt: form.get("startsAt")
            ? String(form.get("startsAt"))
            : null,
          endsAt: form.get("endsAt") ? String(form.get("endsAt")) : null,
          isActive: false,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "ساخت قانون انجام نشد.");
      }
      formElement.reset();
      setNotice("قانون به‌صورت غیرفعال ساخته شد؛ اکنون آن را بازبینی کنید.");
      await loadConfiguration();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "ساخت قانون انجام نشد.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const toggleRule = async (rule: RewardSummary) => {
    setWorkingId("rules");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/visit-reward-rules/${rule._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !Boolean(rule.isActive) }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "تغییر وضعیت قانون انجام نشد.");
      }
      setNotice(rule.isActive ? "قانون غیرفعال شد." : "قانون فعال شد.");
      await loadConfiguration();
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "تغییر وضعیت قانون انجام نشد.",
      );
    } finally {
      setWorkingId("");
    }
  };

  const confirmTransition = () => {
    if (!transitionRequest) return;
    if (transitionRequest.kind === "courier") {
      void updateCourierStatus(
        transitionRequest.item,
        transitionRequest.nextStatus,
      );
      return;
    }
    void updateStatus(
      transitionRequest.item,
      transitionRequest.nextStatus,
    );
  };

  return (
    <main dir="rtl" className="space-y-5">
      <AppointmentsOverview
        summary={todaySummary}
        loading={listLoading}
        onRefresh={() => void refreshAll()}
      />

      <nav
        className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        aria-label="بخش‌های مدیریت نوبت"
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setFilters((value) => ({ ...value, page: 1 }));
            }}
            aria-pressed={tab === key}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
              tab === key
                ? "bg-[#001A6E] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {notice ? (
        <div
          role="status"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800"
        >
          {notice}
        </div>
      ) : null}

      {tab === "appointments" || tab === "courier" ? (
        <div className="space-y-4">
          <AppointmentsFilters
            filters={filters}
            courierMode={tab === "courier"}
            onChange={setFilters}
          />
          {listError ? (
            <ErrorState
              message={listError}
              onRetry={() => void loadAppointments()}
            />
          ) : listLoading ? (
            <DashboardSkeleton />
          ) : tab === "courier" ? (
            <>
              <CourierQueue
                items={items}
                workingId={workingId}
                onOpenDetails={setDetail}
                onRequestStatus={(item, nextStatus) =>
                  setTransitionRequest({
                    kind: "courier",
                    item,
                    nextStatus,
                  })
                }
              />
              <PaginationBar
                total={listMeta.total}
                page={filters.page}
                pages={listMeta.pages}
                onPageChange={(page) =>
                  setFilters((value) => ({ ...value, page }))
                }
              />
            </>
          ) : (
            <AppointmentsTable
              items={items}
              total={listMeta.total}
              page={filters.page}
              pages={listMeta.pages}
              workingId={workingId}
              onPageChange={(page) =>
                setFilters((value) => ({ ...value, page }))
              }
              onOpenDetails={setDetail}
              onOpenSettlement={setSettlement}
              onRequestStatus={(item, nextStatus) =>
                setTransitionRequest({
                  kind: "appointment",
                  item,
                  nextStatus,
                })
              }
            />
          )}
        </div>
      ) : configError ? (
        <ErrorState
          message={configError}
          onRetry={() => void loadConfiguration()}
        />
      ) : configLoading ? (
        <DashboardSkeleton />
      ) : tab === "settings" && settings ? (
        <CourierSettings
          settings={settings}
          saving={workingId === "settings"}
          onChange={setSettings}
          onSave={() => void saveSettings()}
        />
      ) : (
        <RewardRules
          rules={rules}
          submitting={workingId === "rules"}
          onCreate={(event) => void createRule(event)}
          onToggle={(rule) => void toggleRule(rule)}
        />
      )}

      <AppointmentDetailsDrawer
        item={detail}
        onClose={() => setDetail(null)}
      />
      <SettlementModal
        item={settlement}
        amount={settlement ? completionAmounts[settlement._id] || "" : ""}
        submitting={Boolean(settlement && workingId === settlement._id)}
        onAmountChange={(amount) => {
          if (!settlement) return;
          setCompletionAmounts((value) => ({
            ...value,
            [settlement._id]: amount,
          }));
        }}
        onClose={() => setSettlement(null)}
        onSubmit={() => {
          if (!settlement) return;
          void updateStatus(
            settlement,
            "completed",
            Number(completionAmounts[settlement._id]),
          );
        }}
      />
      <TransitionConfirmModal
        request={transitionRequest}
        submitting={Boolean(
          transitionRequest && workingId === transitionRequest.item._id,
        )}
        onClose={() => setTransitionRequest(null)}
        onConfirm={confirmTransition}
      />
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2" aria-label="در حال دریافت">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white p-5"
        >
          <div className="h-4 w-2/5 rounded bg-slate-100" />
          <div className="mt-4 h-20 rounded-2xl bg-slate-100" />
          <div className="mt-4 h-10 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-rose-200 bg-rose-50 p-7 text-center"
    >
      <p className="font-bold text-rose-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
      >
        تلاش دوباره
      </button>
    </div>
  );
}

function PaginationBar({
  total,
  page,
  pages,
  onPageChange,
}: {
  total: number;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
      <span className="text-slate-500">
        {total.toLocaleString("fa-IR")} درخواست · صفحه{" "}
        {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
          قبلی
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 font-bold disabled:opacity-40"
        >
          بعدی
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AppointmentsAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-64 items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          در حال آماده‌سازی پنل نوبت‌ها…
        </div>
      }
    >
      <AppointmentsAdminContent />
    </Suspense>
  );
}
