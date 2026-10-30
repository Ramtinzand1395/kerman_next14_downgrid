"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type {
  ProductVariant,
  VariantSelectorConfig,
  VariantSelectorDisplayType,
  VariantSelectorGroup,
} from "@/types";
import {
  sortedSelectorGroups,
} from "@/lib/variantSelector";

interface Props {
  value?: VariantSelectorConfig;
  variants: ProductVariant[];
  onChange: (value: VariantSelectorConfig) => void;
}

const EMPTY_CONFIG: VariantSelectorConfig = {
  enabled: false,
  version: 1,
  groups: [],
  mappings: [],
};

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function normalizeOrders(groups: VariantSelectorGroup[]) {
  return groups.map((group, order) => ({
    ...group,
    order,
    options: group.options.map((option, optionOrder) => ({
      ...option,
      order: optionOrder,
    })),
  }));
}

export default function VariantSelectorBuilder({ value, variants, onChange }: Props) {
  const config = value || EMPTY_CONFIG;
  const [optionSearch, setOptionSearch] = useState<Record<string, string>>({});
  const groups = useMemo(() => sortedSelectorGroups(config), [config]);

  const updateGroups = (nextGroups: VariantSelectorGroup[]) =>
    onChange({ ...config, groups: normalizeOrders(nextGroups) });

  const addGroup = () => {
    const id = makeId("group");
    updateGroups([
      ...groups,
      {
        id,
        key: id,
        label: "گروه جدید",
        displayType: "dropdown",
        required: true,
        order: groups.length,
        placeholder: "یک گزینه انتخاب کنید",
        description: "",
        options: [],
      },
    ]);
  };

  const updateGroup = (groupId: string, patch: Partial<VariantSelectorGroup>) =>
    updateGroups(groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));

  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    updateGroups(next);
  };

  const removeGroup = (group: VariantSelectorGroup) => {
    const isMapped = config.mappings.some((mapping) => mapping.optionIds[group.id]);
    if (
      isMapped &&
      !window.confirm(`گروه «${group.label}» در اتصال مدل‌ها استفاده شده است. حذف شود؟`)
    ) return;
    onChange({
      ...config,
      groups: normalizeOrders(groups.filter((item) => item.id !== group.id)),
      mappings: config.mappings.map((mapping) => {
        const optionIds = { ...mapping.optionIds };
        delete optionIds[group.id];
        return { ...mapping, optionIds };
      }),
    });
  };

  const addOption = (group: VariantSelectorGroup) =>
    updateGroup(group.id, {
      options: [
        ...group.options,
        {
          id: makeId("option"),
          label: "گزینه جدید",
          order: group.options.length,
        },
      ],
    });

  const updateOption = (
    group: VariantSelectorGroup,
    optionId: string,
    patch: Partial<VariantSelectorGroup["options"][number]>,
  ) =>
    updateGroup(group.id, {
      options: group.options.map((option) =>
        option.id === optionId ? { ...option, ...patch } : option,
      ),
    });

  const moveOption = (group: VariantSelectorGroup, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= group.options.length) return;
    const options = [...group.options];
    [options[index], options[target]] = [options[target], options[index]];
    updateGroup(group.id, { options });
  };

  const removeOption = (group: VariantSelectorGroup, optionId: string) => {
    const isMapped = config.mappings.some(
      (mapping) => mapping.optionIds[group.id] === optionId,
    );
    if (
      isMapped &&
      !window.confirm("این گزینه به یک یا چند مدل متصل است. اتصال‌ها نیز پاک شوند؟")
    ) return;
    onChange({
      ...config,
      groups: normalizeOrders(
        groups.map((item) =>
          item.id === group.id
            ? { ...item, options: item.options.filter((option) => option.id !== optionId) }
            : item,
        ),
      ),
      mappings: config.mappings.map((mapping) => {
        if (mapping.optionIds[group.id] !== optionId) return mapping;
        const optionIds = { ...mapping.optionIds };
        delete optionIds[group.id];
        return { ...mapping, optionIds };
      }),
    });
  };

  const setMappingOption = (variantId: string, groupId: string, optionId: string) => {
    const existing = config.mappings.find(
      (mapping) => String(mapping.variantId) === String(variantId),
    );
    const nextMapping = {
      variantId,
      optionIds: { ...(existing?.optionIds || {}), [groupId]: optionId },
    };
    onChange({
      ...config,
      mappings: [
        ...config.mappings.filter(
          (mapping) => String(mapping.variantId) !== String(variantId),
        ),
        nextMapping,
      ],
    });
  };

  return (
    <div dir="rtl" className="space-y-5 rounded-2xl border border-indigo-500/30 bg-slate-900/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">مدیریت گزینه‌های انتخاب محصول</h3>
          <p className="mt-1 text-xs leading-6 text-slate-400">
            گزینه‌های کوتاه را به مدل‌های واقعی محصول متصل کنید؛ قیمت و موجودی همچنان از خود مدل خوانده می‌شود.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-200">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => onChange({ ...config, enabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-600 text-indigo-600"
          />
          فعال‌سازی انتخاب‌گر سفارشی
        </label>
      </div>

      {config.enabled ? (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200">تنظیمات انتخاب‌گر و گروه‌ها</h4>
                <p className="mt-1 text-[11px] text-slate-500">گروه‌ها و گزینه‌ها را با دکمه‌های جهت مرتب کنید.</p>
              </div>
              <button type="button" onClick={addGroup} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                <Plus className="h-3.5 w-3.5" /> افزودن گروه
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-xs text-slate-400">هنوز گروهی ساخته نشده است.</div>
            ) : groups.map((group, groupIndex) => (
              <article key={group.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-[11px] text-slate-400">عنوان نمایشی
                    <input value={group.label} onChange={(event) => updateGroup(group.id, { label: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                  </label>
                  <label className="text-[11px] text-slate-400">کلید پایدار
                    <input dir="ltr" value={group.key} onChange={(event) => updateGroup(group.id, { key: event.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-left text-xs text-white outline-none focus:border-indigo-500" />
                  </label>
                  <label className="text-[11px] text-slate-400">نوع نمایش
                    <select value={group.displayType} onChange={(event) => updateGroup(group.id, { displayType: event.target.value as VariantSelectorDisplayType })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white">
                      <option value="dropdown">فهرست کشویی</option><option value="radio">دکمه رادیویی</option><option value="chips">دکمه انتخابی</option><option value="swatches">نمونه رنگی</option>
                    </select>
                  </label>
                  <label className="text-[11px] text-slate-400">متن راهنما
                    <input value={group.placeholder || ""} onChange={(event) => updateGroup(group.id, { placeholder: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                  </label>
                  <label className="text-[11px] text-slate-400 md:col-span-2 xl:col-span-3">توضیح اختیاری
                    <input value={group.description || ""} onChange={(event) => updateGroup(group.id, { description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                  </label>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 pb-2 text-xs text-slate-300"><input type="checkbox" checked={group.required} onChange={(event) => updateGroup(group.id, { required: event.target.checked })} /> الزامی</label>
                    <div className="flex gap-1">
                      <button type="button" aria-label="انتقال گروه به بالا" onClick={() => moveGroup(groupIndex, -1)} disabled={groupIndex === 0} className="rounded p-2 text-slate-400 hover:bg-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label="انتقال گروه به پایین" onClick={() => moveGroup(groupIndex, 1)} disabled={groupIndex === groups.length - 1} className="rounded p-2 text-slate-400 hover:bg-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" aria-label="حذف گروه" onClick={() => removeGroup(group)} className="rounded p-2 text-rose-400 hover:bg-rose-950/40"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-700 pt-3">
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-300">گزینه‌های {group.label}</span><button type="button" onClick={() => addOption(group)} className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"><Plus className="h-3 w-3" /> افزودن گزینه</button></div>
                  {group.options.length > 8 ? (
                    <label className="mb-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2"><Search className="h-3.5 w-3.5 text-slate-500" /><input value={optionSearch[group.id] || ""} onChange={(event) => setOptionSearch((current) => ({ ...current, [group.id]: event.target.value }))} placeholder="جستجو در گزینه‌ها..." className="w-full bg-transparent py-2 text-xs text-white outline-none" /></label>
                  ) : null}
                  <div className="space-y-2">
                    {group.options.map((option, optionIndex) => ({ option, optionIndex })).filter(({ option }) => option.label.includes(optionSearch[group.id] || "")).map(({ option, optionIndex }) => (
                      <div key={option.id} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_150px_auto]">
                        <input value={option.label} onChange={(event) => updateOption(group, option.id, { label: event.target.value })} className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none focus:border-indigo-500" />
                        <input type="color" title="رنگ نمونه" value={option.color || "#6366f1"} onChange={(event) => updateOption(group, option.id, { color: event.target.value })} className="hidden h-9 w-full rounded border border-slate-700 bg-slate-900 p-1 sm:block" />
                        <div className="flex"><button type="button" aria-label="انتقال گزینه به بالا" onClick={() => moveOption(group, optionIndex, -1)} className="p-2 text-slate-400"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="انتقال گزینه به پایین" onClick={() => moveOption(group, optionIndex, 1)} className="p-2 text-slate-400"><ArrowDown className="h-3.5 w-3.5" /></button><button type="button" aria-label="حذف گزینه" onClick={() => removeOption(group, option.id)} className="p-2 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button></div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-700">
            <div className="border-b border-slate-700 bg-slate-800 px-3 py-3"><h4 className="text-xs font-bold text-slate-200">اتصال به مدل‌های محصول</h4><p className="mt-1 text-[11px] text-slate-500">هر ردیف باید یک ترکیب یکتا داشته باشد. محصول پیش‌نویس می‌تواند اتصال ناقص داشته باشد، اما انتشار نه.</p></div>
            <div className="overflow-x-auto"><table className="min-w-full text-right text-xs"><thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">مدل واقعی</th>{groups.map((group) => <th key={group.id} className="min-w-40 px-3 py-2">{group.label}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{variants.map((variant) => { const variantId = String(variant._id || ""); const mapping = config.mappings.find((item) => String(item.variantId) === variantId); return <tr key={variantId} className="bg-slate-900/40"><td className="whitespace-nowrap px-3 py-3"><strong className="text-slate-200">{variant.title || "مدل بدون نام"}</strong><span className="mt-1 block font-mono text-[10px] text-slate-500">{variantId}</span></td>{groups.map((group) => <td key={group.id} className="px-3 py-3"><select aria-label={`${group.label} برای ${variant.title}`} value={mapping?.optionIds[group.id] || ""} onChange={(event) => setMappingOption(variantId, group.id, event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-white"><option value="">انتخاب نشده</option>{group.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></td>)}</tr>; })}</tbody></table></div>
          </section>

        </>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 p-4 text-xs leading-6 text-slate-400">انتخاب‌گر خاموش است و فروشگاه از انتخاب مدل قدیمی استفاده می‌کند. تنظیمات ذخیره‌شده حذف نمی‌شوند.</p>
      )}
    </div>
  );
}
