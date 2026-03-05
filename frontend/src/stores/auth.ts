import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  username: string | null;
  setAuth: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      setAuth: (token, username) => set({ token, username }),
      logout: () => set({ token: null, username: null }),
      isAuthenticated: () => get().token !== null,
    }),
    { name: "sc-auth" }
  )
);
