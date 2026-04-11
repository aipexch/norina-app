"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-5 text-center">
      <p className="text-[17px] font-semibold mb-2">Etwas ist schiefgelaufen</p>
      <p className="text-[15px] text-muted-foreground mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-2xl bg-primary px-6 py-3 text-[15px] font-medium text-white"
      >
        Nochmal versuchen
      </button>
    </div>
  );
}
