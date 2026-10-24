"use client";

import { useEffect, useMemo, useState } from "react";
import type { VariantSelectorGroup } from "@/types";
import {
  getAvailableOptionIds,
  resolveVariantId,
  selectionsForVariant,
  sortedSelectorGroups,
} from "@/lib/variantSelector";
import { useProductVariant } from "./ProductVariantContext";

function OptionButtons({
  group,
  value,
  available,
  onChange,
}: {
  group: VariantSelectorGroup;
  value: string;
  available: Set<string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role={group.displayType === "radio" ? "radiogroup" : "group"} aria-label={group.label}>
      {group.options.map((option) => {
        const disabled = !available.has(option.id);
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role={group.displayType === "radio" ? "radio" : undefined}
            aria-checked={group.displayType === "radio" ? selected : undefined}
            aria-pressed={group.displayType !== "radio" ? selected : undefined}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              selected
                ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm"
                : disabled
                  ? "cursor-not-allowed border-dashed border-zinc-200 bg-zinc-100 text-zinc-400 opacity-60"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
          >
            {group.displayType === "swatches" ? (
              <span
                aria-hidden="true"
                className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
                style={{ backgroundColor: option.color || "#6366f1" }}
              />
            ) : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function CustomVariantSelector() {
  const {
    product,
    activeVariants,
    selectedVariantId,
    selectedVariant,
    setSelectedVariantId,
  } = useProductVariant();
  const config = product.variantSelector;
  const groups = useMemo(() => sortedSelectorGroups(config), [config]);
  const activeVariantIds = useMemo(
    () => new Set(activeVariants.map((variant) => String(variant._id))),
    [activeVariants],
  );
  const activeConfig = useMemo(
    () =>
      config
        ? {
            ...config,
            mappings: config.mappings.filter((mapping) =>
              activeVariantIds.has(String(mapping.variantId)),
            ),
          }
        : undefined,
    [config, activeVariantIds],
  );
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    selectionsForVariant(config, selectedVariantId),
  );

  useEffect(() => {
    if (selectedVariantId && Object.keys(selections).length === 0) {
      setSelections(selectionsForVariant(config, selectedVariantId));
    }
  }, [config, selectedVariantId, selections]);

  if (!activeConfig?.enabled) return null;

  const handleChange = (groupId: string, optionId: string) => {
    const groupIndex = groups.findIndex((group) => group.id === groupId);
    const next = { ...selections };
    if (optionId) next[groupId] = optionId;
    else delete next[groupId];

    for (const downstreamGroup of groups.slice(groupIndex + 1)) {
      const available = getAvailableOptionIds(activeConfig, downstreamGroup.id, next);
      if (next[downstreamGroup.id] && !available.has(next[downstreamGroup.id])) {
        delete next[downstreamGroup.id];
      }
    }

    setSelections(next);
    setSelectedVariantId(resolveVariantId(activeConfig, next) || "");
  };

  const missingRequired = groups.filter(
    (group) => group.required && !selections[group.id],
  );

  return (
    <div className="mb-5 space-y-4" dir="rtl">
      {groups.map((group) => {
        const available = getAvailableOptionIds(activeConfig, group.id, selections);
        const value = selections[group.id] || "";
        return (
          <fieldset key={group.id} className="space-y-2.5">
            <legend className="flex w-full items-center justify-between text-xs font-bold text-zinc-800">
              <span>{group.label}{group.required ? <span className="mr-1 text-rose-500">*</span> : null}</span>
              {value ? <span className="font-medium text-indigo-600">{group.options.find((option) => option.id === value)?.label}</span> : null}
            </legend>
            {group.description ? <p className="text-xs leading-6 text-zinc-500">{group.description}</p> : null}
            {group.displayType === "dropdown" ? (
              <select
                aria-label={group.label}
                required={group.required}
                value={value}
                onChange={(event) => handleChange(group.id, event.target.value)}
                className="min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">{group.placeholder || `${group.label} را انتخاب کنید`}</option>
                {group.options.map((option) => (
                  <option key={option.id} value={option.id} disabled={!available.has(option.id)}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <OptionButtons group={group} value={value} available={available} onChange={(optionId) => handleChange(group.id, optionId)} />
            )}
          </fieldset>
        );
      })}

      <div aria-live="polite" className={`rounded-xl px-3 py-2.5 text-xs leading-6 ${selectedVariant ? (Number(selectedVariant.stock || 0) > 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700") : "bg-amber-50 text-amber-800"}`}>
        {selectedVariant
          ? Number(selectedVariant.stock || 0) > 0
            ? `انتخاب شما: ${groups.map((group) => group.options.find((option) => option.id === selections[group.id])?.label).filter(Boolean).join("، ")}`
            : "این ترکیب در حال حاضر ناموجود است."
          : missingRequired.length > 0
            ? `برای ادامه ${missingRequired.map((group) => `«${group.label}»`).join(" و ")} را انتخاب کنید.`
            : "این ترکیب برای خرید تعریف نشده است."}
      </div>
    </div>
  );
}
