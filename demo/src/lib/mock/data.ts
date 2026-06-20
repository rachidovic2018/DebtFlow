import { isoDaysFromToday, makeRng } from "./random";

// ───────────────────────────── Types ─────────────────────────────

export type CaseStage =
  | "Lead"
  | "Qualified"
  | "Offer Presented"
  | "Contract Sent"
  | "Contract Signed"
  | "Active Program"
  | "Settlement"
  | "Completed";

export type Risk = "Low" | "Medium" | "High";
export type DebtStatus = "Active" | "In Negotiation" | "Settled" | "Closed";
export type PaymentStatus = "Succeeded" | "Scheduled" | "Processing" | "Failed" | "Refunded";
export type PaymentMethod = "ACH" | "Card" | "Manual";
export type PaymentFrequency = "Monthly" | "Biweekly";
export type ContractStatus = "Draft" | "Sent" | "Viewed" | "Signed" | "Rejected";
export type ContractTemplate =
  | "Debt Settlement Agreement"
  | "Service Agreement"
  | "Authorization Agreement";

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
  email: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  enrolledDate: string;
  stage: CaseStage;
  risk: Risk;
  agentId: string;
  totalDebt: number;
  enrolledDebt: number;
  monthlyPayment: number;
  frequency: PaymentFrequency;
  programMonths: number;
  monthsElapsed: number;
  programProgress: number; // %
  settlementProgress: number; // % of debt resolved
  paymentReliability: number; // %
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
}

export interface DebtAccount {
  id: string;
  clientId: string;
  creditor: string;
  accountNumber: string;
  originalBalance: number;
  currentBalance: number;
  settlementTargetPct: number; // e.g. 45 => settle at 45%
  currentOffer: number | null; // dollars
  status: DebtStatus;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  clientId: string;
  stage: CaseStage;
  agentId: string;
  openedDate: string;
  lastActivity: string;
  value: number;
}

export interface Payment {
  id: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  frequency: PaymentFrequency;
  status: PaymentStatus;
  scheduledDate: string;
  processedDate: string | null;
  failureCode: string | null;
  reconciled: boolean;
}

export interface Contract {
  id: string;
  clientId: string;
  template: ContractTemplate;
  status: ContractStatus;
  createdDate: string;
  sentDate: string | null;
  viewedDate: string | null;
  signedDate: string | null;
  signerEmail: string;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  clientId: string | null;
  agentId: string | null;
  date: string;
}

export interface Task {
  id: string;
  title: string;
  clientId: string | null;
  agentId: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "To Do" | "In Progress" | "Done";
  dueDate: string;
}

// ─────────────────────────── Constants ───────────────────────────

const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Daniel", "Nancy", "Matthew", "Lisa",
  "Anthony", "Betty", "Mark", "Margaret", "Donald", "Sandra", "Carlos", "Ashley",
  "Steven", "Kimberly", "Andrew", "Emily", "Joshua", "Donna", "Kevin", "Michelle",
  "Brian", "Carol", "George", "Amanda", "Edward", "Dorothy", "Ronald", "Melissa",
  "Maria", "Angela", "Jose", "Brenda", "Tyrone", "Latoya", "Hector", "Rosa",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts",
];

const CITIES: [string, string][] = [
  ["Houston", "TX"], ["Phoenix", "AZ"], ["Philadelphia", "PA"], ["San Antonio", "TX"],
  ["Dallas", "TX"], ["Jacksonville", "FL"], ["Columbus", "OH"], ["Charlotte", "NC"],
  ["Indianapolis", "IN"], ["Denver", "CO"], ["Las Vegas", "NV"], ["Memphis", "TN"],
  ["Louisville", "KY"], ["Tampa", "FL"], ["Atlanta", "GA"], ["Mesa", "AZ"],
  ["Kansas City", "MO"], ["Tucson", "AZ"], ["Omaha", "NE"], ["Cleveland", "OH"],
];

export const CREDITORS = [
  "Chase", "Capital One", "Discover", "Citi", "Bank of America", "Wells Fargo",
  "American Express", "Synchrony Bank", "U.S. Bank", "Barclays",
];

const AGENT_NAMES: [string, string, string][] = [
  ["Olivia", "Bennett", "Sales Manager"],
  ["Marcus", "Reed", "Sales Agent"],
  ["Sofia", "Nguyen", "Sales Agent"],
  ["Derek", "Coleman", "Case Manager"],
  ["Priya", "Patel", "Case Manager"],
  ["Tasha", "Brooks", "Negotiator"],
  ["Liam", "Foster", "Negotiator"],
  ["Grace", "Sullivan", "Accounting"],
];

const STAGE_WEIGHTS: { value: CaseStage; weight: number }[] = [
  { value: "Lead", weight: 10 },
  { value: "Qualified", weight: 10 },
  { value: "Offer Presented", weight: 8 },
  { value: "Contract Sent", weight: 7 },
  { value: "Contract Signed", weight: 7 },
  { value: "Active Program", weight: 28 },
  { value: "Settlement", weight: 12 },
  { value: "Completed", weight: 8 },
];

// ─────────────────────────── Generation ──────────────────────────

const rng = makeRng();

function phone(): string {
  return `(${rng.int(200, 989)}) ${rng.int(200, 989)}-${rng.int(1000, 9999)}`;
}

export const agents: Agent[] = AGENT_NAMES.map(([first, last, role], i) => ({
  id: `agent-${i + 1}`,
  firstName: first,
  lastName: last,
  initials: `${first[0]}${last[0]}`,
  role,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@debtflow.io`,
}));

const salesAgents = agents.filter((a) => a.role.includes("Sales") || a.role.includes("Case"));

function activeStage(stage: CaseStage): boolean {
  return ["Contract Signed", "Active Program", "Settlement"].includes(stage);
}

export const clients: Client[] = Array.from({ length: 100 }, (_, i) => {
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  const [city, state] = rng.pick(CITIES);
  const stage = rng.weighted(STAGE_WEIGHTS);
  const enrolledDaysAgo = rng.int(5, 320);
  const programMonths = rng.pick([24, 30, 36, 42, 48]);
  const monthsElapsed = Math.min(
    programMonths,
    activeStage(stage) || stage === "Completed" ? rng.int(1, programMonths) : 0,
  );
  const enrolledDebt = rng.int(12, 85) * 1000 + rng.int(0, 999);
  const settlementProgress = stage === "Completed" ? 100 : Math.round((monthsElapsed / programMonths) * rng.float(70, 110));
  const monthlyIncome = rng.int(3200, 9500);
  const monthlyExpenses = Math.round(monthlyIncome * rng.float(0.55, 0.8));
  const frequency: PaymentFrequency = rng.bool(0.65) ? "Monthly" : "Biweekly";
  const monthlyPayment = Math.round(enrolledDebt / programMonths / 10) * 10;

  return {
    id: `client-${i + 1}`,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    initials: `${firstName[0]}${lastName[0]}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rng.int(1, 99)}@gmail.com`,
    phone: phone(),
    city,
    state,
    enrolledDate: isoDaysFromToday(-enrolledDaysAgo),
    stage,
    risk: rng.weighted([
      { value: "Low" as Risk, weight: 55 },
      { value: "Medium" as Risk, weight: 33 },
      { value: "High" as Risk, weight: 12 },
    ]),
    agentId: rng.pick(salesAgents).id,
    totalDebt: enrolledDebt, // refined to sum of debts below
    enrolledDebt,
    monthlyPayment,
    frequency,
    programMonths,
    monthsElapsed,
    programProgress: Math.min(100, Math.round((monthsElapsed / programMonths) * 100)),
    settlementProgress: Math.min(100, Math.max(0, settlementProgress)),
    paymentReliability: rng.int(78, 100),
    monthlyIncome,
    monthlyExpenses,
    disposableIncome: monthlyIncome - monthlyExpenses,
  };
});

// 250 debt accounts distributed across clients (each client 1-4).
export const debtAccounts: DebtAccount[] = [];
{
  let remaining = 250;
  const clientList = [...clients];
  // Ensure every client gets at least one.
  for (const client of clientList) {
    const count = Math.min(remaining - (clientList.length - clientList.indexOf(client) - 1), rng.int(1, 4));
    const n = Math.max(1, count);
    let clientTotal = 0;
    for (let k = 0; k < n && remaining > 0; k++) {
      const creditor = rng.pick(CREDITORS);
      const original = rng.int(2, 28) * 1000 + rng.int(0, 999);
      const settledOrActive = client.stage === "Completed";
      const status: DebtStatus = settledOrActive
        ? "Settled"
        : rng.weighted([
            { value: "Active" as DebtStatus, weight: 45 },
            { value: "In Negotiation" as DebtStatus, weight: 30 },
            { value: "Settled" as DebtStatus, weight: 20 },
            { value: "Closed" as DebtStatus, weight: 5 },
          ]);
      const settlementTargetPct = rng.pick([40, 42, 45, 48, 50, 55]);
      const current = status === "Settled" ? Math.round(original * (settlementTargetPct / 100)) : original;
      const currentOffer =
        status === "In Negotiation" ? Math.round(original * (rng.float(0.5, 0.65))) : status === "Settled" ? current : null;
      clientTotal += original;
      debtAccounts.push({
        id: `debt-${debtAccounts.length + 1}`,
        clientId: client.id,
        creditor,
        accountNumber: `****${rng.int(1000, 9999)}`,
        originalBalance: original,
        currentBalance: current,
        settlementTargetPct,
        currentOffer,
        status,
      });
      remaining--;
    }
    client.totalDebt = clientTotal;
  }
  // Distribute any leftover debts to random clients.
  while (remaining > 0) {
    const client = rng.pick(clients);
    const original = rng.int(2, 20) * 1000;
    debtAccounts.push({
      id: `debt-${debtAccounts.length + 1}`,
      clientId: client.id,
      creditor: rng.pick(CREDITORS),
      accountNumber: `****${rng.int(1000, 9999)}`,
      originalBalance: original,
      currentBalance: original,
      settlementTargetPct: 45,
      currentOffer: null,
      status: "Active",
    });
    client.totalDebt += original;
    remaining--;
  }
}

// One case per client (100); "active" subset drives the dashboard KPI.
export const cases: CaseRecord[] = clients.map((client, i) => ({
  id: `case-${i + 1}`,
  caseNumber: `DF-2026-${String(1000 + i).padStart(4, "0")}`,
  clientId: client.id,
  stage: client.stage,
  agentId: client.agentId,
  openedDate: client.enrolledDate,
  lastActivity: isoDaysFromToday(-rng.int(0, 14)),
  value: client.totalDebt,
}));

// 500 payments across clients with realistic statuses/dates.
const FAILURE_CODES = ["R01 Insufficient Funds", "R02 Account Closed", "R03 No Account", "R08 Payment Stopped"];
export const payments: Payment[] = Array.from({ length: 500 }, (_, i) => {
  const client = rng.pick(clients);
  const dayOffset = rng.int(-150, 30);
  const isFuture = dayOffset > 0;
  const status: PaymentStatus = isFuture
    ? "Scheduled"
    : rng.weighted([
        { value: "Succeeded" as PaymentStatus, weight: 80 },
        { value: "Failed" as PaymentStatus, weight: 9 },
        { value: "Processing" as PaymentStatus, weight: 6 },
        { value: "Refunded" as PaymentStatus, weight: 5 },
      ]);
  const scheduledDate = isoDaysFromToday(dayOffset);
  return {
    id: `pay-${i + 1}`,
    clientId: client.id,
    amount: client.monthlyPayment || rng.int(20, 120) * 10,
    method: rng.weighted([
      { value: "ACH" as PaymentMethod, weight: 85 },
      { value: "Card" as PaymentMethod, weight: 10 },
      { value: "Manual" as PaymentMethod, weight: 5 },
    ]),
    frequency: client.frequency,
    status,
    scheduledDate,
    processedDate: status === "Succeeded" || status === "Refunded" ? scheduledDate : null,
    failureCode: status === "Failed" ? rng.pick(FAILURE_CODES) : null,
    reconciled: status === "Succeeded" ? rng.bool(0.85) : false,
  };
});

// 25 contracts across clients.
const TEMPLATES: ContractTemplate[] = [
  "Debt Settlement Agreement",
  "Service Agreement",
  "Authorization Agreement",
];
export const contracts: Contract[] = Array.from({ length: 25 }, (_, i) => {
  const client = rng.pick(clients);
  const status = rng.weighted([
    { value: "Signed" as ContractStatus, weight: 45 },
    { value: "Sent" as ContractStatus, weight: 18 },
    { value: "Viewed" as ContractStatus, weight: 17 },
    { value: "Draft" as ContractStatus, weight: 12 },
    { value: "Rejected" as ContractStatus, weight: 8 },
  ]);
  const createdOffset = -rng.int(2, 60);
  const created = isoDaysFromToday(createdOffset);
  const sent = status !== "Draft" ? isoDaysFromToday(createdOffset + 1) : null;
  const viewed = ["Viewed", "Signed", "Rejected"].includes(status)
    ? isoDaysFromToday(createdOffset + 2)
    : null;
  const signed = status === "Signed" ? isoDaysFromToday(createdOffset + 3) : null;
  return {
    id: `contract-${i + 1}`,
    clientId: client.id,
    template: rng.pick(TEMPLATES),
    status,
    createdDate: created,
    sentDate: sent,
    viewedDate: viewed,
    signedDate: signed,
    signerEmail: client.email,
  };
});

// Recent activity feed (~40 items).
const ACTIVITY_TYPES = [
  "enrolled in the program",
  "made a payment",
  "signed the settlement agreement",
  "had a payment fail",
  "moved to Active Program",
  "received a settlement offer",
  "uploaded a document",
  "was assigned to a negotiator",
];
export const activities: Activity[] = Array.from({ length: 40 }, (_, i) => {
  const client = rng.pick(clients);
  return {
    id: `act-${i + 1}`,
    type: "client",
    description: `${client.fullName} ${rng.pick(ACTIVITY_TYPES)}`,
    clientId: client.id,
    agentId: rng.pick(agents).id,
    date: isoDaysFromToday(-rng.int(0, 9)),
  };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

// Tasks (~30).
const TASK_TITLES = [
  "Follow up on missed ACH payment",
  "Review settlement offer from Discover",
  "Collect updated proof of income",
  "Call client about contract signature",
  "Negotiate Capital One balance",
  "Verify bank account details",
  "Send welcome packet",
  "Escalate high-risk account to compliance",
  "Confirm settlement funds available",
  "Schedule program review call",
];
export const tasks: Task[] = Array.from({ length: 30 }, (_, i) => {
  const client = rng.pick(clients);
  return {
    id: `task-${i + 1}`,
    title: rng.pick(TASK_TITLES),
    clientId: client.id,
    agentId: rng.pick(agents).id,
    priority: rng.weighted([
      { value: "Low" as const, weight: 20 },
      { value: "Medium" as const, weight: 40 },
      { value: "High" as const, weight: 28 },
      { value: "Urgent" as const, weight: 12 },
    ]),
    status: rng.weighted([
      { value: "To Do" as const, weight: 45 },
      { value: "In Progress" as const, weight: 35 },
      { value: "Done" as const, weight: 20 },
    ]),
    dueDate: isoDaysFromToday(rng.int(-3, 14)),
  };
});
