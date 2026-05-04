"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type AccountStatus = "Premium" | "Standard" | "VIP"

export type NewClientPayload = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  accountStatus: AccountStatus
  accessCode: string
}

export function NewClientModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (client: NewClientPayload) => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [accountStatus, setAccountStatus] = useState<AccountStatus>("Premium")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ code: string; email: string } | null>(null)

  // Reset whenever the modal is reopened
  useEffect(() => {
    if (open) {
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      setAccountStatus("Premium")
      setSubmitting(false)
      setSuccess(null)
    }
  }, [open])

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim())
  const canSave =
    firstName.trim().length >= 2 && lastName.trim().length >= 1 && emailValid

  const submit = async () => {
    if (!canSave || submitting) return
    setSubmitting(true)

    // Generate a 6-digit access code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Simulate "Kunde anlegen & E-Mail senden"
    // TODO: Supabase sync — insert into `clients`, send invitation email
    await new Promise((r) => setTimeout(r, 600))

    const payload: NewClientPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      accountStatus,
      accessCode: code,
    }

    onSuccess(payload)
    setSuccess({ code, email: payload.email })
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle>Neuer Kunde</DialogTitle>
              <DialogDescription>
                Erfasse die Stammdaten. Beim Speichern wird automatisch ein 6-stelliger
                Zugangscode generiert und per E-Mail an den Kunden versendet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="ncm-first">
                    Vorname <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ncm-first"
                    placeholder="Markus"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ncm-last">
                    Nachname <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ncm-last"
                    placeholder="Weber"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ncm-email">
                  E-Mail <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ncm-email"
                  type="email"
                  placeholder="kunde@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {email.length > 0 && !emailValid && (
                  <p className="text-xs text-destructive">Ungültige E-Mail-Adresse.</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ncm-phone">Telefon</Label>
                <Input
                  id="ncm-phone"
                  placeholder="+41 79 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ncm-tier">Account-Status</Label>
                <Select
                  value={accountStatus}
                  onValueChange={(v) => setAccountStatus(v as AccountStatus)}
                >
                  <SelectTrigger id="ncm-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Abbrechen
              </Button>
              <Button onClick={submit} disabled={!canSave || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Wird angelegt…
                  </>
                ) : (
                  <>Kunde anlegen &amp; E-Mail senden</>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[var(--fin-gain)]" />
                Kunde erfolgreich angelegt
              </DialogTitle>
              <DialogDescription>
                Der Zugangscode wurde generiert und per E-Mail an den Kunden versendet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-md border border-[var(--fin-gain)]/30 bg-[var(--fin-gain)]/10 p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-[var(--fin-gain)]">
                  6-stelliger Zugangscode
                </p>
                <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-[0.35em] text-[var(--fin-gain)]">
                  {success.code}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <Mail className="size-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">E-Mail wurde gesendet an</span>
                <span className="ml-auto truncate font-medium">{success.email}</span>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onClose} className="w-full sm:w-auto">
                Schließen
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
