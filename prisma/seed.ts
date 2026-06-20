import { PrismaClient, type UserRole, type ClientStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptField } from "../src/lib/crypto";

const prisma = new PrismaClient();
const c = (dollars: number): bigint => BigInt(Math.round(dollars * 100));
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length];

const SECTORS = ["Restaurant", "Retail", "Construction", "Trucking", "Auto Repair", "Salon", "Medical", "Wholesale"];
const CREDITOR_NAMES = ["Rapid Capital", "OnDeck", "Kabbage", "BlueVine", "Fundbox", "Square Capital"];
const BIZ = ["Sunrise Diner LLC", "Apex Auto Repair", "Metro Construction Co", "Coastal Trucking Inc", "Bella Salon", "Prime Wholesale", "GreenLeaf Medical", "Urban Retail Group", "Summit Cafe", "Liberty Logistics"];

async function main() {
  console.log("Seeding MCA CRM...");

  // ── Users across roles ──
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);
  const roleUsers: { name: string; email: string; role: UserRole }[] = [
    { name: "Alex Morgan", email: "admin@capitalflow.io", role: "ADMIN" },
    { name: "Sam Rivera", email: "sales@capitalflow.io", role: "SALES_REP" },
    { name: "Jordan Blake", email: "brokermgr@capitalflow.io", role: "BROKER_MANAGER" },
    { name: "Casey Lin", email: "underwriter@capitalflow.io", role: "UNDERWRITER" },
    { name: "Taylor Reed", email: "funding@capitalflow.io", role: "FUNDER_OPS" },
    { name: "Morgan Diaz", email: "collections@capitalflow.io", role: "COLLECTIONS" },
    { name: "Riley Stone", email: "syndication@capitalflow.io", role: "SYNDICATION_MANAGER" },
    { name: "Quinn Avery", email: "auditor@capitalflow.io", role: "AUDITOR_READONLY" },
  ];
  const users: { id: string; role: UserRole; email: string }[] = [];
  for (const u of roleUsers) {
    users.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: u.role === "ADMIN" ? adminHash : userHash, role: u.role },
        create: { ...u, passwordHash: u.role === "ADMIN" ? adminHash : userHash },
      }),
    );
  }
  const salesReps = users.filter((u) => u.role === "SALES_REP" || u.role === "ADMIN");

  // ── Teams ──
  const teamA = await prisma.team.create({ data: { name: "East Coast", managerId: users[2].id } });
  const teamB = await prisma.team.create({ data: { name: "West Coast", managerId: users[2].id } });

  // ── Brokers / ISOs ──
  const brokers: { id: string }[] = [];
  for (const [name, bps] of [["Northeast Funding ISO", 0.04], ["Velocity Capital Partners", 0.03]] as const) {
    brokers.push(await prisma.broker.create({ data: { name, email: `${name.split(" ")[0].toLowerCase()}@iso.com`, commissionPct: bps } }));
  }

  // ── Contract templates ──
  await prisma.contractTemplate.createMany({
    data: [
      { name: "Standard MCA Agreement", digisignerTemplateId: "tpl_mca_std", docType: "MCA_AGREEMENT", fieldMapping: { client_name: "f1", advance_amount: "f2", purchased_amount: "f3", factor_rate: "f4", holdback_pct: "f5" } },
      { name: "ACH Authorization", digisignerTemplateId: "tpl_ach_auth", docType: "ACH_AUTHORIZATION", fieldMapping: { client_name: "f1", bank_name: "f2" } },
    ],
  });

  // ── Creditors ──
  const creditors: { id: string }[] = [];
  for (const name of CREDITOR_NAMES) {
    creditors.push(await prisma.creditor.create({ data: { name, sector: "MCA / Working Capital" } }));
  }

  // ── Leads (open pipeline) ──
  const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "APPLICATION_STARTED"] as const;
  for (let i = 0; i < 6; i++) {
    await prisma.lead.create({
      data: {
        businessName: `${pick(["Bright", "Metro", "Apex", "Coastal", "Summit", "Liberty"], i)} ${pick(["Ventures", "Services", "Group", "Co"], i)}`,
        contactName: pick(["Pat", "Jamie", "Chris", "Dana"], i) + " Owner",
        email: `lead${i}@example.com`,
        phone: `(212) 555-0${100 + i}`,
        status: pick([...leadStatuses], i),
        score: 50 + ((i * 11) % 45),
        source: pick(["Inbound", "Broker", "Referral", "PaidSearch"], i),
        requestedAmountCents: c((20 + i * 5) * 1000),
        ownerId: pick(salesReps, i).id,
        brokerId: i % 2 === 0 ? brokers[i % brokers.length].id : null,
      },
    });
  }

  // ── Clients with full deal flow ──
  const clientStatuses: ClientStatus[] = ["ACTIVE_CLIENT", "ACTIVE_CLIENT", "ACTIVE_CLIENT", "DELINQUENT", "PROSPECT", "COMPLETED", "ACTIVE_CLIENT", "PROSPECT"];
  for (let i = 0; i < BIZ.length; i++) {
    const status = pick(clientStatuses, i);
    const client = await prisma.client.create({
      data: {
        legalName: BIZ[i],
        dba: BIZ[i].split(" ")[0],
        sector: pick(SECTORS, i),
        businessType: "LLC",
        ein: `12-${3000000 + i}`,
        phone: `(310) 555-0${200 + i}`,
        email: `ap@${BIZ[i].split(" ")[0].toLowerCase()}.com`,
        city: pick(["New York", "Los Angeles", "Houston", "Phoenix"], i),
        state: pick(["NY", "CA", "TX", "AZ"], i),
        status,
        clientScore: 55 + ((i * 7) % 40),
        ownerId: pick(salesReps, i).id,
        teamId: i % 2 === 0 ? teamA.id : teamB.id,
        brokerId: i % 3 === 0 ? brokers[i % brokers.length].id : null,
        contacts: {
          create: [{
            fullName: pick(["Maria", "John", "David", "Sarah"], i) + " " + BIZ[i].split(" ")[0],
            email: `owner@${BIZ[i].split(" ")[0].toLowerCase()}.com`,
            ownershipPct: 100,
            isGuarantor: true,
            // guaranteeType defaults to PERFORMANCE_VALIDITY
            ssnEncrypted: encryptField(`000-00-${1000 + i}`),
          }],
        },
        bankAccounts: {
          create: [{ bankName: pick(["Chase", "Wells Fargo", "BofA"], i), accountNumberEnc: encryptField(`00012${10000 + i}`), routingNumberEnc: encryptField("021000021"), isPrimary: true }],
        },
        creditorRelationships: {
          create: Array.from({ length: 1 + (i % 3) }, (_, k) => ({
            creditorId: pick(creditors, i + k).id,
            balanceCents: c((5 + k * 4 + (i % 5)) * 1000),
            monthlyPaymentCents: c((300 + k * 150)),
          })),
        },
      },
    });

    // Active/delinquent/completed clients have a funded deal + ledger + EPPS
    const funded = ["ACTIVE_CLIENT", "DELINQUENT", "COMPLETED"].includes(status);
    if (funded) {
      const advance = c((25 + i * 6) * 1000);
      const factor = 1.45 + (i % 3) * 0.07;
      const purchased = BigInt(Math.round(Number(advance) * factor));
      const holdback = 0.1 + (i % 3) * 0.02;

      const app = await prisma.application.create({
        data: {
          clientId: client.id, ownerId: pick(salesReps, i).id, status: "FUNDED",
          requestedAmountCents: advance, useOfFunds: "Working capital",
          avgMonthlyRevenueCents: c((40 + i * 8) * 1000), negativeDays: i % 4, hasStacking: i % 5 === 0,
        },
      });
      await prisma.underwritingDecision.create({
        data: {
          applicationId: app.id, underwriterId: users[3].id, version: 1, outcome: "APPROVED",
          approvedAmountCents: advance, factorRate: factor, holdbackPct: holdback,
          remittanceFrequency: "DAILY", estimatedTermDays: 180 + i * 10, paybackAmountCents: purchased,
        },
      });
      const deal = await prisma.deal.create({
        data: {
          clientId: client.id, applicationId: app.id,
          status: status === "COMPLETED" ? "COMPLETED" : "COLLECTING",
          advanceAmountCents: advance, purchasedAmountCents: purchased,
          factorRate: factor, holdbackPct: holdback, remittanceFrequency: "DAILY",
          estimatedTermDays: 180 + i * 10, fundedAt: new Date("2026-04-01"),
        },
      });
      await prisma.contract.create({
        data: { clientId: client.id, dealId: deal.id, applicationId: app.id, status: "SIGNED", signedAt: new Date("2026-03-30"), mergedData: { advance: advance.toString(), factor } },
      });
      await prisma.eppsEnrollment.create({ data: { clientId: client.id, status: "ENROLLED", enrolledAt: new Date("2026-03-31"), eppsCustomerId: `epps_${i}` } });

      // Company books: funding outflow
      await prisma.transaction.create({ data: { type: "FUNDING_OUTFLOW", status: "CLEARED", amountCents: advance, clientId: client.id, dealId: deal.id } });

      // Collected payments → ledger + transactions + EPPS
      const perRemit = BigInt(Math.round(Number(purchased) / (180 + i * 10)));
      const paymentsMade = status === "COMPLETED" ? 180 + i * 10 : 20 + i * 5;
      let collectedCount = Math.min(paymentsMade, 40);
      for (let p = 0; p < collectedCount; p++) {
        const day = new Date("2026-04-02"); day.setDate(day.getDate() + p);
        const epps = await prisma.eppsPayment.create({
          data: { dealId: deal.id, clientId: client.id, status: "CLEARED", amountCents: perRemit, dueDate: day, clearedAt: day, eppsTxnId: `epps_txn_${deal.id}_${p}` },
        });
        await prisma.ledgerEntry.create({ data: { dealId: deal.id, type: "PAYBACK_COLLECTION", amountCents: perRemit, eppsPaymentId: epps.id, occurredAt: day } });
        await prisma.transaction.create({ data: { type: "CLIENT_PAYMENT", status: "CLEARED", amountCents: perRemit, clientId: client.id, dealId: deal.id, eppsPaymentId: epps.id, occurredAt: day } });
      }
      // Upcoming queued remittance
      const next = new Date("2026-06-22");
      await prisma.eppsPayment.create({ data: { dealId: deal.id, clientId: client.id, status: "QUEUED", amountCents: perRemit, dueDate: next, batchWindow: "12:30CT" } });

      // Delinquent → open collections case from a returned payment
      if (status === "DELINQUENT") {
        const ret = await prisma.eppsPayment.create({ data: { dealId: deal.id, clientId: client.id, status: "RETURNED", amountCents: perRemit, dueDate: new Date("2026-06-15"), returnedAt: new Date("2026-06-16"), returnCode: "R01", eppsTxnId: `epps_txn_${deal.id}_ret` } });
        await prisma.collectionsCase.create({ data: { dealId: deal.id, clientId: client.id, status: "OPEN", bucket: "DPD_1_15", openedFromEppsPaymentId: ret.id, balanceAtOpenCents: perRemit } });
      }
    } else {
      // Non-funded clients have an application in the underwriting pipeline.
      const appStatus = pick(["SUBMITTED", "UNDER_REVIEW", "UNDERWRITING"] as const, i);
      const app = await prisma.application.create({
        data: {
          clientId: client.id, ownerId: pick(salesReps, i).id, status: appStatus,
          requestedAmountCents: c((30 + i * 4) * 1000), useOfFunds: pick(["Inventory", "Equipment", "Payroll", "Expansion"], i),
          stips: {
            create: [
              { name: "4 months bank statements", status: i % 2 === 0 ? "RECEIVED" : "REQUESTED" },
              { name: "Driver's license", status: "RECEIVED" },
              { name: "Voided check", status: "REQUESTED" },
            ],
          },
        },
      });
      await prisma.activity.create({ data: { entityType: "Application", entityId: app.id, type: "created", summary: `Application submitted for ${client.legalName}` } });
    }
  }

  const counts = {
    users: await prisma.user.count(), teams: await prisma.team.count(), brokers: await prisma.broker.count(),
    leads: await prisma.lead.count(), clients: await prisma.client.count(), applications: await prisma.application.count(),
    deals: await prisma.deal.count(), ledgerEntries: await prisma.ledgerEntry.count(), transactions: await prisma.transaction.count(),
    eppsPayments: await prisma.eppsPayment.count(), contracts: await prisma.contract.count(), collectionsCases: await prisma.collectionsCase.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Login: admin@capitalflow.io / admin123");
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
