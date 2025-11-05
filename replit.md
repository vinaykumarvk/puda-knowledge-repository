# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot designed for wealth management professionals. Its core purpose is to act as an intelligent knowledge base, offering a sophisticated interface with full conversational threading, context maintenance, and persistent chat history. The project aims to enhance knowledge retrieval, boost efficiency, and improve knowledge accessibility for financial experts through a professional, intuitive, and highly functional AI assistant.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Ask before making major changes to the architecture or core functionalities. Do not make changes to the `shared/` folder without explicit instruction.

## System Architecture
The application employs a professional, enterprise-grade architecture focused on conversational AI, inspired by ChatGPT's UI/UX, prioritizing a clean, functional design and robust technical implementation.

### UI/UX Decisions
The UI features a comprehensive layout comprising a Global Top Header, Main Navigation Sidebar, Thread Sidebar, flexible Main Content Area, and a collapsible AI Configuration Sidebar. It utilizes a vibrant blue for primary actions, gray tones for assistant messages, and a deep charcoal background for dark mode. Typography includes Inter for UI text and system fonts for messages. Message display uses blue bubbles for users and gray for the assistant, supporting markdown, HTML, and syntax-highlighted code blocks. The system supports light/dark mode with preferences saved in local storage.

### Technical Implementations
-   **Session-Based Authentication System**: Complete authentication with HTTP-only cookies, bcrypt hashing, `users` and `sessions` database tables, and protected API endpoints. Frontend uses React auth context.
-   **Conversational Threading**: Hybrid approach using API-driven context chaining and PostgreSQL for persistent storage.
-   **Sliding Window Context**: Retrieves the last 3 Q&A pairs for LLM input.
-   **Context Cleaning Pipeline**: Strips noise from chat history.
-   **Meta-Instruction Enhancement & Focus Directives**: Questions include meta-instructions for pronoun resolution and explicit directives for LLM focus.
-   **Frontend State Management**: React with TanStack Query for data fetching and caching.
-   **Thread Management**: Supports automatic creation, title generation, switching, searching, and deletion of conversation threads (last 30 days).
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Approval System (Phase 1 - Database Foundation)**: Enhanced database schema for manager-based approval workflows. Added `managerId` field to users table for manager-employee relationships (BA → M1, Pre-sales → M2). Enhanced approvals table with `rejectionReason` and `editHistory` fields for detailed tracking. Implemented storage methods: `getUserManager`, `getApprovalsByApproverId`, and `updateApprovalStatus`. Updated investmentRequests status workflow states: draft, submitted, under_review, approved, rejected, revision_requested.

### Feature Specifications
-   **Global Header**: Displays "Questions Asked" and "Quizzes Completed" counters, global search, and user menu.
-   **Multi-Section Navigation**: Includes "Conversation", "Launchpad", "Quiz", and "Atlas" sections.
-   **Launchpad Templates**: 6 pre-developed templates including Investment Portal and RFP Generator.
-   **Investment Portal**: Complete unified investment management system accessible from Launchpad. Features dedicated left sidebar navigation with 5 sections: Dashboard (overview & analytics), New Investment (AI-assisted proposal creation), My Investments (request tracking), My Tasks (approvals & actions), Templates (proposal templates). Built as self-contained application with 15 database tables, 45+ storage CRUD methods, 280+ lines of REST API routes. Supports document upload, AI-generated investment memos, approval workflows, and comprehensive tracking.
-   **RFP Response Generator**: Full-stack system with Excel upload for requirements, tab-based viewing, reference panel, export functionality (Markdown, Excel, PDF, Email), PostgreSQL tables, RESTful API, and AI response generation (OpenAI GPT-5 via Replit AI Integrations). Features a Two-Tier RAG Architecture using `pgvector` for historical RFP similarity search and an EKG fallback.
-   **Quiz Question Bank**: 100 Order Management questions across 10 topics in PostgreSQL, with 4 difficulty levels and randomized attempts.
-   **Quiz & Assessment Dual-Mode System**: Offers Structured Quizzes (topic-based, real-time fetching, multiple choice, difficulty indicators, scoring, review, retake) and Flashcards (self-paced study decks).
-   **Quiz Progress Tracking System**: Backend API (`/api/quiz/history`) aggregates quiz attempts. Quiz cards display performance badges, best/average scores, attempt count, and last attempt date. Scores persist in `quiz_attempts` table.
-   **AI Model Configuration**: Collapsible sidebar for LLM model, temperature, knowledge graph hops, token limits, and custom system prompts.
-   **Core Conversational Interface**: ChatGPT-style scrolling view with fixed input.
-   **Markdown Rendering**: Robust rendering for assistant messages (GitHub-flavored, HTML).
-   **Professional Formatting**: Reformats API output for readability.
-   **Sources Display**: Shows up to 3 source documents.
-   **Download & Export**: Individual answers exportable as Markdown or PDF.
-   **Regenerate Functionality**: Resubmits questions while maintaining context.
-   **Wealth Mastery Tracking System**: Tracks user proficiency across five levels based on quiz performance.
-   **Interactive Knowledge Graph Visualization**: Dual-mode visualization (Network View with topic bubbles and Hierarchy View with tree-based categories) for exploring wealth management concepts. Both use React Flow for visualization.

### System Design Choices
-   **Schema-first development**: Uses TypeScript and Zod.
-   **Optimistic UI updates**: Enhances responsiveness.
-   **Component composition**: Structures the UI with reusable components.
-   **Fixed Layout**: Ensures the input area is always visible.

## External Dependencies

-   **EKG REST Service**: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer` (AI-powered answers, context, source documents).
-   **OpenAI GPT-4o-mini**: (Quiz question generation via Replit AI Integrations).
-   **PostgreSQL**: (Primary database for persistence).
-   **NPM Packages**: `react-markdown`, `rehype-raw`, `remark-gfm` (Markdown), `@tanstack/react-query` (Data fetching), `wouter` (Routing), `zod` (Schema validation), `lucide-react` (Icons), `shadcn/ui` (UI components), `date-fns` (Date formatting), `jspdf` (PDF generation), `drizzle-orm`, `@neondatabase/serverless` (PostgreSQL integration).