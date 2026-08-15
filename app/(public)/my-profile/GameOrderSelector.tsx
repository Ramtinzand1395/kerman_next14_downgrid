"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ConsoleOption = {
  id: string;
  platform: string;
  title: string;
  subtitle: string;
};

type AccountTypeOption = {
  id: string;
  title: string;
  subtitle: string;
};

type GameData = {
  _id?: string;
  name: string;
  price?: number;
  size?: number;
  platform?: string;
};

type GameListResponse = {
  gameList?: Array<{
    _id: string;
    platform: string;
    items?: GameData[];
  }>;
};

type AddressItem = {
  _id: string;
  province: string;
  city: string;
  address: string;
  plaque?: string;
  unit?: string;
  postalCode?: string;
};

const consoleOptions: ConsoleOption[] = [
  {
    id: "ps5-legal",
    platform: "ps5",
    title: "PlayStation 5",
    subtitle: "اکانتی / Standard",
  },
  {
    id: "ps5-copy",
    platform: "ps5Copy",
    title: "PlayStation 5",
    subtitle: "کپی‌خور",
  },
  {
    id: "ps4-copy",
    platform: "copy",
    title: "PlayStation 4",
    subtitle: "کپی‌خور",
  },
  {
    id: "ps4-standard",
    platform: "ps4",
    title: "PlayStation 4",
    subtitle: "اکانتی / Standard",
  },
  {
    id: "xbox",
    platform: "xbox",
    title: "Xbox",
    subtitle: "اکانت و بازی",
  },
];

const accountTypeOptions: AccountTypeOption[] = [
  {
    id: "legal",
    title: "اکانت قانونی",
    subtitle: "Legal Account",
  },
  {
    id: "hacked-warranty",
    title: "هکی با تضمین",
    subtitle: "Warranty Included",
  },
  {
    id: "hacked-no-warranty",
    title: "هکی بدون تضمین",
    subtitle: "No Warranty",
  },
];

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w؀-ۿ-]/g, "");

const formatPrice = (price?: number) => {
  if (!price) {
    return "قیمت نامشخص";
  }

  return `${price.toLocaleString("fa-IR")} تومان`;
};

const formatSize = (size?: number) => {
  if (!size) {
    return "حجم نامشخص";
  }

  return `${size.toLocaleString("fa-IR")} گیگ`;
};

function StepHeader({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#001A6E] text-sm font-black text-white shadow-lg shadow-indigo-900/15">
        {number}
      </span>
      <div>
        <h3 className="text-lg font-black text-slate-950 md:text-xl">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function OptionCard({
  isActive,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  isActive: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right transition duration-300 ${
        isActive
          ? "border-[#001A6E] bg-indigo-50 shadow-lg shadow-indigo-950/10"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60"
      } ${disabled ? "cursor-not-allowed opacity-55 hover:translate-y-0" : ""}`}
    >
      <span
        className={`block text-sm font-black md:text-base ${
          isActive ? "text-[#001A6E]" : "text-slate-900"
        }`}
      >
        {title}
      </span>
      <span className="mt-1 block text-xs font-bold text-slate-500 md:text-sm">
        {subtitle}
      </span>
    </button>
  );
}

export default function GameOrderSelector() {
  const [selectedConsoleId, setSelectedConsoleId] = useState(
    consoleOptions[0].id,
  );
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState(
    accountTypeOptions[0].id,
  );
  const [search, setSearch] = useState("");
  const [games, setGames] = useState<GameData[]>([]);
  const [selectedGames, setSelectedGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(false);

  // اطلاعات کاربر (از پروفایل) + دفترچه آدرس
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setSelectedGames([]);
    setMessage("");
    setFieldErrors({});
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const selectedConsole = useMemo(
    () => consoleOptions.find((option) => option.id === selectedConsoleId),
    [selectedConsoleId],
  );

  const selectedAccountType = useMemo(
    () =>
      accountTypeOptions.find((option) => option.id === selectedAccountTypeId),
    [selectedAccountTypeId],
  );

  const selectedPlatform = selectedConsole?.platform || "";

  useEffect(() => {
    const controller = new AbortController();

    const getData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
          params.set("limit", "100");
        } else {
          params.set("limit", "5000");
        }

        if (selectedPlatform) {
          params.set("platform", selectedPlatform);
        }

        const res = await fetch(
          `/api/profile/game-list/?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          setGames([]);
          return;
        }

        const data = (await res.json()) as GameListResponse;
        const gameList = data.gameList || [];

        const allGames = gameList.flatMap((game) =>
          (game.items || []).map((item) => ({
            ...item,
            platform: game.platform,
          })),
        );

        const uniqueGames = Array.from(
          new Map(
            allGames.map((game) => [
              `${game.platform}-${game._id ?? normalize(game.name)}`,
              game,
            ]),
          ).values(),
        );

        setGames(uniqueGames);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error(err);
          setGames([]);
        }
      } finally {
        setLoading(false);
      }
    };

    getData();

    return () => controller.abort();
  }, [search, selectedPlatform]);

  // pre-fill نام و شماره تماس از پروفایل + بارگذاری دفترچه آدرس
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);

      try {
        const [profileRes, addressRes] = await Promise.all([
          fetch("/api/profile/account"),
          fetch("/api/profile/address"),
        ]);

        if (!cancelled && profileRes.ok) {
          const user = await profileRes.json();
          setCustomerName(user.username || "");
          setPhone(user.mobile || "");
        }

        if (!cancelled && addressRes.ok) {
          const data = (await addressRes.json()) as AddressItem[];
          const list = Array.isArray(data) ? data : [];
          setAddresses(list);
          if (list.length > 0) {
            setSelectedAddressId(list[0]._id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredGames = useMemo(() => {
    if (!selectedPlatform) {
      return games;
    }

    return games.filter(
      (game) => game.platform?.trim().toLowerCase() === selectedPlatform,
    );
  }, [games, selectedPlatform]);

  const selectedGameIds = useMemo(
    () =>
      new Set(
        selectedGames.map(
          (game) => `${game.platform}-${game._id ?? normalize(game.name)}`,
        ),
      ),
    [selectedGames],
  );

  const addGame = (game: GameData) => {
    const gameId = `${game.platform}-${game._id ?? normalize(game.name)}`;

    if (selectedGameIds.has(gameId)) {
      return;
    }

    setSelectedGames((currentGames) => [...currentGames, game]);
  };

  const removeGame = (game: GameData) => {
    const gameId = `${game.platform}-${game._id ?? normalize(game.name)}`;

    setSelectedGames((currentGames) =>
      currentGames.filter(
        (currentGame) =>
          `${currentGame.platform}-${currentGame._id ?? normalize(currentGame.name)}` !==
          gameId,
      ),
    );
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 2) {
      errors.customerName = "نام مشتری الزامی است (حداقل ۲ کاراکتر).";
    }

    if (!/^09\d{9}$/.test(phone.trim())) {
      errors.phone = "شماره تماس باید ۱۱ رقم باشد و با 09 شروع شود.";
    }

    if (!selectedAddressId) {
      errors.address = "انتخاب یک آدرس الزامی است.";
    }

    if (selectedGames.length === 0) {
      errors.products = "حداقل یک بازی باید انتخاب شود.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const totalPrice = useMemo(
    () => selectedGames.reduce((sum, game) => sum + (game.price || 0), 0),
    [selectedGames],
  );

  const handleSubmit = async () => {
    setSubmitError("");

    if (!validateFields()) {
      return;
    }

    setSubmitting(true);

    const payload = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      addressId: selectedAddressId,
      message: message.trim(),
      products: selectedGames.map((game) => ({
        name: game.name,
        platform: game.platform || "",
        price: game.price || 0,
        size: game.size || 0,
      })),
      totalPrice,
    };

    try {
      const res = await fetch("/api/profile/customer-game-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error ||
          data.details?.join(". ") ||
          "خطایی در ثبت سفارش رخ داد.";
        setSubmitError(msg);
        return;
      }

      setSubmitSuccess(true);
    } catch {
      setSubmitError(
        "خطا در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی کنید.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-blue-50 blur-3xl" />

      <div className="relative z-10">
        {submitSuccess ? (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-12 w-12 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950 md:text-3xl">
                سفارش شما با موفقیت ثبت شد!
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                در اسرع وقت با شما تماس خواهیم گرفت.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-2xl bg-[#001A6E] px-8 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-[#000e3c]"
            >
              ثبت سفارش جدید
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-black text-[#001A6E]">
                  سفارش بازی و اکانت
                </span>
                <h2 className="mt-4 text-2xl font-black text-slate-950 md:text-4xl">
                  انتخاب بازی برای ثبت درخواست
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                  کنسول، نوع اکانت و بازی‌های موردنظرت را انتخاب کن تا سفارش ثبت
                  شود.
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-center">
                <span className="block text-3xl font-black text-[#001A6E]">
                  {selectedGames.length.toLocaleString("fa-IR")}
                </span>
                <span className="text-xs font-bold text-indigo-900">
                  بازی انتخاب‌شده
                </span>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <StepHeader
                    number="۱"
                    title="انتخاب کنسول"
                    description="لیست بازی‌ها براساس پلتفرم انتخابی فیلتر می‌شود."
                  />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {consoleOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        isActive={selectedConsoleId === option.id}
                        title={option.title}
                        subtitle={option.subtitle}
                        onClick={() => setSelectedConsoleId(option.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <StepHeader
                    number="۲"
                    title="انتخاب نوع اکانت"
                    description="نوع خرید موردنیاز برای هماهنگی نهایی مشخص می‌شود."
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    {accountTypeOptions.map((option) => (
                      <OptionCard
                        key={option.id}
                        isActive={selectedAccountTypeId === option.id}
                        title={option.title}
                        subtitle={option.subtitle}
                        onClick={() => setSelectedAccountTypeId(option.id)}
                      />
                    ))}
                  </div>
                </div> */}

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <StepHeader
                    number="۳"
                    title="جستجوی بازی"
                    description="داده‌ها از API لیست بازی‌های فروشگاه خوانده می‌شود."
                  />

                  <div className="relative">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="نام بازی را وارد کنید..."
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#001A6E] focus:ring-4 focus:ring-indigo-100"
                    />
                    {loading && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#001A6E]">
                        در حال دریافت...
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid max-h-[34rem] gap-3 overflow-y-auto pl-1 md:grid-cols-2">
                    {filteredGames.map((game) => {
                      const gameId = `${game.platform}-${game._id ?? normalize(game.name)}`;
                      const isSelected = selectedGameIds.has(gameId);

                      return (
                        <div
                          key={gameId}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/70"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-black text-slate-950">
                              {game.name}
                            </h4>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                {game.platform}
                              </span>
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[#001A6E]">
                                {formatSize(game.size)}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                {formatPrice(game.price)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isSelected}
                            onClick={() => addGame(game)}
                            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
                              isSelected
                                ? "cursor-not-allowed bg-emerald-50 text-emerald-700"
                                : "bg-[#001A6E] text-white hover:bg-[#000e3c]"
                            }`}
                          >
                            {isSelected ? "اضافه شد" : "افزودن"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {!loading && filteredGames.length === 0 && (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-500">
                      بازی‌ای برای این جستجو یا پلتفرم پیدا نشد.
                    </div>
                  )}
                </div>
              </div>

              <aside className="h-fit rounded-3xl border border-indigo-100 bg-white p-5 shadow-xl shadow-slate-200/80 xl:sticky xl:top-6">
                <StepHeader
                  number="۴"
                  title="خلاصه درخواست"
                  description="اطلاعات خود را وارد کن و درخواست را ارسال کن."
                />

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">کنسول</span>
                    <span className="text-left font-black text-slate-950">
                      {selectedConsole?.title} / {selectedConsole?.subtitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">نوع اکانت</span>
                    <span className="text-left font-black text-slate-950">
                      {selectedAccountType?.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-slate-500">مجموع قیمت</span>
                    <span className="text-left font-black text-emerald-700">
                      {totalPrice > 0 ? formatPrice(totalPrice) : "قیمت نامشخص"}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-black text-slate-950">
                      بازی‌های انتخابی
                    </h4>
                    <span className="rounded-full bg-[#001A6E] px-3 py-1 text-xs font-black text-white">
                      {selectedGames.length.toLocaleString("fa-IR")}
                    </span>
                  </div>

                  <div className="max-h-80 space-y-3 overflow-y-auto pl-1">
                    {selectedGames.map((game) => {
                      const gameId = `${game.platform}-${game._id ?? normalize(game.name)}`;

                      return (
                        <div
                          key={gameId}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-[#001A6E]">
                            {game.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-950">
                              {game.name}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {game.platform} • {formatSize(game.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGame(game)}
                            className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-600 transition hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {selectedGames.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm leading-7 text-slate-500">
                      هنوز بازی‌ای انتخاب نشده است.
                    </div>
                  )}
                </div>

                {/* Customer Information — pre-filled از پروفایل و دفترچه آدرس */}
                <div className="mt-6 space-y-4">
                  <h4 className="font-black text-slate-950">اطلاعات مشتری</h4>

                  <div>
                    <label
                      htmlFor="customer-name"
                      className="mb-1.5 block text-xs font-bold text-slate-600"
                    >
                      نام و نام خانوادگی <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customer-name"
                      value={customerName}
                      disabled={profileLoading}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setFieldErrors((prev) => ({
                          ...prev,
                          customerName: "",
                        }));
                      }}
                      placeholder="مثال: علی رضایی"
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:opacity-60 ${
                        fieldErrors.customerName
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-slate-200 focus:border-[#001A6E] focus:ring-indigo-100"
                      }`}
                    />
                    {fieldErrors.customerName && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {fieldErrors.customerName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="mb-1.5 block text-xs font-bold text-slate-600"
                    >
                      شماره تماس <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customer-phone"
                      value={phone}
                      disabled={profileLoading}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="09123456789"
                      className={`w-full rounded-2xl border bg-white px-4 py-3 text-right text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:opacity-60 ${
                        fieldErrors.phone
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-slate-200 focus:border-[#001A6E] focus:ring-indigo-100"
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs font-bold text-slate-600">
                      آدرس <span className="text-red-500">*</span>
                    </span>

                    {addresses.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs leading-6 text-slate-500">
                        هنوز آدرسی ثبت نشده است.{" "}
                        <Link
                          href="/my-profile?step=3"
                          className="font-bold text-[#001A6E] underline"
                        >
                          از اینجا آدرس اضافه کنید
                        </Link>
                        .
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {addresses.map((addr) => {
                          const isSelected = selectedAddressId === addr._id;
                          return (
                            <button
                              type="button"
                              key={addr._id}
                              onClick={() => {
                                setSelectedAddressId(addr._id);
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  address: "",
                                }));
                              }}
                              className={`w-full rounded-2xl border p-3 text-right transition ${
                                isSelected
                                  ? "border-[#001A6E] bg-indigo-50"
                                  : "border-slate-200 bg-white hover:border-indigo-200"
                              }`}
                            >
                              <p className="text-xs font-bold text-slate-700">
                                {addr.province} - {addr.city}
                              </p>
                              <p className="mt-1 text-xs leading-6 text-slate-500">
                                {addr.address}
                                {addr.plaque ? ` | پلاک ${addr.plaque}` : ""}
                                {addr.unit ? ` | واحد ${addr.unit}` : ""}
                                {addr.postalCode
                                  ? ` | کدپستی ${addr.postalCode}`
                                  : ""}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {fieldErrors.address && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {fieldErrors.address}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="customer-message"
                      className="mb-1.5 block text-xs font-bold text-slate-600"
                    >
                      پیام (اختیاری)
                    </label>
                    <textarea
                      id="customer-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="توضیحات یا درخواست اضافه..."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#001A6E] focus:ring-4 focus:ring-indigo-100"
                    />
                  </div>

                  {fieldErrors.products && (
                    <p className="text-xs font-bold text-red-500">
                      {fieldErrors.products}
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">
                    {submitError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-950/20 transition ${
                    submitting
                      ? "cursor-not-allowed bg-slate-400"
                      : "bg-[#001A6E] hover:-translate-y-0.5 hover:bg-[#000e3c]"
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      در حال ارسال...
                    </>
                  ) : (
                    "ثبت و ارسال درخواست"
                  )}
                </button>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
