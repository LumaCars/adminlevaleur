"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { NewClientModal } from "@/components/admin/new-client-modal"
import {
  Plus,
  Search,
  Upload,
  FileText,
  Download,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Pencil,
  Loader2,
  Copy,
  Wallet,
  CreditCard,
  LogOut,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type PageKey =
  | "uebersicht"
  | "kunden"
  | "vertraege"
  | "payouts"
  | "support"
  | "berichte"

type PayoutStatus = "Ausstehend" | "Ausgezahlt" | "Überfällig"
type ContractStatus = "Aktiv" | "Beendet" | "In Vorbereitung"
type TicketStatus = "Offen" | "In Bearbeitung" | "Gelöst"
type Interval = "Halbjährlich" | "Jährlich" | "Endfällig"

type Client = {
  id: string
  initials: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  premium: boolean
  tier?: "Premium" | "Standard" | "VIP"
  contractsCount: number
  capital: number
  nextPayout?: string
  notes?: string
  status: "Aktiv" | "Inaktiv"
  accessCode?: string
}

type Contract = {
  id: string
  no: string
  contractNo: string
  clientId: string
  clientName: string
  deposit: number
  yieldPa: number
  interval: Interval
  startYear: number
  durationYears: number
  endYear: number
  status: ContractStatus
  pdfUrl?: string
  startDate?: string
  endDate?: string
  capitalReceivedDate?: string
  portfolioAllocation?: Record<string, number>
}

type Payout = {
  id: string
  clientId: string
  clientName: string
  contractNo: string
  amount: number
  date: string
  interval: Interval
  status: PayoutStatus
  receipt?: string
}

type WalletAddress = { id: string; coin: string; address: string; exchange?: string }
type BbCard = { id: string; card_number: string; email: string }

type Ticket = {
  id: string
  status: TicketStatus
  contractNo: string
  clientName: string
  firstName?: string
  lastName?: string
  email?: string
  subject: string
  amount?: number
  receivedAt: string
  message?: string
}

type Report = {
  id: string
  name: string
  contractNo: string
  type: "Performance" | "Jahresbericht" | "Halbjährlich" | "Auszahlung" | "Vorschau"
  date: string
  period: string
  size: string
  status: "Bereit" | "Ausstehend"
  visible: boolean
  scope: "Allgemein" | "Kundenspezifisch"
  clientId?: string
  clientName?: string
  fileUrl?: string
  fileName?: string
}

// ----------------------------------------------------------------------------
// Mock data — TODO: Supabase sync
// ----------------------------------------------------------------------------

const initialClients: Client[] = []

const initialContracts: Contract[] = []

const initialPayouts: Payout[] = []

const initialTickets: Ticket[] = []

const initialReports: Report[] = []

const activities: { dot: string; text: string; time: string }[] = []

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

const fmtPct = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n) + "%"

function addDays(d: Date, days: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}
function addMonths(d: Date, months: number) {
  const r = new Date(d)
  r.setMonth(r.getMonth() + months)
  return r
}
function addYears(d: Date, years: number) {
  const r = new Date(d)
  r.setFullYear(r.getFullYear() + years)
  return r
}
function fmtDate(d: Date | null) {
  if (!d || isNaN(d.getTime())) return "—"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}
function parseISO(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function StatusPill({ status }: { status: PayoutStatus | ContractStatus | TicketStatus }) {
  const cls =
    status === "Ausgezahlt" || status === "Aktiv" || status === "Gelöst"
      ? "bg-[var(--fin-gain)]/10 text-[var(--fin-gain)] border-[var(--fin-gain)]/20"
      : status === "Ausstehend" || status === "In Vorbereitung" || status === "In Bearbeitung"
      ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30"
      : "bg-destructive/10 text-destructive border-destructive/20"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      {status}
    </span>
  )
}

function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("font-mono tabular-nums", className)}>{fmtEUR(value)}</span>
  )
}

function CardShell({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        hover && "lvm-card-hover",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Main component
// ----------------------------------------------------------------------------

export default function AdminDashboard() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const [page, setPage] = useState<PageKey>("uebersicht")
  const [loading, setLoading] = useState(true)

  const [clients, setClients] = useState<Client[]>(initialClients)
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [reports, setReports] = useState<Report[]>(initialReports)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cr, contr, pr, sr, rr] = await Promise.all([
        fetch("/api/admin/clients").then((r) => r.json()),
        fetch("/api/admin/contracts").then((r) => r.json()),
        fetch("/api/admin/payouts").then((r) => r.json()),
        fetch("/api/admin/support").then((r) => r.json()),
        fetch("/api/admin/reports").then((r) => r.json()),
      ])
      if (Array.isArray(cr.clients)) setClients(cr.clients)
      if (Array.isArray(contr.contracts)) setContracts(contr.contracts)
      if (Array.isArray(pr.payouts)) setPayouts(pr.payouts)
      if (Array.isArray(sr.tickets)) setTickets(sr.tickets)
      if (Array.isArray(rr.reports)) setReports(rr.reports)
    } catch (err) {
      console.error("[AdminDashboard] loadData failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Modal/sheet states
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newContractOpen, setNewContractOpen] = useState(false)
  const [newContractForClientId, setNewContractForClientId] = useState<string | null>(null)
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [activeContractId, setActiveContractId] = useState<string | null>(null)
  const [payoutEntryId, setPayoutEntryId] = useState<string | null>(null)
  const [ticketDetailId, setTicketDetailId] = useState<string | null>(null)
  const [profileInitialTab, setProfileInitialTab] = useState<"profil" | "vertraege" | "payouts" | "support">("profil")

  const tabs: { key: PageKey; label: string }[] = [
    { key: "uebersicht", label: "Übersicht" },
    { key: "kunden", label: "Kunden" },
    { key: "vertraege", label: "Verträge" },
    { key: "payouts", label: "Payouts" },
    { key: "support", label: "Support" },
    { key: "berichte", label: "Berichte" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" className="w-8 h-8 object-contain" alt="Le Valeur" />
            <span className="font-semibold tracking-tight">Le Valeur</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </div>
          {/* Center */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((t) => {
              const active = page === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setPage(t.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {t.label}
                </button>
              )
            })}
          </nav>
          {/* Right */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Admin · Le Valeur Management AG
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                      AD
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="md:hidden border-b border-border bg-card px-3 py-2 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const active = page === t.key
            return (
              <button
                key={t.key}
                onClick={() => setPage(t.key)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-6">
        {page === "uebersicht" && (
          <UebersichtPage
            clients={clients}
            contracts={contracts}
            payouts={payouts}
            tickets={tickets}
            onGoTo={setPage}
            onNewContract={() => {
              setPage("vertraege")
              setNewContractOpen(true)
            }}
            onNewClient={() => setNewClientOpen(true)}
          />
        )}
        {page === "kunden" && (
          <KundenPage
            clients={clients}
            contracts={contracts}
            loading={loading}
            onNewClient={() => setNewClientOpen(true)}
            onOpenProfile={(id) => {
              setProfileInitialTab("profil")
              setActiveClientId(id)
            }}
            onOpenContract={(id) => setActiveContractId(id)}
            onOpenProfileToContracts={(id) => {
              setProfileInitialTab("vertraege")
              setActiveClientId(id)
            }}
          />
        )}
        {page === "vertraege" && (
          <VertraegePage
            contracts={contracts}
            clients={clients}
            onOpenContract={(id) => setActiveContractId(id)}
            onNewContractOpen={() => setNewContractOpen(true)}
          />
        )}
        {page === "payouts" && (
          <PayoutsPage
            payouts={payouts}
            onErfassen={(id) => setPayoutEntryId(id)}
          />
        )}
        {page === "support" && (
          <SupportPage
            tickets={tickets}
            onOpenTicket={(id) => setTicketDetailId(id)}
          />
        )}
        {page === "berichte" && (
          <BerichtePage
            reports={reports}
            contracts={contracts}
            clients={clients}
            onToggle={(id, v) =>
              setReports((rs) => rs.map((r) => (r.id === id ? { ...r, visible: v } : r)))
            }
            onDelete={(id) => setReports((rs) => rs.filter((r) => r.id !== id))}
            onUpload={(r) => setReports((rs) => [r, ...rs])}
          />
        )}
      </main>

      {/* New Client Modal */}
      <NewClientModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onSuccess={() => {
          // Refresh from DB so the new client appears with correct server-side data
          loadData()
        }}
      />

      {/* New Contract Modal */}
      <NewContractDialog
        open={newContractOpen}
        onOpenChange={(b) => {
          setNewContractOpen(b)
          if (!b) setNewContractForClientId(null)
        }}
        clients={clients}
        defaultClientId={newContractForClientId ?? undefined}
        onCreate={() => {
          setNewContractOpen(false)
          setNewContractForClientId(null)
          loadData()
        }}
      />

      {/* Client profile sheet */}
      <ClientProfileSheet
        client={clients.find((c) => c.id === activeClientId) ?? null}
        payouts={payouts.filter(
          (p) => p.clientName === clients.find((c) => c.id === activeClientId)?.name,
        )}
        tickets={tickets.filter(
          (t) => t.clientName === clients.find((c) => c.id === activeClientId)?.name,
        )}
        initialTab={profileInitialTab}
        onClose={() => setActiveClientId(null)}
        onSave={(updated) => {
          setClients((arr) => arr.map((c) => (c.id === updated.id ? updated : c)))
        }}
        onOpenContract={(id) => {
          setActiveClientId(null)
          setActiveContractId(id)
        }}
        onAddContract={(clientId) => {
          setNewContractForClientId(clientId)
          setNewContractOpen(true)
        }}
      />

      {/* Contract detail sheet */}
      <ContractDetailSheet
        contract={contracts.find((c) => c.id === activeContractId) ?? null}
        onClose={() => setActiveContractId(null)}
        onRefresh={loadData}
        clients={clients}
      />

      {/* Payout entry modal */}
      <PayoutEntryDialog
        payout={payouts.find((p) => p.id === payoutEntryId) ?? null}
        onClose={() => setPayoutEntryId(null)}
        onConfirm={(receipt) => {
          setPayouts((arr) =>
            arr.map((p) =>
              p.id === payoutEntryId ? { ...p, status: "Ausgezahlt", receipt } : p,
            ),
          )
          setPayoutEntryId(null)
        }}
      />

      {/* Ticket detail modal */}
      <TicketDetailDialog
        ticket={tickets.find((t) => t.id === ticketDetailId) ?? null}
        onClose={() => setTicketDetailId(null)}
        onUpdate={(status, response) => {
          setTickets((arr) =>
            arr.map((t) =>
              t.id === ticketDetailId
                ? { ...t, status, message: t.message + "\n\n— Admin Antwort: " + response }
                : t,
            ),
          )
          setTicketDetailId(null)
        }}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page: Übersicht
// ----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  hint,
  badge,
}: {
  label: string
  value: string
  hint?: string
  badge?: { text: string; tone: "red" | "green" | "amber" }
}) {
  const toneCls =
    badge?.tone === "red"
      ? "bg-destructive/10 text-destructive"
      : badge?.tone === "green"
      ? "bg-[var(--fin-gain)]/10 text-[var(--fin-gain)]"
      : "bg-[var(--warning)]/10 text-[var(--warning)]"
  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-card-foreground">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", toneCls)}>
            {badge.text}
          </span>
        )}
      </div>
    </CardShell>
  )
}

function UebersichtPage({
  clients,
  contracts,
  payouts,
  tickets,
  onGoTo,
  onNewContract,
  onNewClient,
}: {
  clients: Client[]
  contracts: Contract[]
  payouts: Payout[]
  tickets: Ticket[]
  onGoTo: (p: PageKey) => void
  onNewContract: () => void
  onNewClient: () => void
}) {
  const totalCapital = contracts
    .filter((c) => c.status === "Aktiv")
    .reduce((s, c) => s + (Number(c.deposit) || 0), 0)
  const openTickets = tickets.filter((t) => t.status === "Offen").length

  const upcoming = payouts.filter((p) => p.status === "Ausstehend")

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
        <p className="text-sm text-muted-foreground">
          Aktueller Stand der Verwaltung.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aktive Kunden"
          value={String(clients.filter((c) => c.status === "Aktiv").length)}
          hint="Verifiziert"
        />
        <StatCard
          label="Aktive Verträge"
          value={String(contracts.filter((c) => c.status === "Aktiv").length)}
          hint="Laufende Mandate"
        />
        <StatCard
          label="Verwaltetes Kapital"
          value={fmtEUR(totalCapital)}
          hint="Aus aktiven Verträgen"
        />
        <StatCard
          label="Offene Support-Anfragen"
          value={String(openTickets)}
          badge={openTickets > 0 ? { text: `${openTickets} offen`, tone: "red" } : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onNewClient}>
          <Plus className="size-4" /> Neuer Kunde
        </Button>
        <Button variant="outline" onClick={onNewContract}>
          <Plus className="size-4" /> Neuer Vertrag
        </Button>
        <Button variant="outline" onClick={() => onGoTo("payouts")}>
          Payout erfassen
        </Button>
        <Button variant="outline" onClick={() => onGoTo("support")}>
          Support öffnen
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <CardShell className="lg:col-span-3 p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Nächste Payouts</h2>
            <p className="text-xs text-muted-foreground">
              Anstehende Auszahlungen nach Fälligkeit.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Vertragsnr.</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Fällig am</TableHead>
                  <TableHead>Intervall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell className="font-mono text-xs">{p.contractNo}</TableCell>
                    <TableCell className="text-right">
                      <Money value={p.amount} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(parseISO(p.date))}</TableCell>
                    <TableCell>{p.interval}</TableCell>
                    <TableCell>
                      <StatusPill status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => onGoTo("payouts")}>
                        Erfassen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {upcoming.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Keine ausstehenden Payouts
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardShell>

        <CardShell className="lg:col-span-2 p-5">
          <h2 className="font-semibold">Letzte Aktivitäten</h2>
          <p className="text-xs text-muted-foreground">Ereignisse der letzten Tage.</p>
          <ul className="mt-4 space-y-4">
            {activities.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cn("mt-1.5 size-2 rounded-full", a.dot)} />
                <div className="flex-1">
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page: Kunden
// ----------------------------------------------------------------------------

function KundenPage({
  clients,
  contracts,
  loading = false,
  onNewClient,
  onOpenProfile,
  onOpenContract,
  onOpenProfileToContracts,
}: {
  clients: Client[]
  contracts: Contract[]
  loading?: boolean
  onNewClient: () => void
  onOpenProfile: (id: string) => void
  onOpenContract: (id: string) => void
  onOpenProfileToContracts: (id: string) => void
}) {
  const [q, setQ] = useState("")
  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.email.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kunden</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Wird geladen…" : `${filtered.length} Einträge`}
          </p>
        </div>
        <Button onClick={onNewClient}>
          <Plus className="size-4" /> Neuer Kunde
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche nach Name, E-Mail, Vertragsnummer..."
          className="pl-9 h-11"
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardShell key={i} className="p-5" hover={false}>
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Skeleton className="h-8 rounded-md" />
                    <Skeleton className="h-8 rounded-md" />
                    <Skeleton className="h-8 rounded-md" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              </div>
            </CardShell>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold">Noch keine Kunden</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege den ersten Kunden an — der Zugangscode wird automatisch generiert.
          </p>
          <Button className="mt-4" onClick={onNewClient}>
            <Plus className="size-4" /> Neuer Kunde
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {!loading && filtered.map((c) => {
          const clientContracts = contracts.filter((k) => k.clientId === c.id)
          const displayCount = c.contractsCount || clientContracts.length
          const displayCapital = Number(c.capital) || clientContracts
            .filter((k) => k.status === "Aktiv")
            .reduce((s, k) => s + (Number(k.deposit) || 0), 0)
          return (
          <CardShell key={c.id} className="p-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  {c.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  {c.premium && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                      Premium Account
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.email}</p>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Verträge</p>
                    <p className="font-mono tabular-nums font-medium">{displayCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kapital</p>
                    <Money value={displayCapital} className="font-medium" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nächster Payout</p>
                    <p className="font-mono tabular-nums font-medium">{c.nextPayout ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => onOpenProfile(c.id)}>
                    Profil öffnen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={clientContracts.length === 0}
                    onClick={() => {
                      if (clientContracts.length === 1) {
                        onOpenContract(clientContracts[0].id)
                      } else if (clientContracts.length > 1) {
                        onOpenProfileToContracts(c.id)
                      }
                    }}
                  >
                    {clientContracts.length > 1 ? "Verträge ansehen" : "Vertrag ansehen"}
                  </Button>
                </div>
              </div>
            </div>
          </CardShell>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Page: Verträge
// ----------------------------------------------------------------------------

function VertraegePage({
  contracts,
  clients,
  onOpenContract,
  onNewContractOpen,
}: {
  contracts: Contract[]
  clients: Client[]
  onOpenContract: (id: string) => void
  onNewContractOpen: () => void
}) {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [interval, setInterval] = useState("all")
  const [year, setYear] = useState("all")

  const filtered = contracts.filter((c) => {
    if (q && !c.contractNo.toLowerCase().includes(q.toLowerCase()) && !c.clientName.toLowerCase().includes(q.toLowerCase())) return false
    if (status !== "all" && c.status !== status) return false
    if (interval !== "all" && c.interval !== interval) return false
    if (year !== "all" && String(c.startYear) !== year) return false
    return true
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verträge</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} Einträge</p>
        </div>
        <Button onClick={onNewContractOpen}>
          <Plus className="size-4" /> Neuer Vertrag
        </Button>
      </div>

      <CardShell className="p-4" hover={false}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Vertragsnr. oder Kunde..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="Aktiv">Aktiv</SelectItem>
              <SelectItem value="Beendet">Beendet</SelectItem>
              <SelectItem value="In Vorbereitung">In Vorbereitung</SelectItem>
            </SelectContent>
          </Select>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Intervall" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Intervalle</SelectItem>
              <SelectItem value="Halbjährlich">Halbjährlich</SelectItem>
              <SelectItem value="Jährlich">Jährlich</SelectItem>
              <SelectItem value="Endfällig">Endfällig</SelectItem>
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Jahr" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Jahre</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardShell>

      <CardShell className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Nr.</TableHead>
                <TableHead>Vertragsnr.</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead className="text-right">Einlage</TableHead>
                <TableHead className="text-right">Rendite p.a.</TableHead>
                <TableHead>Intervall</TableHead>
                <TableHead>Laufzeit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-muted-foreground">{c.no}</TableCell>
                  <TableCell className="font-mono text-xs">{c.contractNo}</TableCell>
                  <TableCell>{c.clientName}</TableCell>
                  <TableCell className="text-right">
                    <Money value={c.deposit} />
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-[var(--fin-gain)]">
                    {fmtPct(c.yieldPa)}
                  </TableCell>
                  <TableCell>{c.interval}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.durationYears} J (→{c.endYear})
                  </TableCell>
                  <TableCell><StatusPill status={c.status} /></TableCell>
                  <TableCell>
                    {c.pdfUrl ? (
                      <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="size-8">
                          <Download className="size-4" />
                        </Button>
                      </a>
                    ) : (
                      <Button size="icon" variant="ghost" className="size-8 opacity-30" disabled>
                        <FileText className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onOpenContract(c.id)}>
                      Öffnen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                    Keine Verträge gefunden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardShell>
    </div>
  )
}

// ----------------------------------------------------------------------------
// New Contract Dialog
// ----------------------------------------------------------------------------

function NewContractDialog({
  open,
  onOpenChange,
  clients,
  defaultClientId,
  onCreate,
  editMode,
  existingContract,
}: {
  open: boolean
  onOpenChange: (b: boolean) => void
  clients: Client[]
  defaultClientId?: string
  onCreate: () => void
  editMode?: boolean
  existingContract?: Contract
}) {
  const [clientId, setClientId] = useState<string>(defaultClientId ?? clients[0]?.id ?? "")

  useEffect(() => {
    if (!open) return
    if (editMode && existingContract) {
      setClientId(existingContract.clientId)
      const parts = existingContract.contractNo.split('-')
      setYear(parts[2] ?? '2026')
      setMmtt(parts[3] ?? '')
      setSeq(parts[4] ?? '')
      setDeposit(String(existingContract.deposit))
      setYieldPa(String(existingContract.yieldPa))
      setDuration(String(existingContract.durationYears))
      setInterval(existingContract.interval)
      setKapDate(existingContract.capitalReceivedDate ?? '')
      setStatus(existingContract.status)
      if (existingContract.portfolioAllocation && Object.keys(existingContract.portfolioAllocation).length > 0) {
        setAlloc(existingContract.portfolioAllocation as typeof alloc)
      }
      setUploadFiles([])
      setFormError(null)
    } else {
      setClientId(defaultClientId ?? clients[0]?.id ?? '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMode, existingContract, defaultClientId, clients])
  const [year, setYear] = useState("2026")
  const [mmtt, setMmtt] = useState("")
  const [seq, setSeq] = useState("")
  const [deposit, setDeposit] = useState("75000")
  const [yieldPa, setYieldPa] = useState("8.5")
  const [duration, setDuration] = useState("5")
  const [interval, setInterval] = useState<Interval>("Jährlich")
  const [kapDate, setKapDate] = useState("")
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [internalFiles, setInternalFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [alloc, setAlloc] = useState({
    Technologie: 25,
    Gesundheit: 15,
    Rohstoffe: 10,
    Immobilien: 20,
    Anleihen: 20,
    Liquidität: 5,
    Sonstige: 5,
  })
  const [status, setStatus] = useState<ContractStatus>("In Vorbereitung")

  const allocSum = Object.values(alloc).reduce((s, v) => s + (Number(v) || 0), 0)

  const contractNo = `DV-LVMAG-${year}-${(mmtt || "MMTT").padEnd(4, "_").slice(0, 4)}-${(seq || "0001").padStart(4, "0")}`

  // Date logic
  const kap = parseISO(kapDate)
  const start = kap ? addDays(kap, 30) : null
  const end = start && duration ? addYears(start, Number(duration)) : null
  const firstPayout = (() => {
    if (!start) return null
    if (interval === "Jährlich") return addDays(addMonths(start, 12), 30)
    if (interval === "Halbjährlich") return addDays(addMonths(start, 6), 30)
    if (interval === "Endfällig" && end) return addDays(end, 30)
    return null
  })()

  const reset = () => {
    setMmtt("")
    setSeq("")
    setUploadFiles([])
    setInternalFiles([])
    setFormError(null)
    setKapDate("")
  }

  async function handleCreate() {
    if (!kapDate) { setFormError("Bitte Kapitaleingang-Datum eingeben."); return }
    if (allocSum !== 100) { setFormError("Portfolio-Allokation muss 100% ergeben."); return }

    setUploading(true)
    setFormError(null)
    try {
      if (editMode && existingContract) {
        const res = await fetch("/api/admin/contracts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingContract.id,
            contract_number: contractNo,
            investment_amount: Number(deposit),
            rendite_pa: Number(yieldPa),
            duration_years: Number(duration),
            payout_interval: interval,
            capital_received_date: kapDate,
            portfolio_allocation: alloc,
            status,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setFormError(data.error || "Fehler beim Speichern."); return }
        reset()
        onCreate()
        return
      }

      const client = clients.find((c) => c.id === clientId)
      if (!client) { setFormError("Bitte einen Kunden auswählen."); return }

      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          contract_number: contractNo,
          investment_amount: Number(deposit),
          rendite_pa: Number(yieldPa),
          duration_years: Number(duration),
          payout_interval: interval,
          capital_received_date: kapDate,
          portfolio_allocation: alloc,
          status,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || "Fehler beim Speichern.")
        return
      }

      // Upload client-visible documents
      for (const file of uploadFiles) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("contract_id", data.contract.id)
        fd.append("client_id", clientId)
        fd.append("file_name", file.name)
        fd.append("visible_to_client", "true")
        try {
          await fetch("/api/admin/upload-document", { method: "POST", body: fd })
        } catch {
          console.error("[NewContractDialog] Document upload failed:", file.name)
        }
      }
      // Upload internal-only documents
      for (const file of internalFiles) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("contract_id", data.contract.id)
        fd.append("client_id", clientId)
        fd.append("file_name", file.name)
        fd.append("visible_to_client", "false")
        try {
          await fetch("/api/admin/upload-document", { method: "POST", body: fd })
        } catch {
          console.error("[NewContractDialog] Internal document upload failed:", file.name)
        }
      }

      reset()
      onCreate()
    } catch {
      setFormError("Verbindungsfehler. Bitte erneut versuchen.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Vertrag bearbeiten" : "Neuer Vertrag"}</DialogTitle>
          <DialogDescription>
            {editMode
              ? "Vertragskonditionen anpassen. Payout-Plan wird neu berechnet."
              : "Erfasse einen neuen Direktinvestitionsvertrag. Felder werden live berechnet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1 — Kunde */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1 · Kunde</h3>
            <div className="flex gap-3">
              <Select value={clientId} onValueChange={setClientId} disabled={!!defaultClientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Kunde auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!defaultClientId && (
                <Button variant="outline" type="button">+ Neuen Kunden anlegen</Button>
              )}
            </div>
          </section>

          {/* Section 2 — Vertragsnummer */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">2 · Vertragsnummer</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground select-none">
                DV-LVMAG-
              </span>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">—</span>
              <Input
                value={mmtt}
                onChange={(e) => setMmtt(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="MMTT"
                maxLength={4}
                className="w-24 font-mono"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                value={seq}
                onChange={(e) => setSeq(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0001"
                maxLength={4}
                className="w-24 font-mono"
              />
            </div>
            <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Vorschau</p>
              <p className="font-mono text-primary text-sm">{contractNo}</p>
            </div>
          </section>

          {/* Section 3 — Konditionen */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">3 · Konditionen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Investitionssumme €</Label>
                <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Rendite p.a. %</Label>
                <Input value={yieldPa} onChange={(e) => setYieldPa(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Laufzeit</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {i + 1} Jahr{i === 0 ? "" : "e"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Auszahlungsintervall</Label>
                <Select value={interval} onValueChange={(v) => setInterval(v as Interval)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Halbjährlich">Halbjährlich</SelectItem>
                    <SelectItem value="Jährlich">Jährlich</SelectItem>
                    <SelectItem value="Endfällig">Endfällig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 4 — Datum-Logik */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">4 · Datum-Logik</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kapitaleingang</Label>
                <Input type="date" value={kapDate} onChange={(e) => setKapDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Bilanzierungsfrist</Label>
                <Input value="30 Tage" readOnly className="bg-muted font-mono text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Vertragsstart</Label>
                <Input
                  value={fmtDate(start)}
                  readOnly
                  className="bg-muted font-mono text-[var(--fin-gain)]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Erstes Payout-Datum</Label>
                <Input
                  value={fmtDate(firstPayout)}
                  readOnly
                  className="bg-muted font-mono text-[var(--fin-gain)]"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-muted-foreground">Vertragsende</Label>
                <Input
                  value={fmtDate(end)}
                  readOnly
                  className="bg-muted font-mono text-destructive"
                />
              </div>
            </div>
          </section>

          {/* Section 5 — Allokation */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">5 · Portfolio Allokation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(alloc).map(([k, v]) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs">{k} %</Label>
                  <Input
                    type="number"
                    value={v}
                    onChange={(e) =>
                      setAlloc((a) => ({ ...a, [k]: Number(e.target.value) || 0 }))
                    }
                    className="font-mono"
                  />
                </div>
              ))}
            </div>
            <div
              className={cn(
                "rounded-md px-3 py-2 text-sm font-mono",
                allocSum === 100
                  ? "bg-[var(--fin-gain)]/10 text-[var(--fin-gain)]"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {allocSum === 100
                ? "Summe: 100% ✓"
                : `Summe: ${allocSum}% — muss 100% ergeben`}
            </div>
          </section>

          {/* Section 6A — Vertragsdokumente (client-visible) */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">6 · Vertragsdokumente</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 mt-1">
                ✓ Sichtbar im Kundenportal
              </span>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-emerald-200/60 bg-emerald-50/20 px-6 py-6 text-center text-sm cursor-pointer transition hover:border-emerald-400/60 hover:bg-emerald-50/40 text-muted-foreground">
              <Upload className="size-5 text-emerald-600" />
              Vertragsdokumente hochladen (.pdf, .doc, .docx)
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  setUploadFiles((prev) => [...prev, ...files])
                  e.target.value = ""
                }}
              />
            </label>
            {uploadFiles.length > 0 && (
              <div className="space-y-1">
                {uploadFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-emerald-200/60 bg-emerald-50/30 px-3 py-1.5">
                    <span className="font-mono text-xs truncate text-emerald-700">{f.name}</span>
                    <Button size="icon" variant="ghost" className="size-6 shrink-0" type="button" onClick={() => setUploadFiles(uploadFiles.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 6B — Interne Dokumente (not visible to client) */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">7 · Interne Dokumente</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 mt-1">
                🔒 Nur intern — nicht für Kunden sichtbar
              </span>
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-amber-200/60 bg-amber-50/20 px-6 py-6 text-center text-sm cursor-pointer transition hover:border-amber-400/60 hover:bg-amber-50/40 text-muted-foreground">
              <Upload className="size-5 text-amber-600" />
              Interne Dokumente hochladen (Ausweis, IBAN, KYC…)
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  setInternalFiles((prev) => [...prev, ...files])
                  e.target.value = ""
                }}
              />
            </label>
            {internalFiles.length > 0 && (
              <div className="space-y-1">
                {internalFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-amber-200/60 bg-amber-50/30 px-3 py-1.5">
                    <span className="font-mono text-xs truncate text-amber-700">{f.name}</span>
                    <Button size="icon" variant="ghost" className="size-6 shrink-0" type="button" onClick={() => setInternalFiles(internalFiles.filter((_, j) => j !== i))}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 8 — Status */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">8 · Status</h3>
            <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Aktiv">Aktiv</SelectItem>
                <SelectItem value="In Vorbereitung">In Vorbereitung</SelectItem>
                <SelectItem value="Beendet">Beendet</SelectItem>
              </SelectContent>
            </Select>
          </section>
        </div>

        {formError && (
          <p className="text-sm text-destructive border border-destructive/20 rounded-md px-3 py-2 bg-destructive/5">
            {formError}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={uploading} className="flex-1 sm:flex-none">
            {uploading ? (
              <><Loader2 className="size-4 animate-spin" /> Wird gespeichert…</>
            ) : (
              "Speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Contract Detail Sheet
// ----------------------------------------------------------------------------

type DocRecord = { id: string; file_name: string; file_url: string; uploaded_at: string; visible_to_client: boolean }

function ContractDetailSheet({
  contract,
  onClose,
  onRefresh,
  clients,
}: {
  contract: Contract | null
  onClose: () => void
  onRefresh?: () => void
  clients: Client[]
}) {
  const open = !!contract
  const [fetchedPayouts, setFetchedPayouts] = useState<Payout[]>([])
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [docUploading, setDocUploading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!contract) { setFetchedPayouts([]); setDocs([]); return }
    fetch(`/api/admin/payouts?contract_id=${contract.id}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.payouts)) setFetchedPayouts(d.payouts) })
      .catch(console.error)
    fetch(`/api/admin/documents?contract_id=${contract.id}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.documents)) setDocs(d.documents) })
      .catch(console.error)
  }, [contract])

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>, visibleToClient: boolean) {
    if (!contract) return
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setDocUploading(true)
    for (const file of files) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("contract_id", contract.id)
      fd.append("client_id", contract.clientId)
      fd.append("file_name", file.name)
      fd.append("visible_to_client", String(visibleToClient))
      try {
        const res = await fetch("/api/admin/upload-document", { method: "POST", body: fd })
        const data = await res.json()
        if (res.ok) {
          setDocs((prev) => [{
            id: data.id,
            file_name: data.file_name,
            file_url: data.url,
            uploaded_at: new Date().toISOString(),
            visible_to_client: visibleToClient,
          }, ...prev])
        }
      } catch { /* non-fatal */ }
    }
    e.target.value = ""
    setDocUploading(false)
  }

  async function handleDocDelete(id: string) {
    const res = await fetch(`/api/admin/documents?id=${id}`, { method: "DELETE" })
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const schedule = useMemo(() => {
    if (fetchedPayouts.length > 0) {
      return fetchedPayouts.map((p) => ({
        date: p.date,
        amount: p.amount,
        status: p.status,
      }))
    }
    if (!contract) return []
    const items: { date: string; amount: number; status: PayoutStatus }[] = []
    const yearly = (contract.deposit * contract.yieldPa) / 100
    const startYear = contract.startYear
    if (contract.interval === "Jährlich") {
      for (let i = 1; i <= contract.durationYears; i++) {
        items.push({
          date: `01.03.${startYear + i}`,
          amount: yearly,
          status: i <= 0 ? "Ausgezahlt" : "Ausstehend",
        })
      }
    } else if (contract.interval === "Halbjährlich") {
      for (let i = 1; i <= contract.durationYears * 2; i++) {
        const yr = startYear + Math.ceil(i / 2)
        const month = i % 2 === 1 ? "09" : "03"
        items.push({
          date: `15.${month}.${yr}`,
          amount: yearly / 2,
          status: "Ausstehend",
        })
      }
    } else {
      items.push({
        date: `01.06.${startYear + contract.durationYears}`,
        amount: yearly * contract.durationYears,
        status: "Ausstehend",
      })
    }
    return items
  }, [contract, fetchedPayouts])

  const yearlyReturn = contract ? (contract.deposit * contract.yieldPa) / 100 : 0
  const totalReturn = contract ? yearlyReturn * contract.durationYears : 0
  const paidOut = fetchedPayouts
    .filter((p) => p.status === "Ausgezahlt")
    .reduce((s, p) => s + p.amount, 0)
  const open_ = totalReturn - paidOut

  return (
    <>
    <Sheet open={open} onOpenChange={(b) => !b && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {contract && (
          <>
            <SheetHeader className="px-6 py-4 border-b border-border">
              <SheetTitle className="font-mono text-base">{contract.contractNo}</SheetTitle>
              <SheetDescription>{contract.clientName} · {contract.status}</SheetDescription>
            </SheetHeader>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="rounded-md border-l-4 border-l-primary border border-border bg-primary/5 p-4 space-y-2">
                <h3 className="text-sm font-semibold">Rendite-Übersicht</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Rendite pro Jahr</p>
                    <Money value={yearlyReturn} className="font-medium text-[var(--fin-gain)]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rendite gesamt</p>
                    <Money value={totalReturn} className="font-medium text-[var(--fin-gain)]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bereits ausgezahlt</p>
                    <Money value={paidOut} className="font-medium" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Noch offen</p>
                    <Money value={open_} className="font-medium" />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Nächster Payout</p>
                    <p className="font-mono text-sm">
                      {schedule[0]?.date ?? "—"}{" "}
                      <span className="text-muted-foreground">· in 47 Tagen</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Readonly fields */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <ReadField label="Einlage" value={fmtEUR(contract.deposit)} />
                <ReadField label="Rendite p.a." value={fmtPct(contract.yieldPa)} />
                <ReadField label="Intervall" value={contract.interval} />
                <ReadField label="Laufzeit" value={`${contract.durationYears} Jahre`} />
                <ReadField
                  label="Vertragsstart"
                  value={contract.startDate ? fmtDate(parseISO(contract.startDate)) : `${contract.startYear}`}
                />
                <ReadField
                  label="Vertragsende"
                  value={contract.endDate ? fmtDate(parseISO(contract.endDate)) : `${contract.endYear}`}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Bearbeiten
                </Button>
              </div>

              {/* Documents — Section A: Client-visible */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Vertragsdokumente</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 mt-0.5">
                      ✓ Sichtbar im Kundenportal
                    </span>
                  </div>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        {docUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        {" "}Hochladen
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      multiple
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, true)}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  {docs.filter((d) => d.visible_to_client !== false).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline truncate">
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{d.file_name}</span>
                      </a>
                      <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => handleDocDelete(d.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  {docs.filter((d) => d.visible_to_client !== false).length === 0 && !docUploading && (
                    <p className="text-xs text-muted-foreground">Keine Vertragsdokumente.</p>
                  )}
                </div>
              </div>

              {/* Documents — Section B: Internal only */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Interne Dokumente</h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 mt-0.5">
                      🔒 Nur intern — nicht für Kunden sichtbar
                    </span>
                  </div>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        {docUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        {" "}Hochladen
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, false)}
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  {docs.filter((d) => d.visible_to_client === false).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-amber-200/50 bg-amber-50/30 px-3 py-2">
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:underline truncate">
                        <FileText className="size-4 shrink-0 text-amber-600" />
                        <span className="truncate">{d.file_name}</span>
                      </a>
                      <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => handleDocDelete(d.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  {docs.filter((d) => d.visible_to_client === false).length === 0 && !docUploading && (
                    <p className="text-xs text-muted-foreground">Keine internen Dokumente.</p>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Auszahlungsplan</h3>
                <CardShell className="overflow-hidden p-0" hover={false}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{s.date}</TableCell>
                          <TableCell className="text-right">
                            <Money value={s.amount} />
                          </TableCell>
                          <TableCell><StatusPill status={s.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardShell>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    {contract && (
      <NewContractDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        clients={clients}
        editMode={true}
        existingContract={contract}
        onCreate={() => {
          setEditOpen(false)
          onRefresh?.()
        }}
      />
    )}
    </>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono tabular-nums font-medium">{value}</p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Client Profile Sheet
// ----------------------------------------------------------------------------

function ClientProfileSheet({
  client,
  payouts,
  tickets,
  initialTab = "profil",
  onClose,
  onSave,
  onOpenContract,
  onAddContract,
}: {
  client: Client | null
  payouts: Payout[]
  tickets: Ticket[]
  initialTab?: "profil" | "vertraege" | "payouts" | "support"
  onClose: () => void
  onSave: (c: Client) => void
  onOpenContract: (id: string) => void
  onAddContract: (clientId: string) => void
}) {
  const [draft, setDraft] = useState<Client | null>(client)
  const [tab, setTab] = useState<"profil" | "vertraege" | "payouts" | "support" | "zahlungsinfos">(initialTab)
  const [clientContracts, setClientContracts] = useState<Contract[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [codeState, setCodeState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [newCode, setNewCode] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<WalletAddress[]>([])
  const [cards, setCards] = useState<BbCard[]>([])
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Sync draft when client changes
  useEffect(() => {
    setDraft(client)
    setCodeState("idle")
    setNewCode(null)
    setCodeError(null)
  }, [client])
  // Sync tab when initialTab changes (e.g. opened via "Verträge ansehen")
  useEffect(() => {
    if (client) setTab(initialTab)
  }, [client, initialTab])
  // Fetch contracts for this client whenever the sheet opens
  useEffect(() => {
    if (!client) { setClientContracts([]); return }
    setContractsLoading(true)
    fetch(`/api/admin/contracts?client_id=${client.id}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.contracts)) setClientContracts(d.contracts) })
      .catch(console.error)
      .finally(() => setContractsLoading(false))
  }, [client])
  // Fetch payment info for this client
  useEffect(() => {
    if (!client) { setWallets([]); setCards([]); return }
    setPaymentLoading(true)
    fetch(`/api/admin/payment-info?client_id=${client.id}`)
      .then(r => r.json())
      .then(d => { setWallets(d.wallets ?? []); setCards(d.cards ?? []) })
      .catch(console.error)
      .finally(() => setPaymentLoading(false))
  }, [client])

  async function handleResetCode() {
    if (!client) return
    setCodeState("loading")
    setNewCode(null)
    setCodeError(null)
    try {
      const res = await fetch("/api/admin/reset-client-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.id,
          email: client.email,
          first_name: client.firstName ?? client.name.split(" ")[0] ?? "",
          last_name: client.lastName ?? client.name.split(" ")[1] ?? "",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCodeState("error")
        setCodeError(data.error || "Unbekannter Fehler")
      } else {
        setCodeState("success")
        setNewCode(data.temp_code)
      }
    } catch {
      setCodeState("error")
      setCodeError("Verbindungsfehler. Bitte erneut versuchen.")
    }
  }

  return (
    <Sheet open={!!client} onOpenChange={(b) => !b && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {client && draft && (
          <>
            <SheetHeader className="px-6 py-4 border-b border-border">
              <SheetTitle>{client.name}</SheetTitle>
              <SheetDescription>{client.email}</SheetDescription>
            </SheetHeader>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
              <TabsList className="mx-6 mt-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="profil">Profil</TabsTrigger>
                <TabsTrigger value="vertraege">Verträge</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
                <TabsTrigger value="zahlungsinfos">Zahlung</TabsTrigger>
              </TabsList>

              <TabsContent value="profil" className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Vorname</Label>
                    <Input
                      value={draft.name.split(" ")[0] ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value + " " + (draft.name.split(" ")[1] ?? "") })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nachname</Label>
                    <Input
                      value={draft.name.split(" ")[1] ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, name: (draft.name.split(" ")[0] ?? "") + " " + e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>E-Mail</Label>
                  <Input
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    value={draft.phone ?? ""}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account-Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft({ ...draft, status: v as Client["status"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktiv">Aktiv</SelectItem>
                      <SelectItem value="Inaktiv">Inaktiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Interne Notizen</Label>
                  <Textarea
                    rows={4}
                    value={draft.notes ?? ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  />
                </div>
                <Button
                  onClick={() => {
                    onSave(draft)
                  }}
                  className="w-full"
                >
                  Speichern
                </Button>

                <Separator />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[var(--fin-gain)]/40 text-[var(--fin-gain)] hover:bg-[var(--fin-gain)]/5 hover:border-[var(--fin-gain)]/60"
                  disabled={codeState === "loading"}
                  onClick={handleResetCode}
                >
                  {codeState === "loading" ? (
                    <><Loader2 className="size-4 animate-spin" /> Code wird generiert…</>
                  ) : (
                    "🔄 Neuen Zugangscode generieren & senden"
                  )}
                </Button>

                {codeState === "success" && newCode && (
                  <div className="rounded-md border border-[var(--fin-gain)]/30 bg-[var(--fin-gain)]/5 p-4 space-y-2">
                    <p className="text-xs font-medium text-[var(--fin-gain)] uppercase tracking-wide">
                      ✓ Neuer Code generiert — E-Mail wurde gesendet
                    </p>
                    <p className="font-mono text-3xl font-bold tracking-[0.3em] text-[var(--fin-gain)]">
                      {newCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dieser Code wurde als neues Passwort gesetzt und per E-Mail an {client.email} gesendet.
                    </p>
                  </div>
                )}

                {codeState === "error" && codeError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <p className="text-sm text-destructive">{codeError}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="vertraege" className="px-6 py-4 space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => client && onAddContract(client.id)}>
                    <Plus className="size-4" /> Vertrag hinzufügen
                  </Button>
                </div>
                {contractsLoading && (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                )}
                {!contractsLoading && clientContracts.map((c) => (
                  <CardShell key={c.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs truncate">{c.contractNo}</p>
                        <p className="text-sm text-muted-foreground">
                          <Money value={c.deposit} /> · {fmtPct(c.yieldPa)} · {c.interval}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusPill status={c.status} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenContract(c.id)}
                        >
                          <Eye className="size-4" /> Ansehen
                        </Button>
                      </div>
                    </div>
                  </CardShell>
                ))}
                {!contractsLoading && clientContracts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine Verträge.</p>
                )}
              </TabsContent>

              <TabsContent value="payouts" className="px-6 py-4 space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-mono text-xs">{fmtDate(parseISO(p.date))}</p>
                      <Money value={p.amount} className="text-sm font-medium" />
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                ))}
                {payouts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine Payouts.</p>
                )}
              </TabsContent>

              <TabsContent value="support" className="px-6 py-4 space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">{t.receivedAt}</p>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                ))}
                {tickets.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine Tickets.</p>
                )}
              </TabsContent>

              <TabsContent value="zahlungsinfos" className="px-6 py-4 space-y-4">
                <p className="text-xs text-muted-foreground">Vom Kunden eingetragen · schreibgeschützt</p>
                {paymentLoading && <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>}
                {!paymentLoading && (
                  <>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Wallet className="size-3" /> Wallet-Adressen
                      </p>
                      {wallets.length > 0 ? wallets.map((w) => (
                        <div key={w.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 mb-2 text-xs">
                          <span className="font-medium uppercase text-primary w-10 shrink-0">{w.coin}</span>
                          <span className="font-mono text-muted-foreground truncate flex-1">{w.address}</span>
                          {w.exchange && <span className="text-muted-foreground shrink-0">[{w.exchange}]</span>}
                          <button
                            onClick={() => navigator.clipboard.writeText(w.address)}
                            className="shrink-0 p-1 hover:bg-sidebar-accent rounded"
                            title="Kopieren"
                          >
                            <Copy className="size-3 text-muted-foreground" />
                          </button>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Keine Wallet-Adressen.</p>}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                        <CreditCard className="size-3" /> Borderless Banking Karte
                      </p>
                      {cards.length > 0 ? cards.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-[#1E4535]/40 p-3 mb-2 text-xs">
                          <CreditCard className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-foreground">**** **** **** {c.card_number.slice(-4)}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-[#7A9E88]">{c.email}</span>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">Keine BB-Karte.</p>}
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ----------------------------------------------------------------------------
// Page: Payouts
// ----------------------------------------------------------------------------

function PayoutsPage({
  payouts,
  onErfassen,
}: {
  payouts: Payout[]
  onErfassen: (id: string) => void
}) {
  const [client, setClient] = useState("all")
  const [contract, setContract] = useState("all")
  const [month, setMonth] = useState("all")
  const [status, setStatus] = useState("all")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const total = payouts.filter((p) => p.status === "Ausgezahlt").reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const currentMonthDue = payouts
    .filter((p) => {
      if (p.status !== "Ausstehend") return false
      const d = new Date(p.date)
      return d >= monthStart && d <= monthEnd
    })
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const overdue = payouts
    .filter((p) => p.status === "Überfällig")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const filtered = payouts.filter((p) => {
    if (client !== "all" && p.clientName !== client) return false
    if (contract !== "all" && p.contractNo !== contract) return false
    if (status !== "all" && p.status !== status) return false
    return true
  })

  const clientOptions = Array.from(new Set(payouts.map((p) => p.clientName)))
  const contractOptions = Array.from(new Set(payouts.map((p) => p.contractNo)))

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="text-sm text-muted-foreground">Ausgehende und erfasste Auszahlungen.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Gesamt ausgezahlt" value={fmtEUR(total)} hint="Bislang abgewickelt" />
        <StatCard
          label="Diesen Monat fällig"
          value={fmtEUR(currentMonthDue)}
          badge={{ text: `${payouts.filter((p) => { const d = new Date(p.date); return p.status === "Ausstehend" && d >= monthStart && d <= monthEnd }).length} ausstehend`, tone: "amber" }}
        />
        <StatCard
          label="Überfällig"
          value={fmtEUR(overdue)}
          badge={overdue > 0 ? { text: "Aktion erforderlich", tone: "red" } : { text: "Keine", tone: "green" }}
        />
      </div>

      <CardShell className="p-4" hover={false}>
        <div className="flex flex-wrap gap-3">
          <Select value={client} onValueChange={setClient}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Alle Kunden" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              {clientOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={contract} onValueChange={setContract}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Alle Verträge" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Verträge</SelectItem>
              {contractOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Monat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Monate</SelectItem>
              {["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="Ausstehend">Ausstehend</SelectItem>
              <SelectItem value="Ausgezahlt">Ausgezahlt</SelectItem>
              <SelectItem value="Überfällig">Überfällig</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardShell>

      <CardShell className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Vertragsnr.</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Intervall</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Beleg</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.clientName}</TableCell>
                  <TableCell className="font-mono text-xs">{p.contractNo}</TableCell>
                  <TableCell className="font-mono text-xs">{fmtDate(parseISO(p.date))}</TableCell>
                  <TableCell className="text-right">
                    <Money value={p.amount} />
                  </TableCell>
                  <TableCell>{p.interval}</TableCell>
                  <TableCell><StatusPill status={p.status} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.receipt ? (
                      <span className="inline-flex items-center gap-1">
                        {p.receipt} <ExternalLink className="size-3" />
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "Ausstehend" || p.status === "Überfällig" ? (
                      <Button size="sm" onClick={() => onErfassen(p.id)}>
                        Erfassen
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost"><Eye className="size-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardShell>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Payout Entry Dialog
// ----------------------------------------------------------------------------

function PayoutEntryDialog({
  payout,
  onClose,
  onConfirm,
}: {
  payout: Payout | null
  onClose: () => void
  onConfirm: (receipt: string) => void
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [method, setMethod] = useState("Crypto")
  const [receipt, setReceipt] = useState("")
  const [saving, setSaving] = useState(false)
  const [wallets, setWallets] = useState<WalletAddress[]>([])
  const [cards, setCards] = useState<BbCard[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!payout?.clientId) { setWallets([]); setCards([]); return }
    fetch(`/api/admin/payment-info?client_id=${payout.clientId}`)
      .then(r => r.json())
      .then(d => { setWallets(d.wallets ?? []); setCards(d.cards ?? []) })
      .catch(() => {})
  }, [payout?.clientId])

  useEffect(() => {
    if (!payout) { setReceipt(""); setSaving(false) }
  }, [payout])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleConfirm = async () => {
    if (!payout) return
    setSaving(true)
    try {
      await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payout.id, proof_link: receipt || null, paid_date: date }),
      })
      onConfirm(receipt || "—")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!payout} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-lg">
        {payout && (
          <>
            <DialogHeader>
              <DialogTitle>Payout erfassen</DialogTitle>
              <DialogDescription>Auszahlung als ausgeführt markieren.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kunde</Label>
                  <Input value={payout.clientName} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vertrag</Label>
                  <Input value={payout.contractNo} readOnly className="bg-muted font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Betrag</Label>
                <Input value={fmtEUR(payout.amount)} readOnly className="bg-muted font-mono" />
              </div>

              {/* Client payment info */}
              {wallets.length > 0 && (
                <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Wallet className="size-3" /> Gespeicherte Wallet-Adressen
                  </p>
                  {wallets.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium uppercase text-primary w-10 shrink-0">{w.coin}</span>
                      <span className="font-mono text-muted-foreground truncate flex-1">{w.address}</span>
                      {w.exchange && <span className="text-muted-foreground shrink-0">[{w.exchange}]</span>}
                      <button
                        onClick={() => copyToClipboard(w.address, w.id)}
                        className="shrink-0 p-1 hover:bg-sidebar-accent rounded"
                      >
                        <Copy className={cn("size-3", copied === w.id ? "text-primary" : "text-muted-foreground")} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {cards.length > 0 && (
                <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <CreditCard className="size-3" /> Borderless Banking Karte
                  </p>
                  {cards.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-foreground">**** **** **** {c.card_number.slice(-4)}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-[#7A9E88]">{c.email}</span>
                    </div>
                  ))}
                </div>
              )}
              {wallets.length === 0 && cards.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Keine Zahlungsinformationen vom Kunden hinterlegt.</p>
              )}

              <div className="space-y-1.5">
                <Label>Auszahlungsdatum</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Zahlungsart</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crypto">Crypto</SelectItem>
                    <SelectItem value="Banküberweisung">Banküberweisung</SelectItem>
                    <SelectItem value="BB-Karte">BB-Karte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Zahlungsbeleg</Label>
                <Input
                  placeholder={method === "Crypto" ? "Blockchain TX Hash" : "SEPA Referenz"}
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Als ausgezahlt markieren
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Page: Support
// ----------------------------------------------------------------------------

function SupportPage({
  tickets,
  onOpenTicket,
}: {
  tickets: Ticket[]
  onOpenTicket: (id: string) => void
}) {
  const offen = tickets.filter((t) => t.status === "Offen").length
  const inProg = tickets.filter((t) => t.status === "In Bearbeitung").length

  const isReset = (t: Ticket) => t.contractNo === "RESET-REQUEST"

  const sorted = [...tickets].sort((a, b) => {
    // RESET-REQUEST tickets always come first
    if (isReset(a) && !isReset(b)) return -1
    if (!isReset(a) && isReset(b)) return 1
    const order = { Offen: 0, "In Bearbeitung": 1, Gelöst: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">Anfragen und Tickets verwalten.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Offen" value={String(offen)} badge={{ text: "Aktion nötig", tone: "red" }} />
        <StatCard label="In Bearbeitung" value={String(inProg)} badge={{ text: "Aktiv", tone: "amber" }} />
        <StatCard label="Gelöst diese Woche" value="5" badge={{ text: "+5", tone: "green" }} />
      </div>

      <CardShell className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Vertragsnr.</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Betreff</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
              <TableHead>Eingegangen</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => (
              <TableRow key={t.id} className={isReset(t) ? "bg-amber-500/5" : undefined}>
                <TableCell>
                  <StatusPill status={t.status} />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {isReset(t) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      🔑 Code-Reset
                    </span>
                  ) : (
                    t.contractNo
                  )}
                </TableCell>
                <TableCell>
                  {t.firstName || t.lastName
                    ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim()
                    : t.clientName || t.email || '—'}
                </TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell className="text-right">
                  {t.amount ? <Money value={t.amount} /> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="font-mono text-xs">{t.receivedAt}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => onOpenTicket(t.id)}>
                    Öffnen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardShell>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Ticket Detail Dialog
// ----------------------------------------------------------------------------

function TicketDetailDialog({
  ticket,
  onClose,
  onUpdate,
}: {
  ticket: Ticket | null
  onClose: () => void
  onUpdate: (status: TicketStatus, response: string) => void
}) {
  const [response, setResponse] = useState("")
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "Offen")

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status)
      setResponse("")
    }
  }, [ticket])

  return (
    <Dialog open={!!ticket} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-lg">
        {ticket && (
          <>
            <DialogHeader>
              <DialogTitle>{ticket.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Von: </span>
                  {ticket.firstName || ticket.lastName
                    ? `${ticket.firstName ?? ''} ${ticket.lastName ?? ''}`.trim()
                    : ticket.clientName || '—'}
                  {ticket.email && (
                    <span className="text-muted-foreground"> ({ticket.email})</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Anfrage: </span>
                  {ticket.subject}
                </div>
                <div>
                  <span className="text-muted-foreground">Eingegangen: </span>
                  {ticket.receivedAt}
                </div>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {ticket.message}
              </div>
              <div className="space-y-1.5">
                <Label>Antwort</Label>
                <Textarea
                  rows={4}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Antwort an den Kunden..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Offen">Offen</SelectItem>
                    <SelectItem value="In Bearbeitung">In Bearbeitung</SelectItem>
                    <SelectItem value="Gelöst">Gelöst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={() => onUpdate(status, response)}>
                Antwort senden + Status aktualisieren
              </Button>
            </DialogFooter>
            {/* TODO: Supabase sync — support_requests */}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Page: Berichte
// ----------------------------------------------------------------------------

function ClientCombobox({
  clients,
  value,
  onChange,
}: {
  clients: Client[]
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const selected = clients.find((c) => c.id === value) ?? null

  const filtered = useMemo(() => {
    if (!query) return clients.slice(0, 30)
    const q = query.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
    ).slice(0, 20)
  }, [clients, query])

  function initials(name: string) {
    const parts = name.trim().split(" ")
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {initials(selected.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground truncate">{selected.email}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => { onChange(""); setQuery(""); }}
          >
            ×
          </Button>
        </div>
      ) : (
        <Input
          placeholder="Kunde suchen…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
        />
      )}
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Keine Ergebnisse</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors"
                onMouseDown={() => { onChange(c.id); setQuery(""); setOpen(false); }}
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function BerichtePage({
  reports,
  contracts,
  clients,
  onToggle,
  onDelete,
  onUpload,
}: {
  reports: Report[]
  contracts: Contract[]
  clients: Client[]
  onToggle: (id: string, v: boolean) => void
  onDelete: (id: string) => void
  onUpload: (r: Report) => void
}) {
  const [scope, setScope] = useState<"Allgemein" | "Kundenspezifisch">("Allgemein")
  const [clientId, setClientId] = useState<string>("")
  const [contractSel, setContractSel] = useState("Alle")
  const [type, setType] = useState<Report["type"]>("Performance")
  const [title, setTitle] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => { setContractSel("Alle") }, [scope, clientId])

  const clientContracts = useMemo(
    () => (clientId ? contracts.filter((c) => c.clientId === clientId) : []),
    [contracts, clientId],
  )
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  )

  const canUpload = Boolean(file && title && (scope === "Allgemein" || clientId))

  async function handleUpload() {
    if (!canUpload || !file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("title", title || `${type} ${new Date().getFullYear()}`)
    fd.append("type", type)
    if (from) fd.append("period_start", from)
    if (to) fd.append("period_end", to)
    if (scope === "Kundenspezifisch" && clientId) fd.append("client_id", clientId)
    const contractId = clientContracts.find((c) => c.contractNo === contractSel)?.id
    if (contractId) fd.append("contract_id", contractId)

    try {
      const res = await fetch("/api/admin/reports", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen")

      onUpload({
        ...json.report,
        clientName: scope === "Kundenspezifisch" && selectedClient ? selectedClient.name : undefined,
      })
      setFile(null)
      setTitle("")
      setFrom("")
      setTo("")
      setClientId("")
      setContractSel("Alle")
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 4000)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Berichte</h1>
        <p className="text-sm text-muted-foreground">Performance-, Jahres- und Auszahlungsberichte verwalten.</p>
      </div>

      {/* Upload card */}
      <CardShell className="p-5 space-y-4" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="font-semibold">Neuen Bericht hochladen</h2>
          <p className="text-xs text-muted-foreground">
            {scope === "Allgemein"
              ? "Sichtbar für alle Kunden im Portal"
              : "Nur für den ausgewählten Kunden sichtbar"}
          </p>
        </div>

        {/* Scope toggle */}
        <Tabs value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
          <TabsList className="grid grid-cols-2 w-full sm:w-auto">
            <TabsTrigger value="Allgemein">Allgemeiner Bericht</TabsTrigger>
            <TabsTrigger value="Kundenspezifisch">Kundenspezifisch</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Client + contract picker */}
        {scope === "Kundenspezifisch" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="space-y-1.5">
              <Label>
                Kunde <span className="text-destructive">*</span>
              </Label>
              <ClientCombobox clients={clients} value={clientId} onChange={setClientId} />
            </div>
            <div className="space-y-1.5">
              <Label>Vertrag (optional)</Label>
              <Select value={contractSel} onValueChange={setContractSel} disabled={!clientId}>
                <SelectTrigger>
                  <SelectValue placeholder={clientId ? "Vertrag wählen…" : "Erst Kunde wählen"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alle">Alle Verträge des Kunden</SelectItem>
                  {clientContracts.map((c) => (
                    <SelectItem key={c.id} value={c.contractNo}>
                      {c.contractNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Common fields */}
        <div className="space-y-1.5">
          <Label>
            Titel <span className="text-destructive">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Performance Report Q1 2026"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(v) => setType(v as Report["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Performance">Performance</SelectItem>
                <SelectItem value="Jahresbericht">Jahresbericht</SelectItem>
                <SelectItem value="Halbjährlich">Halbjährlich</SelectItem>
                <SelectItem value="Auszahlung">Auszahlung</SelectItem>
                <SelectItem value="Vorschau">Vorschau</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Zeitraum von</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Zeitraum bis</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition">
          <Upload className="size-6" />
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            <>PDF hier ablegen oder klicken zum Auswählen</>
          )}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {uploadError && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
            {uploadError}
          </p>
        )}
        {uploadSuccess && (
          <p className="text-sm text-green-600 rounded-md border border-green-300 bg-green-50 px-3 py-2">
            ✓ Bericht erfolgreich hochgeladen und für Kunden freigegeben.
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Button onClick={handleUpload} disabled={!canUpload || uploading} className="w-full sm:w-auto">
            {uploading ? (
              <><Loader2 className="size-4 animate-spin" /> Wird hochgeladen…</>
            ) : (
              <><Upload className="size-4" />
              {scope === "Kundenspezifisch"
                ? "Hochladen + für Kunde freigeben"
                : "Hochladen + für alle Kunden freigeben"}</>
            )}
          </Button>
          {scope === "Kundenspezifisch" && !clientId && (
            <p className="text-xs text-muted-foreground">Bitte zuerst einen Kunden auswählen.</p>
          )}
          {!file && (
            <p className="text-xs text-muted-foreground">Bitte PDF auswählen.</p>
          )}
        </div>
      </CardShell>

      <CardShell className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bericht</TableHead>
              <TableHead>Sichtbarkeit</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Größe</TableHead>
              <TableHead>Sichtbar</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  Noch keine Berichte hochgeladen.
                </TableCell>
              </TableRow>
            )}
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{r.name}</p>
                      {r.fileName && (
                        <p className="text-xs text-muted-foreground font-mono">{r.fileName}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {r.scope === "Kundenspezifisch" ? (
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {r.clientName ?? "Kunde"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Alle Kunden
                    </span>
                  )}
                </TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell className="font-mono text-xs">{r.date}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.period}</TableCell>
                <TableCell className="font-mono text-xs">{r.size}</TableCell>
                <TableCell>
                  <Switch checked={r.visible} onCheckedChange={(v) => onToggle(r.id, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {r.fileUrl && (
                      <Button size="icon" variant="ghost" className="size-8" asChild>
                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="size-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(r.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardShell>
    </div>
  )
}
