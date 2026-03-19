"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Clock, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/stundenplan", icon: Calendar },
  { href: "/zeiterfassung", icon: Clock },
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/statistiken", icon: BarChart3 },
  { href: "/einstellungen", icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-5">
      <nav className="flex w-full max-w-[340px] items-center justify-around rounded-2xl bg-card px-2 py-2 shadow-lg">
        {NAV_ITEMS.map(({ href, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-muted-foreground"
              }`}
            >
              <Icon
                className="h-[20px] w-[20px]"
                strokeWidth={isActive ? 2 : 1.5}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
