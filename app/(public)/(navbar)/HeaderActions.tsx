"use client";

import CartDropdown from "./CartDropdown";
import UserBtn from "./UserBtn";
import { useHeaderDropdown } from "./useHeaderDropdown";

export default function HeaderActions() {
  const { root, active, boundary, toggle, close } = useHeaderDropdown<"user" | "cart", HTMLDivElement>();

  return (
    <div ref={root} className="contents">
      <UserBtn
        open={active === "user"}
        boundaryEvents={boundary("user")}
        onToggle={() => toggle("user")}
        onClose={close}
      />
      <CartDropdown
        open={active === "cart"}
        boundaryEvents={boundary("cart")}
        onToggle={() => toggle("cart")}
        onClose={close}
      />
    </div>
  );
}
