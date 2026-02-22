import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CalendarClock,
  Landmark,
  ReceiptIndianRupee,
  ShieldCheck,
  FileCheck2,
} from "lucide-react";

export interface ConversationStarterCategory {
  category: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  prompts: string[];
}

export const landingPagePromptSuggestions: string[] = [
  "What documents are required to apply for a No Dues Certificate?",
  "How should installment dues and posted payments be shown on payment status?",
  "When is Delayed Completion Fee charged, and how is it calculated?",
  "What are the steps after allotment until possession and registry?",
];

export const conversationStarterCategories: ConversationStarterCategory[] = [
  {
    category: "Property Allotment",
    icon: Building2,
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-500",
    prompts: [
      "What is the end-to-end allotment workflow for a PUDA property?",
      "What applicant details are mandatory before allotment is confirmed?",
      "Which milestones are tracked from allotment to possession?",
    ],
  },
  {
    category: "Installments & Dues",
    icon: CalendarClock,
    color: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40",
    iconColor: "text-cyan-500",
    prompts: [
      "How are six-month installments generated from the allotment date?",
      "How is delay interest computed when an installment is paid late?",
      "What dues are included besides installments (DCF, additional area, others)?",
    ],
  },
  {
    category: "Payments",
    icon: ReceiptIndianRupee,
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
    iconColor: "text-emerald-500",
    prompts: [
      "How are actual payments posted against each scheduled due?",
      "How do partial payments get adjusted across principal and interest?",
      "What should the payment status page show for paid vs pending dues?",
    ],
  },
  {
    category: "NDC",
    icon: FileCheck2,
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-500",
    prompts: [
      "When can a No Dues Certificate be downloaded directly?",
      "How should the system guide applicants with pending dues to payment?",
      "What fields should be included in a digitally signed NDC with QR code?",
    ],
  },
  {
    category: "Policy & Compliance",
    icon: ShieldCheck,
    color: "from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40",
    iconColor: "text-rose-500",
    prompts: [
      "What happens if construction is not completed within 3 years?",
      "How is Delayed Completion Fee tied to property value?",
      "What compliance checks are needed before issuing NDC?",
    ],
  },
  {
    category: "Records & Documents",
    icon: Landmark,
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40",
    iconColor: "text-indigo-500",
    prompts: [
      "Which applicant and property records are required in the knowledge repository?",
      "How should allotment letters, payment ledgers, and NDC copies be linked?",
      "What audit trail should be maintained for dues and payment postings?",
    ],
  },
];
