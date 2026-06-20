import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLead } from "../actions";

export const dynamic = "force-dynamic";

const SOURCES = ["Inbound Web", "Broker Referral", "Cold Outreach", "Renewal", "Partner", "Other"];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function NewLeadPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="New Lead" description="Add a merchant to the pipeline">
        <Link href="/leads" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft />
          Back
        </Link>
      </PageHeader>

      <Card>
        <CardContent>
          <form action={createLead} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Business Name">
                <Input name="businessName" required placeholder="Acme Auto Repair LLC" />
              </Field>
            </div>

            <Field label="Contact Name">
              <Input name="contactName" placeholder="Jane Merchant" />
            </Field>

            <Field label="Source">
              <Select name="source" defaultValue="">
                <option value="" disabled>
                  Select a source
                </option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Email">
              <Input name="email" type="email" placeholder="owner@business.com" />
            </Field>

            <Field label="Phone">
              <Input name="phone" type="tel" placeholder="(555) 123-4567" />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Requested Amount" hint="Advance amount sought (USD). Receivables purchase — not a loan.">
                <Input name="requestedAmount" inputMode="decimal" placeholder="50000" />
              </Field>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <Button type="submit">Create Lead</Button>
              <Link href="/leads" className={cn(buttonVariants({ variant: "ghost", size: "md" }))}>
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
