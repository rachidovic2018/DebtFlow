"use client";

import {
  UserCircle,
  Building2,
  Users,
  Plug,
  Bell,
  Mail,
  ShieldCheck,
  PenLine,
  Banknote,
  MessageSquare,
  Wallet,
  Check,
  KeyRound,
  Monitor,
  History,
  Lock,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Select } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { NotificationToggles } from "@/components/settings/notification-toggles";
import { agents } from "@/lib/mock";

function Field({
  label,
  value,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Input defaultValue={value} type={type} />
    </div>
  );
}

const ROLE_TONES: Record<string, "indigo" | "emerald" | "amber" | "sky" | "violet" | "slate"> = {
  "Sales Manager": "indigo",
  "Sales Agent": "sky",
  "Case Manager": "violet",
  Negotiator: "amber",
  Accounting: "emerald",
};

type AuditTone = "indigo" | "emerald" | "amber" | "sky" | "violet" | "slate" | "rose";
const AUDIT_EVENTS: {
  actor: string;
  action: string;
  target: string;
  when: string;
  ip: string;
  tone: AuditTone;
}[] = [
  { actor: "Olivia Bennett", action: "Updated", target: "Client · James Carter program", when: "2 min ago", ip: "72.14.201.5", tone: "sky" },
  { actor: "Grace Sullivan", action: "Reconciled", target: "ACH batch · 142 payments", when: "1 hr ago", ip: "98.42.10.71", tone: "emerald" },
  { actor: "Derek Coleman", action: "Voided", target: "Contract · DF-2026-1043", when: "3 hr ago", ip: "64.233.160.2", tone: "rose" },
  { actor: "Olivia Bennett", action: "Role changed", target: "User · Marcus Reed → Case Manager", when: "Yesterday", ip: "72.14.201.5", tone: "amber" },
  { actor: "Tasha Brooks", action: "Exported", target: "Settlement report · Q2", when: "Yesterday", ip: "12.108.33.9", tone: "violet" },
  { actor: "Priya Patel", action: "Viewed", target: "Compliance audit · 38 cases", when: "2 days ago", ip: "45.79.12.88", tone: "slate" },
];

interface Integration {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  iconTone: string;
}

const ICON_TILE: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-500",
};

const INTEGRATIONS: Integration[] = [
  {
    name: "DigiSigner",
    description: "E-signature for settlement and service agreements",
    icon: PenLine,
    connected: true,
    iconTone: "indigo",
  },
  {
    name: "Stripe ACH",
    description: "Bank drafts and recurring payment collection",
    icon: Banknote,
    connected: true,
    iconTone: "violet",
  },
  {
    name: "Twilio SMS",
    description: "Automated client reminders and notifications",
    icon: MessageSquare,
    connected: true,
    iconTone: "sky",
  },
  {
    name: "Plaid",
    description: "Bank account verification and balance checks",
    icon: Wallet,
    connected: false,
    iconTone: "slate",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile, organization, team, and integrations"
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">
            <span className="inline-flex items-center gap-1.5">
              <UserCircle className="size-4" /> Profile
            </span>
          </TabsTrigger>
          <TabsTrigger value="organization">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" /> Organization
            </span>
          </TabsTrigger>
          <TabsTrigger value="team">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> Team
            </span>
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <span className="inline-flex items-center gap-1.5">
              <Plug className="size-4" /> Integrations
            </span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <span className="inline-flex items-center gap-1.5">
              <Bell className="size-4" /> Notifications
            </span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> Security &amp; Audit
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Profile</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your personal account details
                </p>
              </div>
              <Button size="sm">Save changes</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar initials="OB" seed="agent-1" size="lg" />
                <div>
                  <p className="text-sm font-semibold">Olivia Bennett</p>
                  <p className="text-xs text-muted-foreground">
                    Sales Manager · Acme Debt Relief
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Change photo
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="First name" value="Olivia" />
                <Field label="Last name" value="Bennett" />
                <Field label="Email" value="olivia.bennett@debtflow.io" type="email" />
                <Field label="Phone" value="(415) 555-0142" />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Role</label>
                  <Select defaultValue="Sales Manager">
                    <option>Sales Manager</option>
                    <option>Sales Agent</option>
                    <option>Case Manager</option>
                    <option>Negotiator</option>
                    <option>Accounting</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Timezone</label>
                  <Select defaultValue="America/Los_Angeles">
                    <option>America/Los_Angeles</option>
                    <option>America/Denver</option>
                    <option>America/Chicago</option>
                    <option>America/New_York</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Organization</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Company profile and fiscal configuration
                </p>
              </div>
              <Button size="sm">Save changes</Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Company name" value="Acme Debt Relief" />
              <Field label="Legal entity" value="Acme Debt Relief, LLC" />
              <Field label="Street address" value="500 Market Street, Suite 1200" />
              <Field label="City" value="San Francisco" />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">State</label>
                <Select defaultValue="CA">
                  <option>CA</option>
                  <option>TX</option>
                  <option>FL</option>
                  <option>NY</option>
                </Select>
              </div>
              <Field label="ZIP code" value="94105" />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Timezone</label>
                <Select defaultValue="America/Los_Angeles">
                  <option>America/Los_Angeles</option>
                  <option>America/Denver</option>
                  <option>America/Chicago</option>
                  <option>America/New_York</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Fiscal year start
                </label>
                <Select defaultValue="January">
                  <option>January</option>
                  <option>April</option>
                  <option>July</option>
                  <option>October</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Currency</label>
                <Select defaultValue="USD ($)">
                  <option>USD ($)</option>
                  <option>CAD ($)</option>
                </Select>
              </div>
              <Field label="Tax ID (EIN)" value="47-1029384" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Team</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {agents.length} members in your workspace
                </p>
              </div>
              <Button size="sm">
                <Mail className="size-4" /> Invite
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Member</TH>
                    <TH>Role</TH>
                    <TH>Email</TH>
                    <TH className="text-right">Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {agents.map((a) => (
                    <TR key={a.id}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar initials={a.initials} seed={a.id} size="sm" />
                          <span className="font-medium">
                            {a.firstName} {a.lastName}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={ROLE_TONES[a.role] ?? "slate"}>{a.role}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{a.email}</TD>
                      <TD className="text-right">
                        <Badge tone="emerald" dot>
                          Active
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {INTEGRATIONS.map((it) => {
              const Icon = it.icon;
              return (
                <Card key={it.name}>
                  <CardContent className="flex items-start gap-4">
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${ICON_TILE[it.iconTone]}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{it.name}</p>
                        {it.connected ? (
                          <Badge tone="emerald">
                            <Check className="size-3" /> Connected
                          </Badge>
                        ) : (
                          <Badge tone="slate">Not connected</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {it.description}
                      </p>
                      <Button
                        variant={it.connected ? "outline" : "primary"}
                        size="sm"
                        className="mt-3"
                      >
                        {it.connected ? "Manage" : "Connect"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Notifications</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose what events trigger an alert
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <NotificationToggles />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & Audit */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Access & authentication */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Access &amp; Authentication</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border pt-0">
                {[
                  {
                    icon: KeyRound,
                    title: "Two-factor authentication",
                    desc: "Required for every user in the workspace",
                    control: <Badge tone="emerald"><Check className="size-3" /> Enforced</Badge>,
                  },
                  {
                    icon: Lock,
                    title: "Single sign-on (SSO)",
                    desc: "SAML / Okta for centralized identity",
                    control: <Button variant="outline" size="sm">Configure</Button>,
                  },
                  {
                    icon: ShieldCheck,
                    title: "Password policy",
                    desc: "12+ characters, rotated every 90 days",
                    control: <Badge tone="slate">Active</Badge>,
                  },
                  {
                    icon: History,
                    title: "Session timeout",
                    desc: "Auto sign-out after 30 minutes idle",
                    control: <Badge tone="slate">30 min</Badge>,
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.title} className="flex items-center justify-between gap-4 py-3.5 first:pt-1">
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <Icon className="size-[18px]" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{row.title}</p>
                          <p className="text-xs text-muted-foreground">{row.desc}</p>
                        </div>
                      </div>
                      {row.control}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Active sessions + data retention */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { who: "Olivia Bennett", device: "Chrome · macOS", loc: "Dallas, TX", current: true },
                    { who: "Derek Coleman", device: "Safari · iPhone", loc: "Phoenix, AZ", current: false },
                    { who: "Grace Sullivan", device: "Edge · Windows", loc: "Tampa, FL", current: false },
                  ].map((s) => (
                    <div key={s.who} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Monitor className="size-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.who}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.device} · {s.loc}</p>
                      </div>
                      {s.current ? (
                        <Badge tone="emerald" dot>This device</Badge>
                      ) : (
                        <Button variant="ghost" size="sm">Revoke</Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data &amp; Retention</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Record retention</span>
                    <span className="font-medium">7 years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Audit log retention</span>
                    <span className="font-medium">3 years</span>
                  </div>
                  <Separator />
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="size-4" /> Export audit log (CSV)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Audit log */}
          <Card className="mt-4">
            <CardHeader>
              <div>
                <CardTitle>Audit Log</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every change is recorded for compliance
                </p>
              </div>
              <Badge tone="slate"><History className="size-3" /> Live</Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Table>
                <THead>
                  <tr>
                    <TH>User</TH>
                    <TH>Action</TH>
                    <TH>Target</TH>
                    <TH>When</TH>
                    <TH>IP address</TH>
                  </tr>
                </THead>
                <TBody>
                  {AUDIT_EVENTS.map((e, i) => (
                    <TR key={i}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" initials={e.actor.split(" ").map((p) => p[0]).join("")} seed={e.actor} />
                          <span className="font-medium">{e.actor}</span>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={e.tone}>{e.action}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{e.target}</TD>
                      <TD className="text-muted-foreground">{e.when}</TD>
                      <TD className="font-mono text-xs text-muted-foreground">{e.ip}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
