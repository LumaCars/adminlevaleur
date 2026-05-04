"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Search,
  Upload,
  FileText,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Pencil,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  email: string
  phone?: string
  premium: boolean
  contractsCount: number
  capital: number
  nextPayout?: string
  notes?: string
  status: "Aktiv" | "Inaktiv"
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
}

type Payout = {
  id: string
  clientName: string
  contractNo: string
  amount: number
  date: string
  interval: Interval
  status: PayoutStatus
  receipt?: string
}

type Ticket = {
  id: string
  status: TicketStatus
  contractNo: string
  clientName: string
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
}

// ----------------------------------------------------------------------------
// Mock data — TODO: Supabase sync
// ----------------------------------------------------------------------------

const initialClients: Client[] = [
  {
    id: "c1",
    initials: "LT",
    name: "l.trematerra",
    email: "l.trematerra@example.com",
    phone: "+41 79 123 45 67",
    premium: true,
    contractsCount: 2,
    capital: 195000,
    nextPayout: "01.03.2027",
    notes: "VIP — bevorzugte Kommunikation per E-Mail.",
    status: "Aktiv",
  },
  {
    id: "c2",
    initials: "MH",
    name: "M. Hoffmann",
    email: "m.hoffmann@example.com",
    phone: "+41 78 555 12 34",
    premium: true,
    contractsCount: 1,
    capital: 50000,
    nextPayout: "15.03.2027",
    notes: "",
    status: "Aktiv",
  },
]

const initialContracts: Contract[] = [
  {
    id: "k1",
    no: "01",
    contractNo: "DV-LVMAG-2026-0101-0001",
    clientId: "c1",
    clientName: "l.trematerra",
    deposit: 75000,
    yieldPa: 8.5,
    interval: "Jährlich",
    startYear: 2026,
    durationYears: 5,
    endYear: 2031,
    status: "Aktiv",
  },
  {
    id: "k2",
    no: "02",
    contractNo: "DV-LVMAG-2026-0201-0002",
    clientId: "c1",
    clientName: "l.trematerra",
    deposit: 120000,
    yieldPa: 9.0,
    interval: "Halbjährlich",
    startYear: 2026,
    durationYears: 10,
    endYear: 2036,
    status: "Aktiv",
  },
  {
    id: "k3",
    no: "03",
    contractNo: "DV-LVMAG-2024-0601-0003",
    clientId: "c2",
    clientName: "M. Hoffmann",
    deposit: 50000,
    yieldPa: 7.5,
    interval: "Endfällig",
    startYear: 2024,
    durationYears: 3,
    endYear: 2027,
    status: "Beendet",
  },
]

const initialPayouts: Payout[] = [
  {
    id: "p1",
    clientName: "l.trematerra",
    contractNo: "DV-LVMAG-2026-0101-0001",
    amount: 6375,
    date: "01.03.2027",
    interval: "Jährlich",
    status: "Ausstehend",
  },
  {
    id: "p2",
    clientName: "M. Hoffmann",
    contractNo: "DV-LVMAG-2026-0201-0002",
    amount: 12000,
    date: "15.03.2027",
    interval: "Halbjährlich",
    status: "Ausstehend",
  },
  {
    id: "p3",
    clientName: "M. Hoffmann",
    contractNo: "DV-LVMAG-2024-0601-0003",
    amount: 3750,
    date: "01.06.2025",
    interval: "Endfällig",
    status: "Ausgezahlt",
    receipt: "0xabcd…ef12",
  },
  {
    id: "p4",
    clientName: "M. Hoffmann",
    contractNo: "DV-LVMAG-2024-0601-0003",
    amount: 3750,
    date: "01.06.2026",
    interval: "Endfällig",
    status: "Ausgezahlt",
    receipt: "SEPA-2026-0341",
  },
  {
    id: "p5",
    clientName: "l.trematerra",
    contractNo: "DV-LVMAG-2026-0201-0002",
    amount: 5400,
    date: "15.09.2026",
    interval: "Halbjährlich",
    status: "Ausgezahlt",
    receipt: "0x9a32…b7c1",
  },
]

const initialTickets: Ticket[] = [
  {
    id: "t1",
    status: "Offen",
    contractNo: "DV-LVMAG-2026-0423-0001",
    clientName: "l.trematerra",
    subject: "Auszahlung verzögert",
    amount: 6375,
    receivedAt: "23.04.2026",
    message:
      "Die Auszahlung war für den 23.04. angekündigt, ist aber bisher nicht eingegangen. Bitte um Klärung.",
  },
  {
    id: "t2",
    status: "In Bearbeitung",
    contractNo: "DV-LVMAG-2026-0201-0002",
    clientName: "M. Hoffmann",
    subject: "Dokument anfordern",
    receivedAt: "01.02.2026",
    message: "Bitte den aktuellen Halbjahresbericht zur Verfügung stellen.",
  },
  {
    id: "t3",
    status: "Offen",
    contractNo: "DV-LVMAG-2026-0101-0001",
    clientName: "l.trematerra",
    subject: "Adressänderung",
    receivedAt: "12.04.2026",
    message: "Neue Postanschrift hinterlegen.",
  },
]

const initialReports: Report[] = [
  {
    id: "r1",
    name: "Q4 2025 Performance",
    contractNo: "DV-LVMAG-2026-0101-0001",
    type: "Performance",
    date: "15.01.2026",
    period: "Okt–Dez 2025",
    size: "2.4 MB",
    status: "Bereit",
    visible: true,
  },
  {
    id: "r2",
    name: "Jahresbericht 2025",
    contractNo: "DV-LVMAG-2026-0101-0001",
    type: "Jahresbericht",
    date: "10.01.2026",
    period: "Jan–Dez 2025",
    size: "4.1 MB",
    status: "Bereit",
    visible: true,
  },
  {
    id: "r3",
    name: "Q1 2026 Vorschau",
    contractNo: "Alle",
    type: "Vorschau",
    date: "31.03.2026",
    period: "Jan–Mär 2026",
    size: "—",
    status: "Ausstehend",
    visible: false,
  },
]

const activities = [
  { dot: "bg-[var(--fin-gain)]", text: "Payout €5.400 an l.trematerra ausgezahlt", time: "vor 2 Std." },
  { dot: "bg-primary", text: "Neuer Vertrag DV-LVMAG-2026-0423-0001 angelegt", time: "vor 5 Std." },
  { dot: "bg-[var(--warning)]", text: "Support-Ticket #1041 eröffnet", time: "gestern" },
  { dot: "bg-primary", text: "Q4 2025 Performance Bericht hochgeladen", time: "vor 2 Tagen" },
]

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

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
  const [page, setPage] = useState<PageKey>("uebersicht")

  const [clients, setClients] = useState<Client[]>(initialClients)
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)
  const [payouts, setPayouts] = useState<Payout[]>(initialPayouts)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [reports, setReports] = useState<Report[]>(initialReports)

  // Modal/sheet states
  const [newContractOpen, setNewContractOpen] = useState(false)
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [activeContractId, setActiveContractId] = useState<string | null>(null)
  const [payoutEntryId, setPayoutEntryId] = useState<string | null>(null)
  const [ticketDetailId, setTicketDetailId] = useState<string | null>(null)

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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
              V
            </div>
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
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                AD
              </AvatarFallback>
            </Avatar>
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
          />
        )}
        {page === "kunden" && (
          <KundenPage
            clients={clients}
            onOpenProfile={(id) => setActiveClientId(id)}
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
            onToggle={(id, v) =>
              setReports((rs) => rs.map((r) => (r.id === id ? { ...r, visible: v } : r)))
            }
            onDelete={(id) => setReports((rs) => rs.filter((r) => r.id !== id))}
            onUpload={(r) => setReports((rs) => [r, ...rs])}
          />
        )}
      </main>

      {/* New Contract Modal */}
      <NewContractDialog
        open={newContractOpen}
        onOpenChange={setNewContractOpen}
        clients={clients}
        onCreate={(c) => {
          setContracts((arr) => [
            { ...c, id: `k${arr.length + 1}`, no: String(arr.length + 1).padStart(2, "0") },
            ...arr,
          ])
          setNewContractOpen(false)
        }}
      />

      {/* Client profile sheet */}
      <ClientProfileSheet
        client={clients.find((c) => c.id === activeClientId) ?? null}
        contracts={contracts.filter((k) => k.clientId === activeClientId)}
        payouts={payouts.filter(
          (p) => p.clientName === clients.find((c) => c.id === activeClientId)?.name,
        )}
        tickets={tickets.filter(
          (t) => t.clientName === clients.find((c) => c.id === activeClientId)?.name,
        )}
        onClose={() => setActiveClientId(null)}
        onSave={(updated) => {
          setClients((arr) => arr.map((c) => (c.id === updated.id ? updated : c)))
        }}
      />

      {/* Contract detail sheet */}
      <ContractDetailSheet
        contract={contracts.find((c) => c.id === activeContractId) ?? null}
        payouts={payouts}
        onClose={() => setActiveContractId(null)}
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
}: {
  clients: Client[]
  contracts: Contract[]
  payouts: Payout[]
  tickets: Ticket[]
  onGoTo: (p: PageKey) => void
  onNewContract: () => void
}) {
  const totalCapital = contracts
    .filter((c) => c.status === "Aktiv")
    .reduce((s, c) => s + c.deposit, 0)
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
          value={fmtEUR(4750000)}
          hint={`Aktuell · ${fmtEUR(totalCapital)} aus Verträgen`}
        />
        <StatCard
          label="Offene Support-Anfragen"
          value={String(openTickets)}
          badge={openTickets > 0 ? { text: `${openTickets} offen`, tone: "red" } : undefined}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onGoTo("kunden")}>
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
                    <TableCell className="font-mono text-xs">{p.date}</TableCell>
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
  onOpenProfile,
}: {
  clients: Client[]
  onOpenProfile: (id: string) => void
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
          <p className="text-sm text-muted-foreground">{filtered.length} Einträge</p>
        </div>
        <Button>
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
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((c) => (
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
                    <p className="font-mono tabular-nums font-medium">{c.contractsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kapital</p>
                    <Money value={c.capital} className="font-medium" />
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
                  <Button size="sm" variant="outline">
                    Vertrag ansehen
                  </Button>
                </div>
              </div>
            </div>
          </CardShell>
        ))}
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
                    <Button size="icon" variant="ghost" className="size-8">
                      <FileText className="size-4" />
                    </Button>
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
  onCreate,
}: {
  open: boolean
  onOpenChange: (b: boolean) => void
  clients: Client[]
  onCreate: (c: Omit<Contract, "id" | "no">) => void
}) {
  const [clientId, setClientId] = useState<string>(clients[0]?.id ?? "")
  const [year, setYear] = useState("2026")
  const [mmtt, setMmtt] = useState("")
  const [seq, setSeq] = useState("")
  const [deposit, setDeposit] = useState("75000")
  const [yieldPa, setYieldPa] = useState("8.5")
  const [duration, setDuration] = useState("5")
  const [interval, setInterval] = useState<Interval>("Jährlich")
  const [kapDate, setKapDate] = useState("")
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
  }

  function handleCreate() {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return
    onCreate({
      contractNo,
      clientId,
      clientName: client.name,
      deposit: Number(deposit),
      yieldPa: Number(yieldPa),
      interval,
      startYear: Number(year),
      durationYears: Number(duration),
      endYear: Number(year) + Number(duration),
      status,
    })
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Vertrag</DialogTitle>
          <DialogDescription>
            Erfasse einen neuen Direktinvestitionsvertrag. Felder werden live berechnet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1 — Kunde */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">1 · Kunde</h3>
            <div className="flex gap-3">
              <Select value={clientId} onValueChange={setClientId}>
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
              <Button variant="outline" type="button">+ Neuen Kunden anlegen</Button>
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

          {/* Section 6 — PDF */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">6 · PDF</h3>
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition">
              <Upload className="size-6" />
              Vertragsdokument hochladen (.pdf)
              <input type="file" accept=".pdf" className="hidden" />
            </label>
          </section>

          {/* Section 7 — Status */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">7 · Status</h3>
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={allocSum !== 100} className="flex-1 sm:flex-none">
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------
// Contract Detail Sheet
// ----------------------------------------------------------------------------

function ContractDetailSheet({
  contract,
  payouts,
  onClose,
}: {
  contract: Contract | null
  payouts: Payout[]
  onClose: () => void
}) {
  const open = !!contract

  const schedule = useMemo(() => {
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
  }, [contract])

  const yearlyReturn = contract ? (contract.deposit * contract.yieldPa) / 100 : 0
  const totalReturn = contract ? yearlyReturn * contract.durationYears : 0
  const paidOut = payouts
    .filter((p) => p.contractNo === contract?.contractNo && p.status === "Ausgezahlt")
    .reduce((s, p) => s + p.amount, 0)
  const open_ = totalReturn - paidOut

  return (
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
                <ReadField label="Vertragsstart" value={`01.${String((contract.startYear === 2024 ? 6 : 1)).padStart(2,"0")}.${contract.startYear}`} />
                <ReadField label="Vertragsende" value={`...${contract.endYear}`} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Pencil className="size-4" /> Bearbeiten
                </Button>
                <Button variant="outline">
                  <FileText className="size-4" /> PDF öffnen
                </Button>
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
  contracts,
  payouts,
  tickets,
  onClose,
  onSave,
}: {
  client: Client | null
  contracts: Contract[]
  payouts: Payout[]
  tickets: Ticket[]
  onClose: () => void
  onSave: (c: Client) => void
}) {
  const [draft, setDraft] = useState<Client | null>(client)
  // Sync draft when client changes
  useEffect(() => {
    setDraft(client)
  }, [client])

  return (
    <Sheet open={!!client} onOpenChange={(b) => !b && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {client && draft && (
          <>
            <SheetHeader className="px-6 py-4 border-b border-border">
              <SheetTitle>{client.name}</SheetTitle>
              <SheetDescription>{client.email}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="profil" className="w-full">
              <TabsList className="mx-6 mt-4">
                <TabsTrigger value="profil">Profil</TabsTrigger>
                <TabsTrigger value="vertraege">Verträge</TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
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
                {/* TODO: Supabase sync — clients table */}
              </TabsContent>

              <TabsContent value="vertraege" className="px-6 py-4 space-y-3">
                {contracts.map((c) => (
                  <CardShell key={c.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs">{c.contractNo}</p>
                      <p className="text-sm text-muted-foreground">
                        <Money value={c.deposit} /> · {fmtPct(c.yieldPa)} · {c.interval}
                      </p>
                    </div>
                    <StatusPill status={c.status} />
                  </CardShell>
                ))}
                {contracts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Keine Verträge.</p>
                )}
              </TabsContent>

              <TabsContent value="payouts" className="px-6 py-4 space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-mono text-xs">{p.date}</p>
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

  const total = payouts.filter((p) => p.status === "Ausgezahlt").reduce((s, p) => s + p.amount, 0)
  const pending = payouts.filter((p) => p.status === "Ausstehend").reduce((s, p) => s + p.amount, 0)
  const overdue = payouts.filter((p) => p.status === "Überfällig").reduce((s, p) => s + p.amount, 0)

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
          label="Ausstehend"
          value={fmtEUR(pending)}
          badge={{ text: `${payouts.filter((p) => p.status === "Ausstehend").length} offen`, tone: "amber" }}
        />
        <StatCard
          label="Überfällig"
          value={fmtEUR(overdue)}
          badge={overdue > 0 ? { text: "Aktion erforderlich", tone: "red" } : { text: "0", tone: "green" }}
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
                  <TableCell className="font-mono text-xs">{p.date}</TableCell>
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
                    {p.status === "Ausstehend" ? (
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
  const [date, setDate] = useState("")
  const [method, setMethod] = useState("Crypto")
  const [receipt, setReceipt] = useState("")

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
              <Button variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button onClick={() => onConfirm(receipt || "—")}>
                <CheckCircle2 className="size-4" /> Als ausgezahlt markieren
              </Button>
            </DialogFooter>
            {/* TODO: Supabase sync — payouts table */}
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

  const sorted = [...tickets].sort((a, b) => {
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
              <TableRow key={t.id}>
                <TableCell><StatusPill status={t.status} /></TableCell>
                <TableCell className="font-mono text-xs">{t.contractNo}</TableCell>
                <TableCell>{t.clientName}</TableCell>
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
              <DialogDescription>
                {ticket.clientName} · <span className="font-mono">{ticket.contractNo}</span> · {ticket.receivedAt}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
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

function BerichtePage({
  reports,
  contracts,
  onToggle,
  onDelete,
  onUpload,
}: {
  reports: Report[]
  contracts: Contract[]
  onToggle: (id: string, v: boolean) => void
  onDelete: (id: string) => void
  onUpload: (r: Report) => void
}) {
  const [contractSel, setContractSel] = useState("Alle")
  const [type, setType] = useState<Report["type"]>("Performance")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  function handleUpload() {
    onUpload({
      id: `r${Date.now()}`,
      name: `${type} ${new Date().getFullYear()}`,
      contractNo: contractSel,
      type,
      date: fmtDate(new Date()),
      period: `${from || "—"} – ${to || "—"}`,
      size: "1.2 MB",
      status: "Bereit",
      visible: true,
    })
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Berichte</h1>
        <p className="text-sm text-muted-foreground">Performance-, Jahres- und Auszahlungsberichte verwalten.</p>
      </div>

      {/* Upload card */}
      <CardShell className="p-5 space-y-4" hover={false}>
        <h2 className="font-semibold">Neuen Bericht hochladen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Vertrag</Label>
            <Select value={contractSel} onValueChange={setContractSel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alle">Alle Verträge</SelectItem>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.contractNo}>{c.contractNo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          PDF hier ablegen oder klicken zum Auswählen
          <input type="file" accept=".pdf" className="hidden" />
        </label>
        <Button onClick={handleUpload} className="w-full sm:w-auto">
          <Upload className="size-4" /> Hochladen + für Kunden freigeben
        </Button>
      </CardShell>

      <CardShell className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bericht</TableHead>
              <TableHead>Vertrag</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Größe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sichtbar</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.contractNo}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell className="font-mono text-xs">{r.date}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.period}</TableCell>
                <TableCell className="font-mono text-xs">{r.size}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      r.status === "Bereit"
                        ? "bg-[var(--fin-gain)]/10 text-[var(--fin-gain)] border-[var(--fin-gain)]/20"
                        : "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30",
                    )}
                  >
                    {r.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch checked={r.visible} onCheckedChange={(v) => onToggle(r.id, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="size-8">
                      <Edit className="size-4" />
                    </Button>
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
      {/* TODO: Supabase sync — reports table */}
    </div>
  )
}
