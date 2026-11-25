import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, FocusEvent, PointerEvent as ReactPointerEvent } from "react";

export interface HeaderDropdownProps {
  open: boolean;
  boundaryEvents: Pick<HTMLAttributes<HTMLDivElement>, "onPointerEnter" | "onPointerLeave" | "onBlur">;
  onToggle: () => void;
  onClose: () => void;
}

export function useHeaderDropdown<Key extends string, Root extends HTMLElement>() {
  const root = useRef<Root>(null);
  const [selection, setSelection] = useState<{ key: Key; pinned: boolean } | null>(null);
  const isOpen = selection !== null;

  useEffect(() => {
    if (!isOpen) return;

    function dismissOutside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setSelection(null);
      }
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.defaultPrevented || event.key !== "Escape") return;
      const container = root.current;
      if (container?.contains(document.activeElement)) {
        event.preventDefault();
        container.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus();
      }
      setSelection(null);
    }

    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [isOpen]);

  function close() {
    setSelection(null);
  }

  function toggle(key: Key) {
    setSelection(current => current?.key === key && current.pinned ? null : { key, pinned: true });
  }

  function boundary(key: Key) {
    return {
      onPointerEnter(event: ReactPointerEvent<HTMLElement>) {
        if (event.pointerType !== "mouse") return;
        setSelection(current => current?.key === key ? current : { key, pinned: false });
      },
      onPointerLeave(event: ReactPointerEvent<HTMLElement>) {
        if (event.currentTarget.contains(document.activeElement)) return;
        setSelection(current => current?.key === key && !current.pinned ? null : current);
      },
      onBlur(event: FocusEvent<HTMLElement>) {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setSelection(current => current?.key === key ? null : current);
      },
    };
  }

  return { root, active: selection?.key, boundary, close, toggle };
}
