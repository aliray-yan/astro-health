"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Activity, Bell, Database, X, Rocket } from "lucide-react";
import type { MissionStatus } from "@/lib/types";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "indicators", label: "Indicators", icon: Activity },
  { id: "alerts", label: "Alert Log", icon: Bell },
  { id: "data-sources", label: "Data Sources", icon: Database },
];

export default function Sidebar({
  status,
  open,
  onClose,
  ready,
}: {
  status: MissionStatus | null;
  open: boolean;
  onClose: () => void;
  ready: boolean;
}) {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    if (!ready) return; // sections don't exist in the DOM until loading finishes
    const sections = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [ready]);

  const NavList = (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={onClose}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            active === id ? "bg-signal-teal/15 text-signal-teal" : "text-hull-300 hover:bg-hull-800 hover:text-hull-100"
          }`}
        >
          <Icon size={16} />
          {label}
        </a>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop: persistent left column */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-[73px] py-6 pr-4">
          {NavList}
          {status && (
            <div className="mt-6 rounded-xl border border-hull-700 bg-hull-850/60 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-hull-300">
                <Rocket size={13} className="text-signal-teal" />
                {status.astronaut_name}
              </div>
              <p className="mt-1 text-[11px] text-hull-500">
                {status.baseline_established ? "Baseline established" : "Establishing baseline…"}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile: drawer — always mounted so both open and close get a real
          transition (CSS transitions retarget smoothly on interruption;
          conditional rendering would just snap). */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`absolute inset-y-0 left-0 w-64 bg-hull-900 p-4 shadow-panel transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-hull-100">Navigation</span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-hull-400 hover:bg-hull-800" aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>
          {NavList}
        </div>
      </div>
    </>
  );
}
