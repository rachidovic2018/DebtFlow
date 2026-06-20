import type { BadgeTone } from "@/components/ui/badge";

// Maps a domain status string to a Badge tone + display label.
export function caseStageTone(stage: string): BadgeTone {
  switch (stage) {
    case "Lead":
    case "Qualified":
      return "slate";
    case "Offer Presented":
    case "Contract Sent":
      return "sky";
    case "Contract Signed":
    case "Active Program":
      return "indigo";
    case "Settlement":
      return "amber";
    case "Completed":
      return "emerald";
    default:
      return "slate";
  }
}

export function paymentTone(status: string): BadgeTone {
  switch (status) {
    case "Succeeded":
      return "emerald";
    case "Scheduled":
      return "slate";
    case "Processing":
      return "sky";
    case "Failed":
      return "rose";
    case "Refunded":
      return "violet";
    default:
      return "slate";
  }
}

export function docTone(status: string): BadgeTone {
  switch (status) {
    case "Draft":
      return "slate";
    case "Sent":
      return "sky";
    case "Viewed":
      return "amber";
    case "Signed":
      return "emerald";
    case "Rejected":
      return "rose";
    default:
      return "slate";
  }
}

export function riskTone(risk: string): BadgeTone {
  switch (risk) {
    case "Low":
      return "emerald";
    case "Medium":
      return "amber";
    case "High":
      return "rose";
    default:
      return "slate";
  }
}

export function debtTone(status: string): BadgeTone {
  switch (status) {
    case "Settled":
      return "emerald";
    case "In Negotiation":
      return "amber";
    case "Active":
      return "slate";
    case "Closed":
      return "violet";
    default:
      return "slate";
  }
}
