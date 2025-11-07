import type { LucideIcon } from "lucide-react";
import {
  ShoppingCart,
  Users,
  Package,
  ArrowRightLeft,
  Shield,
  FileBarChart,
} from "lucide-react";

export interface ConversationStarterCategory {
  category: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  prompts: string[];
}

export const conversationStarterCategories: ConversationStarterCategory[] = [
  {
    category: "Order Journey",
    icon: ShoppingCart,
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-500",
    prompts: [
      "How does the order placement workflow work?",
      "What's the difference between buy and sell orders?",
      "Explain the order settlement process",
    ],
  },
  {
    category: "Customer Management",
    icon: Users,
    color: "from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40",
    iconColor: "text-purple-500",
    prompts: [
      "Explain the KYC verification process",
      "How are customer accounts categorized?",
      "What is customer onboarding workflow?",
    ],
  },
  {
    category: "Products & Securities",
    icon: Package,
    color: "from-green-500/10 to-green-500/5 border-green-500/20 hover:border-green-500/40",
    iconColor: "text-green-500",
    prompts: [
      "What types of mutual funds are available?",
      "How does portfolio rebalancing work?",
      "Explain different security types",
    ],
  },
  {
    category: "Transactions",
    icon: ArrowRightLeft,
    color: "from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    iconColor: "text-amber-500",
    prompts: [
      "What's the difference between SIP and SWP?",
      "How do redemption transactions work?",
      "Explain systematic transfer plans",
    ],
  },
  {
    category: "Compliance",
    icon: Shield,
    color: "from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/40",
    iconColor: "text-red-500",
    prompts: [
      "What are SEBI regulations for wealth management?",
      "Explain AML compliance requirements",
      "What are KYC documentation standards?",
    ],
  },
  {
    category: "Reports",
    icon: FileBarChart,
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40",
    iconColor: "text-indigo-500",
    prompts: [
      "What reports are generated for clients?",
      "How to interpret portfolio statements?",
      "Explain transaction confirmation documents",
    ],
  },
];
