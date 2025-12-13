# Report Generation Function and Templates

This document outlines the design and implementation details for a flexible `report_generation` function, its parameters, the underlying logic, and pre-defined templates for common business documents. The intent is to leverage a large language model (LLM) to not only format content but also to enrich and revalidate it against best-practice templates.

# `report_generation` Function Definition

The primary function will handle the API interaction with the LLM to process and format the report content.

## Function Signature

def report\_generation(text: str, report\_format\_key: str, model: str) \-\> str:

    """

    Generates a structured and enriched report using an LLM.

    Args:

        text: The base content/draft to be enriched and formatted.

        report\_format\_key: The key corresponding to the desired template

                           (e.g., 'BRD', 'Company Research', 'RFP Response').

        model: The LLM model to be used for the API call (e.g., 'gpt-4o').

    Returns:

        The finalized, formatted, and enriched report as a string.

    """

    \# Implementation details will go here (API call logic)

    pass

## Function Logic and Intent

The function's core responsibility is to construct a comprehensive prompt for the LLM. This prompt will include:

1. **Instruction for Enrichment:** Instruct the LLM to treat the input `text` as a draft and enrich it with necessary details, industry best practices, and context to fulfill the document's purpose.  
2. **Template Injection:** Provide the detailed structure and requirements derived from the `REPORT_TEMPLATES` dictionary using the `report_format_key`.  
3. **Revalidation Requirement:** Crucially, the prompt will demand that the LLM revalidate its output against the specified template, ensuring all sections are covered, content is detailed, and the final document adheres to the approximate word counts/detail level requested in the template.

# Report Templates

The templates below are designed to be descriptive, providing section headers, a brief explanation of required content, and an approximate word count to guide the LLM's output.

## `REPORT_TEMPLATES` Dictionary

REPORT\_TEMPLATES \= {

    "BRD": {

        "title": "Business Requirements Document (BRD) Template",

        "sections": \[

            {"header": "1. Introduction and Objectives", "description": "Briefly describe the project, its context, and the primary business goals it aims to achieve.", "word\_count": "\~200"},

            {"header": "2. Scope Definition", "description": "Clearly define what is 'in-scope' and 'out-of-scope' for this project to manage expectations.", "word\_count": "\~150"},

            {"header": "3. Business Process Overview", "description": "Describe the current 'As-Is' process and the proposed 'To-Be' process, highlighting the changes and improvements.", "word\_count": "\~350"},

            {"header": "4. Detailed Business Requirements (Functional & Non-Functional)", "description": "List all necessary requirements, categorized (e.g., user interface, data, security, performance). Each requirement must be measurable and testable.", "word\_count": "\~600"},

            {"header": "5. Stakeholder Analysis and Roles", "description": "Identify key stakeholders and their responsibilities/interests regarding the project.", "word\_count": "\~100"},

            {"header": "6. Success Metrics and Acceptance Criteria", "description": "Define Key Performance Indicators (KPIs) and the specific criteria that must be met for the project to be considered successful.", "word\_count": "\~150"}

        \]

    },

    "Company Research": {

        "title": "Company Research Report Template",

        "sections": \[

            {"header": "1. Executive Summary", "description": "A high-level summary of the company's profile, market position, and core findings of this research.", "word\_count": "\~150"},

            {"header": "2. Company Overview and History", "description": "Details on founding, mission, key leadership, and recent milestones.", "word\_count": "\~250"},

            {"header": "3. Financial Performance Analysis", "description": "Review of key financial indicators (e.g., revenue trends, profitability, debt-to-equity ratio) over the last 3-5 years, if publicly available. \[Placeholder for financial charts/data: A bar chart representing key financial metrics\]", "word\_count": "\~400"},

            {"header": "4. Products/Services Portfolio", "description": "Detailed description of the primary offerings, target markets, and competitive advantages.", "word\_count": "\~300"},

            {"header": "5. Market and Competitive Landscape", "description": "Analysis of the industry size, growth trends, and the company's position relative to its main competitors.", "word\_count": "\~450"},

            {"header": "6. Strengths, Weaknesses, Opportunities, and Threats (SWOT) Analysis", "description": "A balanced four-part analysis detailing internal and external factors affecting the company.", "word\_count": "\~300"}

        \]

    },

    "RFP Response": {

        "title": "Request for Proposal (RFP) Response Template",

        "sections": \[

            {"header": "1. Letter of Transmittal", "description": "A formal, brief letter introducing the company and affirming commitment to the project.", "word\_count": "\~100"},

            {"header": "2. Executive Summary", "description": "Summarize the proposed solution, its value proposition, and why the responding company is the best fit.", "word\_count": "\~250"},

            {"header": "3. Company Qualifications and Experience", "description": "Provide a compelling background of the responding company, relevant case studies, and team expertise. Must include at least two relevant client references.", "word\_count": "\~400"},

            {"header": "4. Proposed Solution and Approach", "description": "A detailed technical and operational plan for delivering the required services/product. Address all mandatory requirements from the original RFP.", "word\_count": "\~700"},

            {"header": "5. Project Timeline and Milestones", "description": "A structured timeline showing key phases, dependencies, and delivery dates. \[Placeholder for timeline: A table representing the project schedule\]", "word\_count": "\~200"},

            {"header": "6. Pricing and Cost Schedule", "description": "A clear, itemized breakdown of all costs associated with the proposal.", "word\_count": "\~200"},

            {"header": "7. Legal and Contractual Compliance", "description": "Confirmation of adherence to all terms and conditions specified in the RFP.", "word\_count": "\~100"}

        \]

    }

}

# Best Practices and Enrichment Context

To ensure the function produces high-quality documents, the LLM prompt must incorporate the following context:

1. **Clarity and Conciseness:** The final report must be clear, professional, and free of jargon, accessible to the target audience of the specific document type.  
2. **Data Integrity:** If the input `text` provides data points, the LLM must preserve them while ensuring the surrounding explanatory text is robust.  
3. **Filling Gaps:** The LLM's primary role in enrichment is to fill logical and informational gaps based on the section descriptions. For example, if a BRD draft is missing an **Acceptance Criteria** section, the LLM should generate plausible criteria based on the project's stated objectives.  
4. **Consistency in Placeholders:** The LLM should be instructed to use appropriate placeholders if specific external information (e.g., a person's name, a date, a physical location) is contextually required but not provided in the input `text`.

The prompt for an API call using the 'BRD' template would look similar to:"You are an expert business analyst. Your task is to transform the following draft content into a professional and comprehensive Business Requirements Document (BRD).**Draft Content:** \[Insert `text` parameter here\]

**Required Format:** Adhere strictly to the following structure. For each section, enrich the content, elaborate where necessary, and ensure the final output meets the specified content depth and approximate word count. Revalidate your final response against this template.

**Template:** \[Insert the BRD template details from `REPORT_TEMPLATES` here\]"

A sample use case for the function might involve creating a BRD draft with specific requirements:

| Parameter | Value |
| :---- | :---- |
| `text` | "We need a new mobile app that allows users to track their expenses. It should integrate with our existing accounting system. Must have secure login." |
| `report_format_key` | "BRD" |
| `model` | "gpt-4o" |

