"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/store/theme";

export function ThemeSync() {
	const dark = useThemeStore((state) => state.dark);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
	}, [dark]);

	return null;
}
