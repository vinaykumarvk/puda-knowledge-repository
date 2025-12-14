import OpenAI from "openai";

type ReportFormatKey = "BRD" | "Company Research" | "RFP Response";

const REPORT_TEMPLATES: Record<ReportFormatKey, { title: string; totalWords: number; sections: { header: string; description: string; word_count: string }[] }> = {
  BRD: {
    title: "Business Requirements Document (BRD) Template",
    totalWords: 3000,
    sections: [
      { header: "1. Introduction and Objectives", description: "Comprehensively describe the project, its business context, strategic alignment, and the primary business goals it aims to achieve. Include background information, problem statement, and expected outcomes.", word_count: "~500" },
      { header: "2. Scope Definition", description: "Clearly and thoroughly define what is 'in-scope' and 'out-of-scope' for this project to manage expectations. Include scope boundaries, assumptions, constraints, and dependencies. Detail any phased approach if applicable.", word_count: "~400" },
      { header: "3. Business Process Overview", description: "Describe in detail the current 'As-Is' process with workflow diagrams, pain points, and inefficiencies. Then describe the proposed 'To-Be' process with improvements, new capabilities, and benefits. Include process flow descriptions and stakeholder touchpoints.", word_count: "~800" },
      { header: "4. Detailed Business Requirements (Functional & Non-Functional)", description: "Comprehensively list all necessary requirements, categorized by functional areas (e.g., user interface, data management, integration, reporting) and non-functional requirements (e.g., security, performance, scalability, usability, compliance). Each requirement must be measurable, testable, and include priority levels. Include detailed use cases and scenarios.", word_count: "~1000" },
      { header: "5. Stakeholder Analysis and Roles", description: "Identify all key stakeholders, their roles, responsibilities, interests, influence, and involvement in the project. Include stakeholder communication plan and engagement strategy.", word_count: "~200" },
      { header: "6. Success Metrics and Acceptance Criteria", description: "Define comprehensive KPIs, success criteria, and the specific measurable criteria that must be met for the project to be considered successful. Include testing criteria, validation methods, and sign-off requirements.", word_count: "~100" },
    ],
  },
  "Company Research": {
    title: "Company Research Report Template",
    totalWords: 3000,
    sections: [
      { header: "1. Executive Summary", description: "Concise snapshot of the company, market position, thesis, and key risks.", word_count: "~300" },
      { header: "2. Company Overview and History", description: "Founding story, mission, leadership, milestones, and org structure highlights.", word_count: "~400" },
      { header: "3. Financial Performance Analysis", description: "Key indicators (revenue, margins, cash flow, leverage) over 3-5 years with brief trends. Include a simple placeholder for charts.", word_count: "~700" },
      { header: "4. Products/Services Portfolio", description: "Primary offerings, target segments, differentiators, and pipeline highlights.", word_count: "~500" },
      { header: "5. Market and Competitive Landscape", description: "Industry size/growth, competitive position, regulatory notes, and key rivals.", word_count: "~700" },
      { header: "6. SWOT Analysis", description: "Tight strengths, weaknesses, opportunities, threats with implications.", word_count: "~400" },
      { header: "7. Management and Governance", description: "Brief on leadership experience, governance practices, board composition.", word_count: "~350" },
      { header: "8. Risk Analysis", description: "Key business/financial/operational/regulatory risks with mitigations.", word_count: "~350" },
    ],
  },
  "RFP Response": {
    title: "Request for Proposal (RFP) Response Template",
    totalWords: 5000,
    sections: [
      { header: "1. Letter of Transmittal", description: "A professional letter introducing the company, expressing interest, and affirming commitment to the project. Include key contact information and submission details.", word_count: "~300" },
      { header: "2. Executive Summary", description: "Comprehensive summary of the proposed solution, its value proposition, key differentiators, and why the responding company is the best fit. Include ROI projections and strategic alignment.", word_count: "~800" },
      { header: "3. Company Qualifications and Experience", description: "Detailed background of the responding company, relevant case studies with outcomes, team expertise profiles, certifications, awards, and at least three relevant client references with testimonials.", word_count: "~1200" },
      { header: "4. Proposed Solution and Approach", description: "Comprehensive technical and operational plan for delivering the required services/product. Address all mandatory and optional requirements from the original RFP. Include methodology, architecture, implementation approach, and innovation elements.", word_count: "~2000" },
      { header: "5. Project Timeline and Milestones", description: "Detailed structured timeline showing key phases, dependencies, deliverables, milestones, resource allocation, and delivery dates. Include risk mitigation timelines and contingency plans.", word_count: "~500" },
      { header: "6. Pricing and Cost Schedule", description: "Clear, detailed itemized breakdown of all costs associated with the proposal. Include pricing rationale, payment terms, cost breakdown by phase, and total cost of ownership analysis.", word_count: "~400" },
      { header: "7. Legal and Contractual Compliance", description: "Comprehensive confirmation of adherence to all terms and conditions specified in the RFP. Include compliance matrix, certifications, insurance details, and contractual commitments.", word_count: "~300" },
    ],
  },
};

export interface GenerateReportParams {
  baseContent: string;
  question: string;
  sources?: any;
  responseId?: string;
  model?: string;
}

function inferReportFormat(question: string): ReportFormatKey | null {
  const q = question.toLowerCase();
  if (q.includes("brd") || q.includes("business requirements")) return "BRD";
  if (q.includes("rfp") || q.includes("request for proposal") || q.includes("proposal response")) return "RFP Response";
  if (q.includes("company research") || q.includes("company profile") || q.includes("research report")) return "Company Research";
  return null;
}

function buildTemplateDescription(key: ReportFormatKey): string {
  const tpl = REPORT_TEMPLATES[key];
  const sections = tpl.sections
    .map((s) => `- ${s.header}: ${s.description} (target ${s.word_count} words)`)
    .join("\n");
  return `${tpl.title}\n\nTotal Minimum Word Count: ${tpl.totalWords.toLocaleString()} words\n\nSections:\n${sections}`;
}

/**
 * Generates a structured, markdown-ready report leveraging templates and enrichment.
 * Uses OpenAI Responses API with web_search tool for access to recent data.
 * Returns base content if the OpenAI client is not configured or on failure.
 */
export async function generateStructuredReport(params: GenerateReportParams): Promise<{ content: string; formatKey: ReportFormatKey | "Custom" }> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { content: params.baseContent, formatKey: "Custom" };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const inferredFormat = inferReportFormat(params.question);
  const formatKey: ReportFormatKey | "Custom" = inferredFormat || "Custom";

  const templateText = inferredFormat ? buildTemplateDescription(inferredFormat) : "No predefined template fits confidently; craft a clear, professional outline with logical sections and concise headings.";

  // Get total word count requirement
  const totalWords = inferredFormat ? REPORT_TEMPLATES[inferredFormat].totalWords : 0;

  // Build refined high-quality professional report prompt
  const reportPrompt = [
    `# Refined Prompt: High-Quality Professional Report Generator`,
    ``,
    `You are an expert business analyst, industry researcher, and senior technical writer.`,
    `Your task is to generate a **detailed, professional ${formatKey} report** suitable for senior stakeholders at banks, consulting firms, and regulators.`,
    ``,
    `Please focus on producing the **best possible report in this single response**, even if you cannot perfectly satisfy every constraint.`,
    ``,
    `---`,
    ``,
    `## INPUT DATA`,
    ``,
    `**User Request:**`,
    `${params.question}`,
    ``,
    `**Base Draft (to expand & improve):**`,
    `${params.baseContent}`,
    ``,
    `**Available Citations/References (preserve and cite inline as [n] where relevant):**`,
    params.sources ? JSON.stringify(params.sources, null, 2) : 'None provided',
    ``,
    `**Template Structure:**`,
    `${templateText}`,
    ``,
    `**Target Word Count (guideline):**`,
    `Approximately **${totalWords > 0 ? totalWords.toLocaleString() : 'comprehensive'} words total**`,
    `> Aim to reach or exceed this length, but prioritize clarity, coherence, and quality over strict word count.`,
    ``,
    `---`,
    ``,
    `# INSTRUCTIONS`,
    ``,
    `## 1. Research & Evidence Gathering`,
    ``,
    `When generating the report:`,
    ``,
    `- If the **web_search** tool is available, use it **where helpful** to gather **current, credible information**.`,
    `- Prioritize:`,
    `  - Recent industry insights (ideally from the last 24–36 months)`,
    `  - Regulatory or standards-related updates`,
    `  - Market benchmarks, statistics, and trend data`,
    `  - Case studies and real-world implementations`,
    `- If the topic has regional relevance, include India / APAC / global perspectives where meaningful.`,
    `- Avoid obviously outdated or clearly incorrect claims.`,
    ``,
    `Use your internal knowledge as a base and **enhance it with web_search** when it adds value.`,
    `You do **not** need to support every single sentence with external research, but **key claims and numbers should be supported where possible**.`,
    ``,
    `If tools are not available or information is uncertain, proceed with best-effort reasoning and note such uncertainty briefly in a "Limitations" note at the end.`,
    ``,
    `---`,
    ``,
    `## 2. Content Development & Depth`,
    ``,
    `Transform the Base Draft into a **high-depth, professionally structured report**.`,
    ``,
    `For each section in the template:`,
    ``,
    `- Expand meaningfully beyond the base draft.`,
    `- Aim to meet or exceed its implied share of the overall word target.`,
    `- Present:`,
    `  - Clear explanations`,
    `  - Conceptual models or frameworks (where appropriate)`,
    `  - Industry practices, patterns, or standards`,
    ``,
    `Where relevant, include:`,
    ``,
    `- Detailed explanations with domain and technical depth`,
    `- Real-world examples, case scenarios, or use cases`,
    `- Step-by-step or phased implementation guidance`,
    `- Comparison tables, matrices, or decision frameworks`,
    `- Key data points and statistics (with citations where available)`,
    `- Risks, limitations, and mitigation approaches`,
    `- Future roadmap or outlook, if suitable for the topic`,
    ``,
    `Ensure that your content is **original, non-repetitive, and logically coherent**.`,
    ``,
    `---`,
    ``,
    `## 3. Structure & Formatting`,
    ``,
    `Use **clean, professional Markdown**.`,
    ``,
    `Your report should include:`,
    ``,
    `- Correct heading hierarchy (H1 → H2 → H3 → H4 as needed)`,
    `- Well-structured paragraphs with clear topic sentences`,
    `- Bulleted and numbered lists where they aid clarity`,
    `- Comparison **tables** where helpful`,
    `- Callout-style subsections for key insights, principles, or frameworks`,
    `- Code blocks **only if** the topic is technical and benefits from them`,
    ``,
    `Ensure a **logical and progressive flow**, with smooth transitions between sections.`,
    `All sections from the provided template must be present in the final report (even if some are shorter than others).`,
    ``,
    `---`,
    ``,
    `## 4. Writing Quality & Tone`,
    ``,
    `Your writing style should be:`,
    ``,
    `- Professional, authoritative, and suitable for CXO and senior stakeholders`,
    `- Clear, precise, and factual`,
    `- Free from unnecessary marketing language or filler`,
    `- Focused on clarity, decision support, and practical value`,
    ``,
    `Do **not** refer to yourself, the model, or the prompt.`,
    `Write the report as a standalone document.`,
    ``,
    `---`,
    ``,
    `## 5. Accuracy, Validation & Citations`,
    ``,
    `- Strive to ensure factual accuracy, especially for:`,
    `  - Regulations`,
    `  - Standards`,
    `  - Quantitative data`,
    `  - Named frameworks / methodologies`,
    `- When you use information from **web_search**, support important points with inline citations or by referencing them in a **Sources & References** section.`,
    `- When using params.sources, preserve any existing numeric citation markers like [1], [2], etc., and reuse them where they apply.`,
    `- If **file_search** or internal documents are used, you may mention them in the Sources & References section using the document or section name.`,
    ``,
    `Add a final section at the end titled **"Sources & References"** with items in this format where applicable:`,
    ``,
    `Source Title — (URL or Document Name) — One-line description of relevance`,
    ``,
    `If you were unable to find strong external sources or if some parts are based mainly on expert judgment, briefly indicate this in a short **"Limitations"** note at the end.`,
    ``,
    `---`,
    ``,
    `# OUTPUT REQUIREMENTS`,
    ``,
    `Your final output should:`,
    ``,
    `- Include **all sections** from the provided template structure.`,
    `- Aim to reach or exceed **${totalWords > 0 ? totalWords.toLocaleString() : 'comprehensive'} words total**, but **do not sacrifice clarity or quality** just to add length.`,
    `- Provide **substantive, detailed content** in every section, appropriate for senior decision-makers.`,
    `- Incorporate **recent and relevant information** where possible.`,
    `- Be written so it can be used **with minimal further editing**.`,
    ``,
    `If you cannot fully satisfy some requirements (e.g., exact word count or specific data availability), **do not refuse the task**.`,
    `Instead, produce the **best possible report** and clearly state any major limitations in a short "Limitations" section at the end.`,
    ``,
    `---`,
    ``,
    `# FINAL TASK`,
    ``,
    `Generate the complete, high-quality **${formatKey} report now**, following the above guidelines as closely as possible.`,
  ].join("\n");

  try {
    // Use OpenAI Responses API with web_search tool for access to recent data
    const requestPayload: any = {
      model: params.model || process.env.OPENAI_REPORT_MODEL || "gpt-4o",
      tools: [{"type": "web_search"}],
      input: reportPrompt
    };

    // Add previous response ID for conversation continuity if available
    if (params.responseId) {
      requestPayload.previous_response_id = params.responseId;
      console.log(`[Report Generation] Using previous response ID for context: ${params.responseId}`);
    }

    console.log(`[Report Generation] Generating ${formatKey} report with web search enabled...`);
    const startTime = Date.now();
    
    const response = await client.responses.create(requestPayload);
    const processingTime = Date.now() - startTime;

    const content = response.output_text?.trim();
    if (!content) {
      console.warn("[Report Generation] No content received from Responses API, returning base content");
      return { content: params.baseContent, formatKey };
    }

    console.log(`[Report Generation] Report generated successfully in ${processingTime}ms`);
    console.log(`[Report Generation] Response ID: ${response.id}`);
    console.log(`[Report Generation] Usage: ${JSON.stringify(response.usage, null, 2)}`);

    return { content, formatKey };
  } catch (error) {
    console.error("[Report Generation] Responses API failed, returning base content:", error);
    return { content: params.baseContent, formatKey };
  }
}

export { REPORT_TEMPLATES };
