import BottomNav from "@/components/layout/BottomNav";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-background pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
