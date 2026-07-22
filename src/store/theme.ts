import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ThemeState } from "@/types/theme";

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			dark: false,
			toggle: () => set((state) => ({ dark: !state.dark })),
			setDark: (value) => set({ dark: value }),
		}),
		{ name: "theme-storage" }
	)
);
