"use client";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="pt-4 pb-2 px-5">
      <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
    </header>
  );
}
