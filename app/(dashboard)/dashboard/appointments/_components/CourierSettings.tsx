"use client";

import {
  Clock3,
  MapPin,
  Plus,
  Save,
  Settings2,
  Trash2,
  Truck,
} from "lucide-react";
import type { AppointmentSettings } from "@/types/appointments";
import { toman, weekdayOptions } from "./appointment-ui";

type Props = {
  settings: AppointmentSettings;
  saving: boolean;
  onChange: (settings: AppointmentSettings) => void;
  onSave: () => void;
};

export default function CourierSettings({
  settings,
  saving,
  onChange,
  onSave,
}: Props) {
  const courierWindows = settings.courierWorkingWindows || [];
  const courierRegions = settings.courierRegions || [];
  const courierClosedWeekdays = settings.courierClosedWeekdays || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-black text-slate-950">تنظیمات پذیرش و پیک</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            مقادیر این فرم دقیقاً با contract فعلی Appointment Settings ذخیره
            می‌شوند.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#001A6E] px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#1269f5]">
            <Settings2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-black text-slate-900">مراجعه حضوری</h3>
            <p className="text-xs text-slate-500">
              ظرفیت، بازه‌های کاری و روزهای تعطیل فروشگاه
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField
            label="طول هر بازه (دقیقه)"
            value={settings.slotMinutes}
            min={15}
            onChange={(slotMinutes) => onChange({ ...settings, slotMinutes })}
          />
          <NumberField
            label="روزهای قابل رزرو"
            value={settings.bookingDaysAhead}
            min={1}
            onChange={(bookingDaysAhead) =>
              onChange({ ...settings, bookingDaysAhead })
            }
          />
          <NumberField
            label="سقف نوبت فعال هر کاربر"
            value={settings.maxActiveAppointmentsPerUser}
            min={1}
            onChange={(maxActiveAppointmentsPerUser) =>
              onChange({ ...settings, maxActiveAppointmentsPerUser })
            }
          />
          <NumberField
            label="مهلت لغو (دقیقه)"
            value={settings.cancellationNoticeMinutes}
            min={0}
            onChange={(cancellationNoticeMinutes) =>
              onChange({ ...settings, cancellationNoticeMinutes })
            }
          />
          <NumberField
            label="ظرفیت نصب بازی"
            value={settings.serviceCapacity.game_install}
            min={1}
            onChange={(gameInstall) =>
              onChange({
                ...settings,
                serviceCapacity: {
                  ...settings.serviceCapacity,
                  game_install: gameInstall,
                },
              })
            }
          />
          <NumberField
            label="ظرفیت تعمیرات"
            value={settings.serviceCapacity.repair}
            min={1}
            onChange={(repair) =>
              onChange({
                ...settings,
                serviceCapacity: {
                  ...settings.serviceCapacity,
                  repair,
                },
              })
            }
          />
        </div>

        <div className="mt-5">
          <SectionLabel icon={Clock3} title="بازه‌های کاری حضوری" />
          <TimeWindowsEditor
            windows={settings.workingBlocks}
            max={6}
            onChange={(workingBlocks) =>
              onChange({ ...settings, workingBlocks })
            }
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-bold text-slate-700">
            روزهای تعطیل هفتگی
          </p>
          <WeekdayPicker
            value={settings.closedWeekdays}
            onChange={(closedWeekdays) =>
              onChange({ ...settings, closedWeekdays })
            }
          />
        </div>

        <label className="mt-5 block text-sm font-bold text-slate-700">
          تاریخ‌های بسته
          <span className="mr-2 text-xs font-normal text-slate-400">
            میلادی و جداشده با ویرگول
          </span>
          <input
            value={settings.closedDates.join(", ")}
            onChange={(event) =>
              onChange({
                ...settings,
                closedDates: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder="2026-10-15, 2026-10-22"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            dir="ltr"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-black text-slate-900">ارسال با پیک</h3>
              <p className="text-xs text-slate-500">
                ظرفیت دریافت، روزهای رزرو و پوشش مناطق
              </p>
            </div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-bold text-slate-700">
              {settings.courierEnabled ? "پیک فعال است" : "پیک غیرفعال است"}
            </span>
            <input
              type="checkbox"
              checked={Boolean(settings.courierEnabled)}
              onChange={(event) =>
                onChange({ ...settings, courierEnabled: event.target.checked })
              }
              className="h-5 w-5 accent-[#1269f5]"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NumberField
            label="روزهای قابل رزرو پیک"
            value={settings.courierBookingDaysAhead ?? 14}
            min={1}
            onChange={(courierBookingDaysAhead) =>
              onChange({ ...settings, courierBookingDaysAhead })
            }
          />
          <NumberField
            label="ظرفیت هر بازه"
            value={settings.courierCapacityPerWindow ?? 1}
            min={1}
            onChange={(courierCapacityPerWindow) =>
              onChange({ ...settings, courierCapacityPerWindow })
            }
          />
          <label className="text-sm font-bold text-slate-700">
            نوع مسیر
            <select
              value={settings.courierRoundTripMultiplier ?? 2}
              onChange={(event) =>
                onChange({
                  ...settings,
                  courierRoundTripMultiplier: Number(event.target.value),
                })
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value={2}>دریافت و بازگشت دستگاه</option>
              <option value={1}>فقط دریافت دستگاه</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <SectionLabel icon={Clock3} title="بازه‌های دریافت پیک" />
          <TimeWindowsEditor
            windows={courierWindows}
            max={10}
            onChange={(courierWorkingWindows) =>
              onChange({ ...settings, courierWorkingWindows })
            }
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-bold text-slate-700">
            روزهای تعطیل هفتگی پیک
          </p>
          <WeekdayPicker
            value={courierClosedWeekdays}
            onChange={(courierClosedWeekdays) =>
              onChange({ ...settings, courierClosedWeekdays })
            }
          />
        </div>

        <label className="mt-5 block text-sm font-bold text-slate-700">
          تعطیلات اختصاصی پیک
          <input
            value={(settings.courierClosedDates || []).join(", ")}
            onChange={(event) =>
              onChange({
                ...settings,
                courierClosedDates: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
            placeholder="2026-10-15, 2026-10-22"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            dir="ltr"
          />
        </label>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel icon={MapPin} title="مناطق تحت پوشش" />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  courierRegions: [
                    ...courierRegions,
                    {
                      id: crypto.randomUUID(),
                      title: "",
                      city: "",
                      shippingCost: 0,
                      isActive: false,
                    },
                  ],
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-[#001A6E]"
            >
              <Plus className="h-4 w-4" />
              افزودن منطقه
            </button>
          </div>

          {courierRegions.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              هنوز منطقه‌ای در تنظیمات سرور تعریف نشده است.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {courierRegions.map((region, index) => (
                <article
                  key={region.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">
                        {region.title || "منطقه جدید"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        هزینه هر مسیر: {toman(region.shippingCost)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={region.isActive}
                          onChange={(event) =>
                            onChange({
                              ...settings,
                              courierRegions: courierRegions.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, isActive: event.target.checked }
                                  : item,
                              ),
                            })
                          }
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {region.isActive ? "فعال" : "غیرفعال"}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...settings,
                            courierRegions: courierRegions.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        aria-label="حذف منطقه"
                        className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <TextField
                      label="عنوان منطقه"
                      value={region.title}
                      onChange={(title) =>
                        onChange({
                          ...settings,
                          courierRegions: courierRegions.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title } : item,
                          ),
                        })
                      }
                    />
                    <TextField
                      label="شهر"
                      value={region.city}
                      onChange={(city) =>
                        onChange({
                          ...settings,
                          courierRegions: courierRegions.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, city } : item,
                          ),
                        })
                      }
                    />
                    <NumberField
                      label="هزینه هر مسیر (تومان)"
                      value={region.shippingCost}
                      min={0}
                      onChange={(shippingCost) =>
                        onChange({
                          ...settings,
                          courierRegions: courierRegions.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, shippingCost }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm font-bold text-slate-700">
      {label}
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold text-slate-600">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: typeof Clock3;
  title: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-black text-slate-800">
      <Icon className="h-4 w-4 text-[#1269f5]" />
      {title}
    </p>
  );
}

function TimeWindowsEditor({
  windows,
  max,
  onChange,
}: {
  windows: Array<{ start: string; end: string }>;
  max: number;
  onChange: (windows: Array<{ start: string; end: string }>) => void;
}) {
  return (
    <>
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {windows.map((window, index) => (
          <div
            key={`${index}-${window.start}`}
            className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2 rounded-2xl bg-slate-50 p-3"
          >
            <label className="text-xs text-slate-500">
              شروع
              <input
                aria-label={`شروع بازه ${index + 1}`}
                type="time"
                value={window.start}
                onChange={(event) =>
                  onChange(
                    windows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, start: event.target.value }
                        : item,
                    ),
                  )
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2"
              />
            </label>
            <span className="pb-3 text-slate-400">تا</span>
            <label className="text-xs text-slate-500">
              پایان
              <input
                aria-label={`پایان بازه ${index + 1}`}
                type="time"
                value={window.end}
                onChange={(event) =>
                  onChange(
                    windows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, end: event.target.value }
                        : item,
                    ),
                  )
                }
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-2"
              />
            </label>
            <button
              type="button"
              disabled={windows.length === 1}
              onClick={() =>
                onChange(windows.filter((_, itemIndex) => itemIndex !== index))
              }
              aria-label="حذف بازه"
              className="mb-1 rounded-xl p-2 text-rose-600 disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={windows.length >= max}
        onClick={() =>
          onChange([...windows, { start: "09:00", end: "12:00" }])
        }
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-[#001A6E] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        افزودن بازه
      </button>
    </>
  );
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (value: number[]) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {weekdayOptions.map((day) => {
        const selected = value.includes(day.value);
        return (
          <label
            key={day.value}
            className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
              selected
                ? "border-rose-200 bg-rose-50 font-bold text-rose-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, day.value]
                    : value.filter((item) => item !== day.value),
                )
              }
              className="ml-2"
            />
            {day.label}
          </label>
        );
      })}
    </div>
  );
}
