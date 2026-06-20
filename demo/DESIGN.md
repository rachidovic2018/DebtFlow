# DebtFlow CRM — Design System (Demo)

> Single source of truth for the demo UI. Synthesized from the product brief
> (no external DESIGN.md was provided). Premium fintech SaaS — Stripe-quality
> polish, Linear-quality interactions.

## Principles

1. **Border-based, not shadow-based.** Structure comes from thin `1px` borders
   (`border-border`), not drop shadows. Shadows are reserved for overlays
   (popovers, modals) and are subtle (`shadow-sm`).
2. **White cards on a soft canvas.** Page background is `bg-canvas` (#FAFAFA-ish);
   cards are pure white with a hairline border and `rounded-xl`.
3. **Data-first, spacious.** Generous padding (`p-5`/`p-6`), clear hierarchy,
   high readability. Numbers are the heroes — use tabular figures.
4. **Restrained color.** Neutral slate UI; color is functional (status, charts),
   never decorative. Accent = indigo. Semantics: emerald (good), amber (watch),
   rose (bad), sky (info).
5. **Inter typography.** Tight tracking on headings, comfortable line-height on
   body. Money/metrics use `tabular-nums`.
6. **Action-oriented.** Every screen answers "what should this employee do next?"
   Alerts, actions, tasks and workflows are surfaced above raw data.

## Tokens (CSS variables, HSL)

| Token | Use |
|-------|-----|
| `--background` / `--foreground` | app bg / primary text |
| `--canvas` | page canvas behind cards |
| `--card` / `--card-foreground` | card bg / text |
| `--muted` / `--muted-foreground` | subtle bg / secondary text |
| `--primary` | ink buttons, emphasis (near-black) |
| `--accent` | indigo highlights, primary chart series |
| `--success` `--warning` `--destructive` `--info` | semantic |
| `--border` / `--input` / `--ring` | hairlines / inputs / focus ring |
| `--radius` | 0.625rem base radius |

## Type Scale

- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-sm font-medium text-muted-foreground uppercase tracking-wide`
- Metric value: `text-2xl font-semibold tabular-nums`
- Body: `text-sm`
- Meta/caption: `text-xs text-muted-foreground`

## Components (in `src/components/ui`)

`cn()` util, `Card`, `Button`, `Badge`, `StatCard`, `Tabs`, `Progress`,
`Table`, `Avatar`, `Separator`, `Input`, `Select`, `Sparkline`. All composable,
Tailwind-driven, shadcn-style API.

## Status → Color Map

| Domain | Value → tone |
|--------|--------------|
| Case stage | Lead/Qualified = slate · Active = indigo · Settlement = amber · Completed = emerald |
| Payment | Succeeded = emerald · Scheduled = slate · Processing = sky · Failed = rose · Refunded = violet |
| Document/Contract | Draft = slate · Sent = sky · Viewed = amber · Signed = emerald · Rejected = rose |
| Risk | Low = emerald · Medium = amber · High = rose |

## Chart Palette (order)

indigo `#6366F1` · emerald `#10B981` · amber `#F59E0B` · sky `#0EA5E9` ·
violet `#8B5CF6` · rose `#F43F5E`. Grid lines hairline `#EEF2F6`, axis text
`#94A3B8`, no heavy borders.
