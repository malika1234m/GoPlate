"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { adminApi, getAdminToken, setAdminToken } from "@/lib/admin-api";
import { Btn, ErrorNote, Field, PasswordInput, inputCls } from "@/components/portal/ui";

export function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAdminToken()) router.replace("/admin");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await adminApi.login(email.trim(), password);
      setAdminToken(token);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "var(--font-poppins)" }}>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2.5">
            <Image src="/logo.png" alt="" width={38} height={38} priority className="rounded-xl" />
            <span className="text-xl font-extrabold tracking-wide text-ink">
              <span className="text-accent">Go</span>Plate
            </span>
          </div>
          <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
            Back office
          </p>
          <h1 className="mt-2 text-center text-2xl font-extrabold text-ink">Staff sign in</h1>

          <form
            onSubmit={submit}
            className="mt-8 space-y-4 rounded-[24px] border border-navy-700 bg-navy-900 p-7"
          >
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <PasswordInput value={password} onChange={setPassword} required />
            </Field>
            <ErrorNote message={error} />
            <Btn type="submit" loading={busy} className="w-full">
              Sign in
            </Btn>
            <p className="text-center text-xs leading-relaxed text-ink-faint">
              This is not the owner sign-in. Staff accounts are created on the server.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
