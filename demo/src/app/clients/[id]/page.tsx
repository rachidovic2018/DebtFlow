import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Target,
  ShieldCheck,
  Sparkles,
  MapPin,
  Mail,
  Phone,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  clients,
  getClient,
  getClientDebts,
  getClientPayments,
  getClientContracts,
  getClientCase,
  getAgent,
  aiSummary,
  tasks,
  COMPANY_FEE_RATE,
} from "@/lib/mock";
import { caseStageTone, debtTone, docTone, paymentTone, riskTone } from "@/lib/status";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";

export function generateStaticParams() {
  return clients.map((c) => ({ id: c.id }));
}

export default async function Client360({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);
  if (!client) notFound();

  const debts = getClientDebts(client.id);
  const clientPayments = getClientPayments(client.id);
  const clientContracts = getClientContracts(client.id);
  const kase = getClientCase(client.id);
  const agent = getAgent(client.agentId);
  const clientTasks = tasks.filter((t) => t.clientId === client.id);

  const avgSettlementPct =
    debts.length > 0
      ? Math.round(debts.reduce((s, d) => s + d.settlementTargetPct, 0) / debts.length)
      : 45;
  const settlementAmount = Math.round((client.totalDebt * avgSettlementPct) / 100);
  const companyFee = Math.round(client.totalDebt * COMPANY_FEE_RATE);
  const estimatedSavings = client.totalDebt - settlementAmount - companyFee;
  const settledDebt = debts
    .filter((d) => d.status === "Settled")
    .reduce((s, d) => s + d.originalBalance, 0);

  return (
    <div>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Clients
      </Link>

      {/* Header */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <Avatar size="lg" initials={client.initials} seed={client.id} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight">{client.fullName}</h1>
                <Badge tone={caseStageTone(client.stage)} dot>{client.stage}</Badge>
                <Badge tone={riskTone(client.risk)}>{client.risk} risk</Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{client.city}, {client.state}</span>
                <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{client.email}</span>
                <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{client.phone}</span>
                {kase && <span className="font-mono text-xs">{kase.caseNumber}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
              <Avatar size="sm" initials={agent?.initials ?? "··"} seed={agent?.id} />
              <div className="text-xs leading-tight">
                <div className="text-muted-foreground">Assigned to</div>
                <div className="font-medium">{agent?.firstName} {agent?.lastName}</div>
              </div>
            </div>
            <Button variant="outline" size="sm"><MessageSquare /> Message</Button>
            <Button size="sm"><Plus /> New Task</Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
          <TabsTrigger value="program">Program</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <OverviewCard icon={CreditCard} label="Total Debt" value={formatCurrency(client.totalDebt)} tone="bg-indigo-50 text-indigo-600" />
            <OverviewCard icon={Wallet} label="Monthly Payment" value={formatCurrency(client.monthlyPayment)} tone="bg-sky-50 text-sky-600" sub={client.frequency} />
            <OverviewCard icon={Target} label="Program Progress" value={formatPercent(client.programProgress)} tone="bg-violet-50 text-violet-600" sub={`${client.monthsElapsed}/${client.programMonths} mo`} />
            <OverviewCard icon={ShieldCheck} label="Settlement Progress" value={formatPercent(client.settlementProgress)} tone="bg-emerald-50 text-emerald-600" />
            <OverviewCard icon={ShieldCheck} label="Payment Reliability" value={formatPercent(client.paymentReliability)} tone="bg-amber-50 text-amber-600" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-accent/30 bg-accent/[0.03]">
              <CardContent>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="size-[18px]" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">AI Summary</h3>
                      <Badge tone="indigo">Auto-generated</Badge>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{aiSummary(client)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Program Snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-2 text-sm">
                <Row label="Enrolled debt" value={formatCurrency(client.enrolledDebt)} />
                <Row label="Settlement target" value={formatPercent(avgSettlementPct)} />
                <Row label="Est. savings" value={formatCurrency(estimatedSavings)} accent />
                <div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Program progress</span><span>{formatPercent(client.programProgress)}</span>
                  </div>
                  <Progress value={client.programProgress} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DEBTS */}
        <TabsContent value="debts">
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Total Debt" value={formatCurrency(client.totalDebt)} />
            <MiniStat label="Accounts" value={String(debts.length)} />
            <MiniStat label="Settled" value={formatCurrency(settledDebt)} />
            <MiniStat label="Avg. Settlement" value={formatPercent(avgSettlementPct)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {debts.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                      {d.creditor.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{d.creditor}</p>
                      <p className="font-mono text-2xs text-muted-foreground">{d.accountNumber}</p>
                    </div>
                  </div>
                  <Badge tone={debtTone(d.status)}>{d.status}</Badge>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <Row label="Balance" value={formatCurrency(d.currentBalance)} />
                  <Row label="Settlement target" value={formatPercent(d.settlementTargetPct)} />
                  <Row label="Current offer" value={d.currentOffer ? formatCurrency(d.currentOffer) : "—"} />
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PROGRAM */}
        <TabsContent value="program">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Program Terms</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-2 text-sm">
                <Row label="Total enrolled debt" value={formatCurrency(client.totalDebt)} />
                <Row label="Settlement target" value={formatPercent(avgSettlementPct)} />
                <Row label="Program length" value={`${client.programMonths} months`} />
                <Row label="Draft frequency" value={client.frequency} />
                <Row label="Monthly draft" value={formatCurrency(client.monthlyPayment)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Projected Outcome</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-2 text-sm">
                <Row label="Settlement amount" value={formatCurrency(settlementAmount)} />
                <Row label="Company fee" value={formatCurrency(companyFee)} />
                <Row label="Estimated savings" value={formatCurrency(estimatedSavings)} accent />
                <div className="pt-1">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Settlement progress</span><span>{formatPercent(client.settlementProgress)}</span>
                  </div>
                  <Progress value={client.settlementProgress} indicatorClassName="bg-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4">
            <Link href="/calculator" className="text-sm font-medium text-accent hover:underline">Open in Calculator →</Link>
          </div>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <Card>
            <Table>
              <THead>
                <tr><TH>Date</TH><TH>Amount</TH><TH>Method</TH><TH>Frequency</TH><TH>Status</TH></tr>
              </THead>
              <TBody>
                {clientPayments.slice(0, 12).map((p) => (
                  <TR key={p.id}>
                    <TD>{formatDate(p.scheduledDate)}</TD>
                    <TD className="font-medium tabular-nums">{formatCurrency(p.amount)}</TD>
                    <TD className="text-muted-foreground">{p.method}</TD>
                    <TD className="text-muted-foreground">{p.frequency}</TD>
                    <TD><Badge tone={paymentTone(p.status)}>{p.status}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents">
          <Card>
            <Table>
              <THead><tr><TH>Document</TH><TH>Template</TH><TH>Created</TH><TH>Status</TH></tr></THead>
              <TBody>
                {clientContracts.length === 0 && (
                  <TR><TD className="py-6 text-center text-muted-foreground" colSpan={4}>No documents yet.</TD></TR>
                )}
                {clientContracts.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.template}</TD>
                    <TD className="text-muted-foreground">Contract</TD>
                    <TD>{formatDate(c.createdDate)}</TD>
                    <TD><Badge tone={docTone(c.status)}>{c.status}</Badge></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </TabsContent>

        {/* COMMUNICATIONS */}
        <TabsContent value="communications">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Communications</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { who: "agent", name: agent?.firstName ?? "Agent", text: `Hi ${client.firstName}, your enrollment is confirmed. Your first draft of ${formatCurrency(client.monthlyPayment)} is scheduled.`, when: "5d ago" },
                { who: "client", name: client.firstName, text: "Thank you! Will the funds be drafted automatically?", when: "5d ago" },
                { who: "agent", name: agent?.firstName ?? "Agent", text: "Yes — via ACH on the 1st of each month. We'll notify you before each draft.", when: "4d ago" },
              ].map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.who === "agent" ? "" : "flex-row-reverse"}`}>
                  <Avatar size="sm" initials={m.who === "agent" ? (agent?.initials ?? "AG") : client.initials} seed={m.who + i} />
                  <div className={`max-w-[80%] rounded-xl border border-border p-3 text-sm ${m.who === "agent" ? "bg-card" : "bg-accent/[0.06]"}`}>
                    <div className="mb-0.5 flex items-center gap-2 text-2xs text-muted-foreground"><span className="font-medium text-foreground">{m.name}</span>{m.when}</div>
                    {m.text}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <Card className="max-w-2xl">
            <CardContent>
              <ol className="relative ml-3 border-l border-border">
                {[
                  { t: "Enrolled in program", d: client.enrolledDate, tone: "bg-indigo-500" },
                  { t: "Welcome packet sent", d: client.enrolledDate, tone: "bg-sky-500" },
                  { t: "First ACH draft scheduled", d: client.enrolledDate, tone: "bg-amber-500" },
                  ...(client.settlementProgress > 30 ? [{ t: "First settlement reached", d: client.enrolledDate, tone: "bg-emerald-500" }] : []),
                  { t: `Moved to ${client.stage}`, d: kase?.lastActivity ?? client.enrolledDate, tone: "bg-violet-500" },
                ].map((e, i) => (
                  <li key={i} className="mb-5 ml-5">
                    <span className={`absolute -left-[7px] mt-1 size-3.5 rounded-full border-2 border-card ${e.tone}`} />
                    <p className="text-sm font-medium">{e.t}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.d)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          <Card>
            <Table>
              <THead><tr><TH>Task</TH><TH>Priority</TH><TH>Due</TH><TH>Status</TH></tr></THead>
              <TBody>
                {clientTasks.length === 0 && (
                  <TR><TD className="py-6 text-center text-muted-foreground" colSpan={4}>No open tasks.</TD></TR>
                )}
                {clientTasks.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">{t.title}</TD>
                    <TD><Badge tone={t.priority === "Urgent" ? "rose" : t.priority === "High" ? "amber" : "slate"}>{t.priority}</Badge></TD>
                    <TD>{formatDate(t.dueDate)}</TD>
                    <TD className="text-muted-foreground">{t.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  tone,
  sub,
}: {
  icon: typeof CreditCard;
  label: string;
  value: string;
  tone: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="size-[18px]" />
      </span>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-2xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium tabular-nums ${accent ? "text-emerald-600" : ""}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
