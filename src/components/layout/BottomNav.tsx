"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Clock, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stundenplan", label: "Stundenplan", icon: Calendar },
  { href: "/zeiterfassung", label: "Zeiten", icon: Clock },
  { href: "/statistiken", label: "Statistiken", icon: BarChart3 },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] ${
                isActive
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon
                className={`h-[22px] w-[22px] ${isActive ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
