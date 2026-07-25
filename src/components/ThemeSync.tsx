"use client";
import { useEffect } from "react";

export function ThemeSync() {
	useEffect(() => {
		document.documentElement.classList.remove("dark");
		if (typeof window !== "undefined") {
			try {
				localStorage.removeItem("theme-storage");
				localStorage.removeItem("theme");
			} catch (e) {
				// ignore
			}
		}
	}, []);

	return null;
}
