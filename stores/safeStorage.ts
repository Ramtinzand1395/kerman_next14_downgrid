import { StateStorage } from "zustand/middleware";
import { safeParseJSON } from "@/helpers/safeParseJSON";

export const safeJSONStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name);

    if (!value) {
      return null;
    }

    const parsed = safeParseJSON(value);
    if (parsed === null) {
      localStorage.removeItem(name);
      return null;
    }
    return value;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },

  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};
