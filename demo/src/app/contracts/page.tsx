import { FileSignature, CheckCircle2, Clock, FileClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  ContractStudio,
  type ContractRow,
  type SampleClient,
} from "@/components/contracts/contract-studio";
import { contracts, clients, getClient } from "@/lib/mock";
import { formatNumber } from "@/lib/utils";

export default function ContractsPage() {
  const rows: ContractRow[] = contracts
    .map((c) => {
      const client = getClient(c.clientId);
      return {
        id: c.id,
        template: c.template,
        status: c.status,
        createdDate: c.createdDate,
        sentDate: c.sentDate,
        viewedDate: c.viewedDate,
        signedDate: c.signedDate,
        clientId: c.clientId,
        clientName: client?.fullName ?? "—",
      };
    })
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));

  // Sample clients for the generator dropdown (richest debt first).
  const sampleClients: SampleClient[] = [...clients]
    .sort((a, b) => b.totalDebt - a.totalDebt)
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      fullName: c.fullName,
      city: c.city,
      state: c.state,
      totalDebt: c.totalDebt,
      monthlyPayment: c.monthlyPayment,
      programMonths: c.programMonths,
      frequency: c.frequency,
      email: c.email,
    }));

  const total = rows.length;
  const signed = rows.filter((r) => r.status === "Signed").length;
  const pending = rows.filter((r) => r.status === "Sent" || r.status === "Viewed").length;
  const drafts = rows.filter((r) => r.status === "Draft").length;

  return (
    <div>
      <PageHeader
        title="Contracts"
        description="Generate, send, and track e-signature contracts via DigiSigner."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Contracts" value={formatNumber(total)} icon={FileSignature} accent="indigo" />
        <StatCard label="Signed" value={formatNumber(signed)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Awaiting Signature" value={formatNumber(pending)} icon={Clock} accent="amber" hint="Sent or viewed" />
        <StatCard label="Drafts" value={formatNumber(drafts)} icon={FileClock} accent="sky" />
      </div>

      <ContractStudio contracts={rows} clients={sampleClients} />
    </div>
  );
}
