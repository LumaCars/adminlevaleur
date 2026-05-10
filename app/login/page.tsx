"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Mail } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Anmeldung fehlgeschlagen")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A1614]">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#D4F377 1px, transparent 1px), linear-gradient(90deg, #D4F377 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/logo.png"
            alt="Le Valeur"
            className="w-14 h-14 object-contain mb-6"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Le Valeur Admin
          </h1>
          <p className="text-xs text-white/40 mt-1 uppercase tracking-[0.2em]">
            Administration
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              placeholder="E-Mail-Adresse"
              required
              autoFocus
              autoComplete="email"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[rgba(212,243,119,0.4)] focus:outline-none transition-all duration-200 text-sm"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="Passwort"
              required
              autoComplete="current-password"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:border-[rgba(212,243,119,0.4)] focus:outline-none transition-all duration-200 text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: "#D4F377", color: "#0A1614" }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Anmelden"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-8">
          Le Valeur Management AG · Internes System
        </p>
      </div>
    </div>
  )
}
