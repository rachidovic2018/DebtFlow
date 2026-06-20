"use client";

import * as React from "react";
import {
  DollarSign,
  Percent,
  Building2,
  Landmark,
  PiggyBank,
  CalendarRange,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Donut, TrendArea } from "@/components/charts/charts";
import { CHART_COLORS } from "@/components/charts/theme";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { COMPANY_FEE_RATE, BANK_FEE_RATE } from "@/lib/mock";

const ACCENT = "#6366F1";

interface SliderFieldProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
  money?: boolean;
}

function SliderField({
  label,
  icon: Icon,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: SliderFieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums">{display}</span>
      </div>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mb-2.5"
      />
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: ACCENT }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted"
      />
    </div>
  );
}

export function Calculator() {
  const [totalDebt, setTotalDebt] = React.useState(32000);
  const [settlementPct, setSettlementPct] = React.useState(45);
  const [companyFeePct, setCompanyFeePct] = React.useState(
    Math.round(COMPANY_FEE_RATE * 100),
  );
  const [bankFeePct, setBankFeePct] = React.useState(
    Math.round(BANK_FEE_RATE * 100),
  );
  const [duration, setDuration] = React.useState(36);
  const [frequency, setFrequency] = React.useState<"Monthly" | "Biweekly">(
    "Monthly",
  );

  const m = React.useMemo(() => {
    const settlementAmount = totalDebt * (settlementPct / 100);
    const companyRevenue = totalDebt * (companyFeePct / 100);
    const bankFees = totalDebt * (bankFeePct / 100);
    const netRevenue = companyRevenue - bankFees;
    const programCost = settlementAmount + companyRevenue + bankFees;
    const estimatedSavings = totalDebt - programCost;
    const months = Math.max(1, duration);
    const monthlyDraft = programCost / months;
    const biweeklyDraft = (monthlyDraft * 12) / 26;
    const activeDraft = frequency === "Monthly" ? monthlyDraft : biweeklyDraft;
    const savingsPct = totalDebt > 0 ? (estimatedSavings / totalDebt) * 100 : 0;

    const breakdown = [
      { name: "Settlement", value: Math.round(settlementAmount) },
      { name: "Company Fee", value: Math.round(companyRevenue) },
      { name: "Bank Fee", value: Math.round(bankFees) },
    ];

    const schedule = Array.from({ length: months }, (_, i) => {
      const monthNum = i + 1;
      const paid = monthlyDraft * monthNum;
      return {
        month: `M${monthNum}`,
        paid: Math.round(Math.min(paid, programCost)),
        remaining: Math.round(Math.max(programCost - paid, 0)),
      };
    });

    return {
      settlementAmount,
      companyRevenue,
      bankFees,
      netRevenue,
      programCost,
      estimatedSavings,
      monthlyDraft,
      biweeklyDraft,
      activeDraft,
      savingsPct,
      breakdown,
      schedule,
    };
  }, [totalDebt, settlementPct, companyFeePct, bankFeePct, duration, frequency]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Inputs */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <div>
            <CardTitle>Program Inputs</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust assumptions to model the resolution
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <SliderField
            label="Total Debt"
            icon={DollarSign}
            value={totalDebt}
            onChange={setTotalDebt}
            min={1000}
            max={150000}
            step={500}
            display={formatCurrency(totalDebt)}
          />
          <SliderField
            label="Settlement %"
            icon={Percent}
            value={settlementPct}
            onChange={setSettlementPct}
            min={20}
            max={80}
            step={1}
            display={formatPercent(settlementPct)}
          />
          <SliderField
            label="Company Fee %"
            icon={Building2}
            value={companyFeePct}
            onChange={setCompanyFeePct}
            min={0}
            max={35}
            step={1}
            display={formatPercent(companyFeePct)}
          />
          <SliderField
            label="Bank Fee %"
            icon={Landmark}
            value={bankFeePct}
            onChange={setBankFeePct}
            min={0}
            max={10}
            step={0.5}
            display={formatPercent(bankFeePct, bankFeePct % 1 === 0 ? 0 : 1)}
          />
          <SliderField
            label="Program Duration"
            icon={CalendarRange}
            value={duration}
            onChange={setDuration}
            min={12}
            max={60}
            step={1}
            display={`${duration} mo`}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Payment Frequency
            </label>
            <Select
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as "Monthly" | "Biweekly")
              }
            >
              <option value="Monthly">Monthly</option>
              <option value="Biweekly">Biweekly</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Outputs */}
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          <StatCard
            label="Settlement Amount"
            value={formatCurrency(m.settlementAmount)}
            icon={DollarSign}
            accent="indigo"
            hint={`${formatPercent(settlementPct)} of debt`}
          />
          <StatCard
            label="Estimated Savings"
            value={formatCurrency(m.estimatedSavings)}
            icon={PiggyBank}
            accent="emerald"
            delta={{
              value: formatPercent(m.savingsPct),
              direction: m.estimatedSavings >= 0 ? "up" : "down",
              good: m.estimatedSavings >= 0,
            }}
            hint="vs total debt"
          />
          <StatCard
            label={`${frequency} Draft`}
            value={formatCurrency(m.activeDraft, true)}
            icon={CalendarRange}
            accent="sky"
            hint={`over ${duration} months`}
          />
          <StatCard
            label="Company Revenue"
            value={formatCurrency(m.companyRevenue)}
            icon={Building2}
            accent="violet"
            hint={`${formatPercent(companyFeePct)} fee`}
          />
          <StatCard
            label="Bank Fees"
            value={formatCurrency(m.bankFees)}
            icon={Landmark}
            accent="amber"
            hint={`${formatPercent(bankFeePct, bankFeePct % 1 === 0 ? 0 : 1)} fee`}
          />
          <StatCard
            label="Net Revenue"
            value={formatCurrency(m.netRevenue)}
            icon={TrendingDown}
            accent="emerald"
            hint="after bank fees"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Program Cost Breakdown</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Where each dollar goes
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Donut
                data={m.breakdown}
                centerLabel="Program cost"
                centerValue={formatCurrency(m.programCost)}
                colors={[
                  CHART_COLORS.indigo,
                  CHART_COLORS.violet,
                  CHART_COLORS.amber,
                ]}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <div>
                <CardTitle>Projected Paydown</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cumulative drafts vs remaining balance
                </p>
              </div>
              <Badge tone="indigo" dot>
                {duration} mo plan
              </Badge>
            </CardHeader>
            <CardContent>
              <TrendArea
                data={m.schedule}
                xKey="month"
                series={[
                  {
                    key: "paid",
                    color: CHART_COLORS.emerald,
                    label: "Cumulative paid",
                  },
                  {
                    key: "remaining",
                    color: CHART_COLORS.indigo,
                    label: "Remaining",
                  },
                ]}
                height={260}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
