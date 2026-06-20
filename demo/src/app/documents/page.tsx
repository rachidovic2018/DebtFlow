import { FileText, FileSignature, CheckCircle2, Clock, FilePen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DocumentsCenter, type DocItem } from "@/components/documents/documents-center";
import { contracts, clients, getClient } from "@/lib/mock";
import { formatNumber } from "@/lib/utils";

export default function DocumentsPage() {
  // Base: contracts become "Contracts" category documents.
  const contractDocs: DocItem[] = contracts.map((c) => {
    const client = getClient(c.clientId);
    return {
      id: c.id,
      title: c.template,
      category: "Contracts",
      typeLabel: "Contract",
      status: c.status,
      date: c.createdDate,
      client,
      signerEmail: c.signerEmail,
      bodyKind: "contract",
    };
  });

  // Synthetic Statements / Invoices / Uploaded Files across active clients.
  const activeClients = clients.filter((c) => c.monthsElapsed > 0).slice(0, 8);

  const statementDocs: DocItem[] = activeClients.slice(0, 5).map((client, i) => ({
    id: `stmt-${i + 1}`,
    title: "Account Statement",
    category: "Statements",
    typeLabel: "Monthly Statement",
    status: "Signed",
    date: client.enrolledDate,
    client,
    signerEmail: client.email,
    amount: Math.round(client.totalDebt * 0.45),
    bodyKind: "statement",
  }));

  const invoiceDocs: DocItem[] = activeClients.slice(1, 6).map((client, i) => ({
    id: `inv-${i + 1}`,
    title: "Service Invoice",
    category: "Invoices",
    typeLabel: "Invoice",
    status: i % 3 === 0 ? "Sent" : "Signed",
    date: client.enrolledDate,
    client,
    signerEmail: client.email,
    amount: client.monthlyPayment,
    bodyKind: "invoice",
  }));

  const uploadDocs: DocItem[] = activeClients.slice(2, 6).map((client, i) => ({
    id: `upl-${i + 1}`,
    title: ["Proof of Income.pdf", "Bank Statement.pdf", "ID Verification.pdf", "Hardship Letter.pdf"][i] ?? "Uploaded File.pdf",
    category: "Uploaded Files",
    typeLabel: "Uploaded File",
    status: i % 4 === 1 ? "Viewed" : "Signed",
    date: client.enrolledDate,
    client,
    signerEmail: client.email,
    bodyKind: "upload",
  }));

  const docs: DocItem[] = [
    ...contractDocs,
    ...statementDocs,
    ...invoiceDocs,
    ...uploadDocs,
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = docs.length;
  const signed = docs.filter((d) => d.status === "Signed").length;
  const pending = docs.filter((d) => d.status === "Sent" || d.status === "Viewed").length;
  const drafts = docs.filter((d) => d.status === "Draft").length;

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Contracts, statements, invoices, and client uploads in one place."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Documents" value={formatNumber(total)} icon={FileText} accent="indigo" />
        <StatCard label="Signed" value={formatNumber(signed)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Pending" value={formatNumber(pending)} icon={Clock} accent="amber" hint="Sent or viewed" />
        <StatCard label="Drafts" value={formatNumber(drafts)} icon={FilePen} accent="sky" />
      </div>

      <DocumentsCenter docs={docs} />
    </div>
  );
}
