import { create } from "zustand";
import { ThemeState } from "@/types/theme";

export const useThemeStore = create<ThemeState>()(() => ({
	dark: false,
	toggle: () => {},
	setDark: () => {},
}));
