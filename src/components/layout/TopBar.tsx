"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-lg items-center justify-between px-4">
        <h1 className="text-[17px] font-semibold tracking-tight">{title}</h1>
        <Link
          href="/einstellungen"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
        >
          <Settings className="h-[20px] w-[20px]" strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  );
}
