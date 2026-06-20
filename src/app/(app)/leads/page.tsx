import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { LeadBoard, type BoardLead } from "@/components/leads/lead-board";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, convertedCount, lostCount] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED", "APPLICATION_STARTED"] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        contactName: true,
        score: true,
        requestedAmountCents: true,
        status: true,
        owner: { select: { name: true } },
        broker: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where: { status: "CONVERTED" } }),
    prisma.lead.count({ where: { status: "LOST" } }),
  ]);

  const boardLeads: BoardLead[] = leads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    contactName: l.contactName,
    score: l.score,
    requestedAmountCents: l.requestedAmountCents != null ? l.requestedAmountCents.toString() : null,
    status: l.status,
    ownerName: l.owner?.name ?? null,
    brokerName: l.broker?.name ?? null,
  }));

  return (
    <div>
      <PageHeader title="Leads" description="Sales pipeline · merchant cash advance">
        <Badge tone="emerald" dot>
          {convertedCount} converted
        </Badge>
        <Badge tone="rose" dot>
          {lostCount} lost
        </Badge>
        <Link href="/leads/new" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
          <Plus />
          New Lead
        </Link>
      </PageHeader>

      <LeadBoard leads={boardLeads} />
    </div>
  );
}
