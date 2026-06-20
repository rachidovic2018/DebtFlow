import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

// Dashboard rollups (CLAUDE.md Phase 9). Heavy rankings are precomputed by a
// cron into the Snapshot table; the dashboard reads them. Live counts/balances
// are queried directly on the page.

export interface DashboardSnapshot {
  computedAt: string;
  topCreditors: { name: string; clientCount: number; totalBalanceCents: string }[];
  topSectors: { sector: string; clientCount: number; fundedVolumeCents: string }[];
  scoreDistribution: { bucket: string; count: number }[];
  avgClientScore: number;
  avgCreditorsPerClient: number;
}

export async function computeDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [rels, clients] = await Promise.all([
    prisma.creditorRelationship.findMany({ include: { creditor: { select: { name: true } } } }),
    prisma.client.findMany({ select: { sector: true, clientScore: true, deals: { select: { advanceAmountCents: true } } } }),
  ]);

  // Most-relevant creditor: rank by client count, then total balance.
  const creditorMap = new Map<string, { name: string; clients: Set<string>; total: bigint }>();
  for (const r of rels) {
    const e = creditorMap.get(r.creditorId) ?? { name: r.creditor.name, clients: new Set<string>(), total: 0n };
    e.clients.add(r.clientId);
    e.total += r.balanceCents;
    creditorMap.set(r.creditorId, e);
  }
  const topCreditors = [...creditorMap.values()]
    .map((e) => ({ name: e.name, clientCount: e.clients.size, totalBalanceCents: e.total.toString() }))
    .sort((a, b) => b.clientCount - a.clientCount || Number(BigInt(b.totalBalanceCents) - BigInt(a.totalBalanceCents)))
    .slice(0, 5);

  // Most-relevant sector: rank by client count + funded volume.
  const sectorMap = new Map<string, { count: number; funded: bigint }>();
  for (const c of clients) {
    const key = c.sector ?? "Unknown";
    const e = sectorMap.get(key) ?? { count: 0, funded: 0n };
    e.count += 1;
    e.funded += c.deals.reduce((s, d) => s + d.advanceAmountCents, 0n);
    sectorMap.set(key, e);
  }
  const topSectors = [...sectorMap.entries()]
    .map(([sector, e]) => ({ sector, clientCount: e.count, fundedVolumeCents: e.funded.toString() }))
    .sort((a, b) => b.clientCount - a.clientCount || Number(BigInt(b.fundedVolumeCents) - BigInt(a.fundedVolumeCents)))
    .slice(0, 5);

  // Client score distribution + average.
  const buckets = [
    { bucket: "90–100", min: 90, count: 0 },
    { bucket: "80–89", min: 80, count: 0 },
    { bucket: "70–79", min: 70, count: 0 },
    { bucket: "60–69", min: 60, count: 0 },
    { bucket: "<60", min: 0, count: 0 },
  ];
  let scoreSum = 0;
  let scored = 0;
  for (const c of clients) {
    if (c.clientScore == null) continue;
    scored++;
    scoreSum += c.clientScore;
    const b = buckets.find((x) => c.clientScore! >= x.min)!;
    b.count++;
  }

  const snapshot: DashboardSnapshot = {
    computedAt: new Date().toISOString(),
    topCreditors,
    topSectors,
    scoreDistribution: buckets.map((b) => ({ bucket: b.bucket, count: b.count })),
    avgClientScore: scored ? Math.round(scoreSum / scored) : 0,
    avgCreditorsPerClient: clients.length ? Number((rels.length / clients.length).toFixed(1)) : 0,
  };

  await prisma.snapshot.upsert({
    where: { key: "dashboard" },
    update: { data: snapshot as unknown as Prisma.InputJsonValue, computedAt: new Date() },
    create: { key: "dashboard", data: snapshot as unknown as Prisma.InputJsonValue },
  });
  return snapshot;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  const row = await prisma.snapshot.findUnique({ where: { key: "dashboard" } });
  return row ? (row.data as unknown as DashboardSnapshot) : null;
}
