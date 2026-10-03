"use client";

import { useEffect, useState } from "react";
import { Satellite, Menu, Wifi, WifiOff, Moon, Sun } from "lucide-react";
import type { MissionStatus } from "@/lib/types";

type Theme = "dark" | "light";
const THEME_STORAGE_KEY = "astro-health-theme";

export default function TopBar({
  status,
  connected,
  onMenuClick,
}: {
  status: MissionStatus | null;
  connected: boolean;
  onMenuClick: () => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-hull-700 bg-hull-950/90 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-1.5 text-hull-300 hover:bg-hull-800 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-teal/15 text-signal-teal">
            <Satellite size={18} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight text-hull-100">ASTRO HEALTH</p>
            <p className="text-[11px] leading-tight text-hull-500">Mission Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden text-right sm:block">
            <p className="tabular text-hull-300">
              {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
            </p>
            <p className="text-[11px] text-hull-500">local time</p>
          </div>
          <div className="h-8 w-px bg-hull-700" />
          <div className="tabular text-right">
            <p className="font-semibold text-hull-100">Day {status?.current_day ?? 0}</p>
            <p className="text-[11px] text-hull-500">mission day</p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
              connected
                ? "border-signal-teal/30 bg-signal-teal/10 text-signal-teal"
                : "border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
            }`}
          >
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? "Connected" : "Offline"}
          </span>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-hull-300 hover:bg-hull-800 hover:text-hull-100"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}
