import BottomNav from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="safe-top mx-auto min-h-dvh max-w-lg bg-background pt-6 pb-32">
        {children}
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
