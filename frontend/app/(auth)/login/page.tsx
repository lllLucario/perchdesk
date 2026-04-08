"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokens = await api.post<{ access_token: string }>(
        "/api/v1/auth/login",
        { email, password }
      );
      // Store token first so the /auth/me request carries the Authorization header
      localStorage.setItem("access_token", tokens.access_token);
      const me = await api.get<{ id: string; email: string; name: string; role: string }>(
        "/api/v1/auth/me"
      );
      login(tokens.access_token, me);
      router.push("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(137,179,116,0.16),_transparent_32%),linear-gradient(180deg,_#edf3e8,_#f6faf1)] px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <p className="page-eyebrow mb-4">Quiet booking</p>
            <h1 className="text-6xl leading-[0.95] text-foreground">
              Quiet booking for focused spaces.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-text-muted">
              Return to a calmer booking workspace for desks, rooms, and focused corners across campus.
            </p>
            <div className="mt-10 space-y-4">
              {[
                "Browse buildings without dashboard clutter",
                "See recent spaces and personal recommendations",
                "Track bookings in one quiet timeline",
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-center gap-3 rounded-full bg-[color:color-mix(in_srgb,var(--color-accent-muted)_34%,white_66%)] px-4 py-3 text-sm text-text-strong"
                >
                  <span className="brand-mark h-9 w-9 text-sm">P</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="rounded-[2rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-muted)_18%,transparent),transparent_11rem),color-mix(in_srgb,var(--color-surface)_96%,white_4%)] p-6 shadow-[0_24px_56px_rgba(22,26,22,0.08)] md:p-8">
            <div className="mb-8">
              <Link href="/" className="brand-wordmark text-[1.55rem]">
                <span className="brand-mark">P</span>
                PerchDesk
              </Link>
              <h2 className="mt-6 font-serif text-4xl leading-tight text-foreground">
                Sign in to PerchDesk
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Use your account to continue into buildings, spaces, and bookings.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-strong">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-[1rem] border border-border bg-surface px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-strong">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-[1rem] border border-border bg-surface px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full py-3 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-5 text-sm text-text-muted">
              <span>No account?</span>
              <Link href="/register" className="font-medium text-accent hover:text-text-strong">
                Register
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
