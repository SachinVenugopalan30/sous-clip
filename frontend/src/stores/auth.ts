import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  username: string | null;
  setAuth: (token: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      setAuth: (token, username) => set({ token, username }),
      logout: () => {
        set({ token: null, username: null });
        window.location.href = "/login";
      },
    }),
    { name: "sc-auth" }
  )
);
