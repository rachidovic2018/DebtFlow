"use client";

import { Calculator as CalcIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Calculator } from "@/components/calculator/calculator";

export default function CalculatorPage() {
  return (
    <div>
      <PageHeader
        title="Debt Resolution Calculator"
        description="Model settlement outcomes, drafts, and revenue in real time"
      >
        <Badge tone="indigo">
          <CalcIcon className="size-3.5" />
          Live estimate
        </Badge>
      </PageHeader>
      <Calculator />
    </div>
  );
}
