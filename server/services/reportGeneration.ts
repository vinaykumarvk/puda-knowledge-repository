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
    totalWords: 10000,
    sections: [
      { header: "1. Executive Summary", description: "A comprehensive high-level summary of the company's profile, market position, financial highlights, competitive advantages, and core findings of this research. Include key investment thesis points and risk factors.", word_count: "~800" },
      { header: "2. Company Overview and History", description: "Detailed history of the company including founding story, evolution, mission, vision, values, key leadership profiles, organizational structure, recent milestones, major acquisitions or divestitures, and corporate culture.", word_count: "~1200" },
      { header: "3. Financial Performance Analysis", description: "Comprehensive review of key financial indicators (revenue trends, profitability margins, cash flow, debt-to-equity ratio, working capital, ROE, ROA) over the last 3-5 years. Include quarterly trends, year-over-year comparisons, financial ratios analysis, and forward-looking financial projections if available. Analyze balance sheet strength, income statement trends, and cash flow patterns.", word_count: "~2000" },
      { header: "4. Products/Services Portfolio", description: "Detailed description of all primary offerings, product lines, service categories, target markets, customer segments, pricing strategies, competitive advantages, innovation pipeline, R&D investments, and product lifecycle stages. Include market share by product category.", word_count: "~1500" },
      { header: "5. Market and Competitive Landscape", description: "Comprehensive analysis of the industry size, growth trends, market dynamics, regulatory environment, barriers to entry, and the company's position relative to its main competitors. Include competitive positioning matrix, market share analysis, competitive advantages and disadvantages, and industry trends.", word_count: "~2000" },
      { header: "6. Strengths, Weaknesses, Opportunities, and Threats (SWOT) Analysis", description: "A detailed four-part analysis with multiple points in each category, detailing internal and external factors affecting the company. Include strategic implications and recommendations based on SWOT findings.", word_count: "~1000" },
      { header: "7. Management and Governance", description: "Analysis of management team experience, track record, corporate governance practices, board composition, executive compensation, and leadership effectiveness.", word_count: "~800" },
      { header: "8. Risk Analysis", description: "Comprehensive identification and analysis of business risks, financial risks, operational risks, regulatory risks, market risks, and mitigation strategies.", word_count: "~700" },
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
  const sourcesBlock = params.sources ? `\n\n**Available Citations/References (preserve and cite inline as [n]):**\n${JSON.stringify(params.sources, null, 2)}` : "";

  // Get total word count requirement
  const totalWords = inferredFormat ? REPORT_TEMPLATES[inferredFormat].totalWords : 0;

  // Build refined publication-ready report prompt
  const reportPrompt = [
    `# **Refined Prompt: Publication-Ready Report Generator**`,
    ``,
    `You are an **expert business analyst, industry researcher, and senior technical writer**.`,
    `Your task is to generate a **comprehensive, publication-ready ${formatKey} report** that meets the highest professional standards used by top consulting firms, banks, and regulatory bodies.`,
    ``,
    `---`,
    ``,
    `## **INPUT DATA**`,
    ``,
    `**User Request:**`,
    `${params.question}`,
    ``,
    `**Base Draft (to expand & improve):**`,
    `${params.baseContent}`,
    sourcesBlock,
    ``,
    `**Template Structure:**`,
    `${templateText}`,
    ``,
    `**Target Minimum Word Count:** **${totalWords > 0 ? totalWords.toLocaleString() : 'comprehensive'} words**`,
    ``,
    `---`,
    ``,
    `# **INSTRUCTIONS**`,
    ``,
    `## **1. Research & Evidence Gathering**`,
    ``,
    `When generating the report:`,
    ``,
    `* Use **web_search** to gather **current, authoritative, and verifiable** information.`,
    `* Prioritize:`,
    `  * **Recent industry insights** (past 24–36 months)`,
    `  * **Regulatory updates**`,
    `  * **Market benchmarks, statistics, and trend data**`,
    `  * **Case studies and real-world implementations**`,
    `* If the topic has regional relevance, ensure insights include **India / APAC / global** comparisons where appropriate.`,
    `* Avoid outdated, non-verifiable, or generic claims.`,
    ``,
    `**Do not rely solely on LLM knowledge — always support major points with research.**`,
    ``,
    `---`,
    ``,
    `## **2. Content Development & Depth**`,
    ``,
    `Transform the Base Draft into a **high-depth, professionally structured report**.`,
    `Each section MUST:`,
    ``,
    `* Significantly expand beyond the base draft`,
    `* Meet or exceed its allocated word count`,
    `* Present **clear explanations**, **models**, **frameworks**, and **industry best practices**`,
    ``,
    `Include:`,
    ``,
    `* **Detailed explanations** with domain and technical depth`,
    `* **Real-world examples** and **case scenarios**`,
    `* **Step-by-step implementation guidance**`,
    `* **Comparison tables, matrices, or decision frameworks**`,
    `* **Data points and statistics** (with citations)`,
    `* **Risks, mitigations, and future outlook**`,
    ``,
    `Ensure that your content is **original**, non-repetitive, and logically coherent.`,
    ``,
    `---`,
    ``,
    `## **3. Structure & Formatting**`,
    ``,
    `Use **clean, professional Markdown**.`,
    ``,
    `Your report must include:`,
    ``,
    `* Correct **heading hierarchy** (H1 → H2 → H3 → H4)`,
    `* Well-structured paragraphs`,
    `* Bulleted and numbered lists`,
    `* Comparison **tables**`,
    `* **Callout blocks** for key insights or frameworks`,
    `* **Code blocks** only if technical sections require them`,
    ``,
    `Flow must be **logical and progressive**, with smooth transitions between sections.`,
    ``,
    `---`,
    ``,
    `## **4. Writing Quality & Tone**`,
    ``,
    `Your writing style must be:`,
    ``,
    `* Professional, authoritative, and executive-friendly`,
    `* Precise, concise, and factual`,
    `* Free from marketing fluff or filler text`,
    `* Suitable for **CXO, regulator, and enterprise compliance** audiences`,
    ``,
    `Produce content that stands on its own — no disclaimers, no references to prompts.`,
    ``,
    `---`,
    ``,
    `## **5. Accuracy, Validation & Citation**`,
    ``,
    `* All factual statements **must** be accurate and supported by credible sources.`,
    `* Use citations for web_search results in-line where appropriate.`,
    `* Add a **Sources & References** section at the end with a consistent format:`,
    ``,
    `\`\`\``,
    `[Source Title](URL) — One-line description of relevance`,
    `\`\`\``,
    ``,
    `* If file_search is used, cite the extracted document/section name.`,
    ``,
    `---`,
    ``,
    `# **OUTPUT REQUIREMENTS**`,
    ``,
    `Your final output **must**:`,
    ``,
    `### **✓ Include ALL sections from the template, fully developed**`,
    ``,
    `### **✓ Meet or exceed the minimum ${totalWords > 0 ? totalWords.toLocaleString() : 'comprehensive'} word count**`,
    ``,
    `### **✓ Incorporate recent, researched information**`,
    ``,
    `### **✓ Provide deep, substantive content in every section**`,
    ``,
    `### **✓ Be ready for immediate use in enterprise presentations, compliance review, or publication**`,
    ``,
    `---`,
    ``,
    `# **FINAL TASK**`,
    ``,
    `Generate the complete, publication-ready **${formatKey} report now**, following all guidelines above.`,
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
