import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  RegisterTemplateForm,
  TemplateRowActions,
} from "@/components/contracts/template-admin";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function canManage(role?: string | null): boolean {
  return role === "ADMIN" || role === "FUNDER_OPS";
}

export default async function ContractTemplatesPage() {
  const user = await getCurrentUser();
  const manage = canManage(user?.role);

  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      digisignerTemplateId: true,
      docType: true,
      isActive: true,
    },
  });

  return (
    <div>
      <Link
        href="/contracts"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contracts
      </Link>

      <PageHeader
        title="Contract Templates"
        description="DigiSigner templates + CRM field mappings for MCA agreements"
      >
        <Badge tone="slate">{templates.length} templates</Badge>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {templates.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                No templates registered yet.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>DigiSigner ID</TH>
                    <TH>Doc Type</TH>
                    <TH>Active</TH>
                    {manage && <TH className="text-right">Actions</TH>}
                  </TR>
                </THead>
                <TBody>
                  {templates.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium">{t.name}</TD>
                      <TD className="font-mono text-2xs text-muted-foreground">
                        {t.digisignerTemplateId ?? "—"}
                      </TD>
                      <TD className="text-muted-foreground">{t.docType}</TD>
                      <TD>
                        <Badge tone={t.isActive ? "emerald" : "slate"}>
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TD>
                      {manage && (
                        <TD>
                          <TemplateRowActions id={t.id} isActive={t.isActive} canManage={manage} />
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Register Template</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <RegisterTemplateForm canManage={manage} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
