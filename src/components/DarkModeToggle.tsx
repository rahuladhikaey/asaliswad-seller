"use client";
import { useThemeStore } from "@/store/theme";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const { dark, toggle } = useThemeStore();

  return (
    <button onClick={toggle} className="relative w-16 h-8 rounded-full bg-foreground/[0.2] transition-all duration-500 shadow-4xl backdrop-blur-xl">
      <span className={`absolute top-[3px] left-[3px] w-[26px] h-[26px] rounded-full bg-primary flex items-center justify-center transition-transform duration-500 ${dark ? "translate-x-8" : "translate-x-0"}`}>
        {dark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
    </button>
  );
}
