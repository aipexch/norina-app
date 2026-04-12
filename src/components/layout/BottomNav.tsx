"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Calendar, Clock, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/stundenplan", icon: Calendar },
  { href: "/statistiken", icon: BarChart3 },
  { href: "/dashboard", icon: Play, isCenter: true },
  { href: "/zeiterfassung", icon: Clock },
  { href: "/einstellungen", icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-5">
      <nav className="flex w-full max-w-[340px] items-center justify-around rounded-2xl bg-card px-2 py-2 shadow-lg">
        {NAV_ITEMS.map(({ href, icon: Icon, ...rest }) => {
          const isActive = pathname.startsWith(href);
          const isCenter = "isCenter" in rest && rest.isCenter;
          return (
            <Link
              key={href}
              href={href}
              className={
                isCenter
                  ? "flex h-14 w-14 -mt-5 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
                  : `flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-white"
                        : "text-muted-foreground"
                    }`
              }
            >
              <Icon
                className={isCenter ? "h-6 w-6 ml-0.5" : "h-[20px] w-[20px]"}
                strokeWidth={isCenter ? 2.5 : isActive ? 2 : 1.5}
                fill={isCenter ? "currentColor" : "none"}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
