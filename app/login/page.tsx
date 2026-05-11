"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client"

type Step = "email" | "pin" | "success"

export default function AdminLoginPage() {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null)
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowserClient()
    return supabaseRef.current
  }

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError(null)
    setStep("pin")
  }

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const newPin = [...pin]
      digits.forEach((digit, i) => {
        if (index + i < 6) newPin[index + i] = digit
      })
      setPin(newPin)
      const nextIndex = Math.min(index + digits.length, 5)
      pinRefs.current[nextIndex]?.focus()
      return
    }
    if (!/^\d*$/.test(value)) return
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus()
    }
  }

  useEffect(() => {
    if (step !== "pin") return
    if (pin.every((d) => d !== "")) {
      handlePinSubmit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, step])

  const handlePinSubmit = async () => {
    const fullPin = pin.join("")
    if (fullPin.length !== 6) return
    setLoading(true)
    setError(null)

    const supabase = getSupabase()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: fullPin,
    })

    if (authError) {
      setLoading(false)
      setError("Ungültige Anmeldedaten")
      setPin(["", "", "", "", "", ""])
      setTimeout(() => pinRefs.current[0]?.focus(), 50)
      return
    }

    // Verify email is in admins whitelist
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (!admin) {
      await supabase.auth.signOut()
      setLoading(false)
      setError("Kein Zugang")
      setPin(["", "", "", "", "", ""])
      setStep("email")
      return
    }

    setStep("success")
    setTimeout(() => router.push("/"), 800)
  }

  const handleBack = () => {
    setStep("email")
    setPin(["", "", "", "", "", ""])
    setError(null)
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: "#0A1614" }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#D4F377 1px, transparent 1px), linear-gradient(90deg, #D4F377 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-6 py-12">

        {/* Email step */}
        {step === "email" && (
          <div className="flex flex-col items-center">
            <div className="mb-8">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-16 h-16 object-cover rounded-xl"
                src="https://d6gmlk5qn4ikdodg.public.blob.vercel-storage.com/magnific_slow-360-rotation-of-the-_2954349673.mp4"
              />
            </div>

            <div className="text-center mb-10">
              <h1
                className="text-3xl font-semibold tracking-tight mb-3"
                style={{ color: "rgb(212, 243, 119)" }}
              >
                Le Valeur Admin
              </h1>
              <p className="text-sm text-white/60 uppercase tracking-[0.2em]">
                Administration
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  placeholder="E-Mail-Adresse"
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full px-5 py-4 rounded-xl bg-white/[0.03] border text-white placeholder:text-white/30 focus:bg-white/[0.05] focus:outline-none transition-all duration-200 text-base"
                  style={{ borderColor: error ? "rgba(232,107,107,0.5)" : "rgba(212,243,119,0.2)" }}
                />
                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl font-medium text-white flex items-center justify-center gap-2 group transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: "oklch(0.45 0.12 160)" }}
              >
                <span>Weiter</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="text-center text-xs text-white/20 mt-10">
              Le Valeur Management AG · Internes System
            </p>
          </div>
        )}

        {/* PIN step */}
        {step === "pin" && (
          <div className="flex flex-col items-center">
            <div className="mb-8">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-16 h-16 object-cover rounded-xl"
                src="https://d6gmlk5qn4ikdodg.public.blob.vercel-storage.com/magnific_slow-360-rotation-of-the-_2954349673.mp4"
              />
            </div>

            <div className="text-center mb-10">
              <h1
                className="text-3xl font-semibold tracking-tight mb-3"
                style={{ color: "rgb(212, 243, 119)" }}
              >
                PIN eingeben
              </h1>
              <p className="text-sm text-white/60">6-stelliger Zugangscode</p>
              {email && (
                <p className="text-xs text-white/40 mt-2 font-mono">{email}</p>
              )}
            </div>

            <div className="w-full flex flex-col gap-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { pinRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pasted = e.clipboardData.getData("text")
                      handlePinChange(index, pasted)
                    }}
                    autoFocus={index === 0}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-semibold rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none transition-all duration-200 tabular-nums"
                    style={{
                      borderColor: digit ? "rgba(212,243,119,0.4)" : undefined,
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}
              {loading && (
                <p className="text-center text-sm text-white/50 flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Wird überprüft…
                </p>
              )}

              <button
                onClick={handleBack}
                className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>
            </div>
          </div>
        )}

        {/* Success step */}
        {step === "success" && (
          <div className="flex flex-col items-center">
            <div className="mb-8">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-16 h-16 object-cover rounded-xl"
                src="https://d6gmlk5qn4ikdodg.public.blob.vercel-storage.com/magnific_slow-360-rotation-of-the-_2954349673.mp4"
              />
            </div>
            <h1
              className="text-3xl font-semibold tracking-tight mb-3 text-center"
              style={{ color: "rgb(212, 243, 119)" }}
            >
              Willkommen
            </h1>
            <p className="text-sm text-white/60">Zugang gewährt</p>
          </div>
        )}

      </div>
    </div>
  )
}
