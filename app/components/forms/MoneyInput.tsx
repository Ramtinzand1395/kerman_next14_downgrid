"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"input">, "type" | "value" | "onChange" | "min" | "max" | "step"> & {
  value?: number | string | null;
  onValueChange: (value: string) => void;
  min?: number | string;
  max?: number | string;
  step?: number | string;
};

const separators = /[,٬\s]/g;

function normalize(value: string) {
  return value.replace(separators, "").replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٫/g, ".").replace(/−/g, "-");
}

function group(value: string) {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export default function MoneyInput({ value, onValueChange, min, max, step = 1, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const raw = value == null ? "" : normalize(String(value));
  const decimal = step === "any" || !Number.isInteger(Number(step));
  const allowed = decimal ? /^-?(?:\d+(?:\.\d*)?)?$/ : /^-?\d*$/;

  useEffect(() => {
    const amount = Number(raw);
    const increment = (amount - (min == null ? 0 : Number(min))) / Number(step);
    const validStep = step === "any" || Math.abs(increment - Math.round(increment)) < 1e-8;
    const valid = raw === "" || (Number.isFinite(amount) &&
      (min == null || amount >= Number(min)) &&
      (max == null || amount <= Number(max)) &&
      validStep &&
      (decimal || Number.isSafeInteger(amount)));
    inputRef.current?.setCustomValidity(valid ? "" : "مبلغ واردشده معتبر نیست.");
  }, [decimal, max, min, raw, step]);

  return (
    <input {...props} ref={inputRef} type="text" dir="ltr" inputMode={decimal ? "decimal" : "numeric"} value={group(raw)}
      onChange={(event) => {
        const input = event.currentTarget;
        const next = normalize(input.value);
        if (!allowed.test(next) || (min != null && Number(min) >= 0 && next.startsWith("-"))) return;

        const offset = normalize(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
        onValueChange(next);
        requestAnimationFrame(() => {
          if (document.activeElement !== input) return;
          const position = [...input.value].findIndex((_, index) => normalize(input.value.slice(0, index)).length === offset);
          const caret = position === -1 ? input.value.length : position;
          input.setSelectionRange(caret, caret);
        });
      }}
    />
  );
}
