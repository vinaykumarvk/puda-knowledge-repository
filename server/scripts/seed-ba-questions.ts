import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "../db";

const BA_QUESTIONS = [
  { category: "Platform Vision & Value", question: "Which business outcomes drive investment in this wealth platform?" },
  { category: "Platform Vision & Value", question: "How does the platform improve RM productivity and operating risk?" },
  { category: "Functional Modules", question: "How are RM dashboards, tools, and 360° portfolio views organized?" },
  { category: "Functional Modules", question: "How do model portfolios connect investments, execution, and reporting modules?" },
  { category: "User Journeys", question: "How does the journey differ for RM portal versus client portal orders?" },
  { category: "User Journeys", question: "What are the stages from order placement through settlement status updates?" },
  { category: "Client Onboarding & KYC", question: "How do KYC and account masters gate downstream investment actions?" },
  { category: "Client Onboarding & KYC", question: "How are joint accounts represented across base, account, and portfolio structures?" },
  { category: "Suitability & Recommendations", question: "How is model recommendation tuned by risk, goals, and AUM?" },
  { category: "Suitability & Recommendations", question: "How do suitability thresholds affect model visibility and ranking outcomes?" },
  { category: "Portfolio Construction", question: "How is a model decomposed into weighted underlying security orders?" },
  { category: "Portfolio Construction", question: "How are minimum investments and multiples enforced after allocation?" },
  { category: "Rebalancing", question: "What triggers rebalancing, and who can initiate it?" },
  { category: "Rebalancing", question: "How does client opt-in for auto-rebalance change execution controls?" },
  { category: "Orders & Transactions", question: "How does one model order generate many client-level orders?" },
  { category: "Orders & Transactions", question: "How are Lumpsum, SIP, and SWP handled differently in validations?" },
  { category: "Order Lifecycle", question: "How do cut-off rules alter NAV date and client communication?" },
  { category: "Order Lifecycle", question: "How is the model order unique ID created, used, and expired?" },
  { category: "Payments & Settlement", question: "How does payment routing differ between consolidated and security-level debits?" },
  { category: "Payments & Settlement", question: "How do payment retries work across retries, grace windows, and references?" },
  { category: "Data Model & Entities", question: "How do customer, account, portfolio, model, and holdings relate end-to-end?" },
  { category: "Data Model & Entities", question: "How do portfolio architecture types handle goals and folios differently?" },
  { category: "Data Model & Entities", question: "How is a goal-linked portfolio represented when folios are absent?" },
  { category: "Business Rules & Validations", question: "Which fields are mandatory, and how is missing data handled?" },
  { category: "Business Rules & Validations", question: "How does model status and channel eligibility prevent invalid orders?" },
  { category: "Business Rules & Validations", question: "How are lock-in and ELSS restrictions enforced during redemption or switch?" },
  { category: "Workflow & Approvals", question: "How is maker-checker approval configured at order versus SIP setup?" },
  { category: "Workflow & Approvals", question: "How do multi-level approvals affect turnaround time and audit readiness?" },
  { category: "Exception Handling & Overrides", question: "How are soft-stop warnings versus hard-stop blocks configured and justified?" },
  { category: "Exception Handling & Overrides", question: "How are common error cases surfaced to users and operations teams?" },
  { category: "Integrations & APIs", question: "Which services orchestrate model order initiation, consent, and payment updates?" },
  { category: "Integrations & APIs", question: "How does reverse feed from execution processors update settlement statuses?" },
  { category: "Integrations & APIs", question: "How are adapters chosen between API, files, and database connectors?" },
  { category: "External Dependencies", question: "Which upstream dependencies must be ready before placing model orders?" },
  { category: "External Dependencies", question: "How do RTA/BSE STAR integrations shape order routing and confirmations?" },
  { category: "Security & Identity", question: "How do SSO, OAuth tokens, and RBAC combine across channels?" },
  { category: "Security & Identity", question: "How is least-privilege enforced across services, databases, and admin consoles?" },
  { category: "Security & Identity", question: "How does segregation-of-duties prevent toxic permission combinations?" },
  { category: "Audit & Logging", question: "Which events are audited for immutability across orders, payments, and access?" },
  { category: "Audit & Logging", question: "How are PII and credentials masked in logs and reports?" },
  { category: "Compliance & Regulatory", question: "How are SEBI nominee changes reflected in workflows and validations?" },
  { category: "Compliance & Regulatory", question: "How do retention and purging policies align with regulatory timelines?" },
  { category: "Operations & Monitoring", question: "How are runbooks structured for incidents, scaling, access, and backups?" },
  { category: "Operations & Monitoring", question: "How is service dependency mapping used for impact analysis during outages?" },
  { category: "Scalability & Performance", question: "How do microservices scale independently under variable order volumes?" },
  { category: "Scalability & Performance", question: "How do CQRS, sharding, or partitioning decisions affect reporting latency?" },
  { category: "Configurability & Extensibility", question: "Which platform behaviors are configurable without code changes, and why?" },
  { category: "Configurability & Extensibility", question: "How are API versions managed to avoid breaking external integrations?" },
  { category: "Risks & Edge Cases", question: "What happens when unique IDs expire mid-journey or payments fail?" },
  { category: "Risks & Edge Cases", question: "Which assumptions about data granularity and reconciliation create delivery risk?" },
];

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ba_knowledge_questions (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      question TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
}

async function seedQuestions() {
  await db.execute(sql`UPDATE ba_knowledge_questions SET is_active = false`);
  for (const entry of BA_QUESTIONS) {
    await db.execute(sql`
      INSERT INTO ba_knowledge_questions (category, question)
      VALUES (${entry.category}, ${entry.question})
      ON CONFLICT (question) DO UPDATE SET
        category = EXCLUDED.category,
        is_active = true
    `);
  }
}

async function run() {
  await ensureTable();
  await seedQuestions();
  console.log(`Seeded ${BA_QUESTIONS.length} BA knowledge questions.`);
  await pool.end();
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("BA question seeding failed:", error);
    process.exit(1);
  });
}
