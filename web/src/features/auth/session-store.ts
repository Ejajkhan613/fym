"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession } from "@/features/auth/types";

type AuthSessionState = {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useAuthSession = create<AuthSessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "fym-web-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
