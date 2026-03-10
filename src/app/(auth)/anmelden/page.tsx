"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

export default function AnmeldenPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-primary shadow-lg shadow-primary/20">
            <Clock className="h-9 w-9 text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">Norina</h1>
          <p className="mt-1 text-[15px] text-muted">Zeiterfassung für Lehrpersonen</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-[14px] text-danger">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl bg-card">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border-b border-border/50 bg-transparent px-4 py-3 text-[16px] outline-none placeholder:text-muted/50"
              placeholder="E-Mail"
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-transparent px-4 py-3 text-[16px] outline-none placeholder:text-muted/50"
              placeholder="Passwort"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-[17px] font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Anmelden..." : "Anmelden"}
          </button>
        </form>

        <p className="mt-8 text-center text-[15px] text-muted">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="font-semibold text-primary">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
