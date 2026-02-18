import { StateStorage } from "zustand/middleware";

export const safeJSONStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name);

    if (!value) {
      return null;
    }

    try {
      JSON.parse(value);
      return value;
    } catch {
      localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};
