"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Correo o contraseña incorrectos.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md glass-overlay rounded-3xl p-8 sm:p-10">
        <div className="mb-10">
          <span className="block text-base text-muted mb-6">
            Yorked Studio
          </span>
          <h1 className="text-5xl mb-2">
            Bienvenido.
          </h1>
          <p className="text-muted text-lg">Gestión interna de proyectos</p>
        </div>

        <label htmlFor="email" className="block text-sm text-ink mb-2">
          Correo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          className="w-full field px-3 py-2.5 text-sm mb-4 rounded-xl"
        />

        <label htmlFor="password" className="block text-sm text-ink mb-2">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full field px-3 py-2.5 text-sm mb-4 rounded-xl"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-accent text-accent-fg py-3 text-base disabled:opacity-40 hover:opacity-90 transition-opacity rounded-xl mt-2"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
