# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot designed for wealth management professionals. Its core purpose is to act as an intelligent knowledge base, offering a sophisticated interface with full conversational threading, context maintenance, and persistent chat history. The project aims to enhance knowledge retrieval, boost efficiency, and improve knowledge accessibility for financial experts through a professional, intuitive, and highly functional AI assistant.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Ask before making major changes to the architecture or core functionalities. Do not make changes to the `shared/` folder without explicit instruction.

## System Architecture
The application employs a professional, enterprise-grade architecture focused on conversational AI, inspired by ChatGPT's UI/UX, prioritizing a clean, functional design and robust technical implementation.

### UI/UX Decisions
The UI features a comprehensive layout comprising a **Global Top Header**, a **Main Navigation Sidebar** (80px) for section switching (Conversation, Launchpad, Quiz, Atlas), a **Thread Sidebar** (256px) for conversation history, a flexible **Main Content Area**, and a collapsible **AI Configuration Sidebar** (320px) for model settings. The layout ensures consistent navigation and input with fixed headers and footers.

-   **Color Palette**: Utilizes a vibrant blue for primary actions, gray tones for assistant messages, and a deep charcoal background with elevated surfaces for dark mode.
-   **Typography**: Inter for UI text, system fonts for messages, and a monospace font for code blocks.
-   **Message Display**: User messages appear as blue bubbles on the right; assistant messages as gray bubbles on the left, supporting comprehensive markdown, HTML rendering (citations, links), and syntax-highlighted code blocks. Source documents are displayed below assistant messages.
-   **Theme**: Supports light/dark mode with preferences saved in local storage.

### Technical Implementations
-   **Conversational Threading**: A hybrid approach uses API-driven context chaining (`conversation_id` or `response_id`) for real-time context and PostgreSQL for persistent storage.
-   **Sliding Window Context**: Implements a **3-message sliding window** that retrieves the last 3 Q&A pairs from the database for LLM input (`chat_history`).
-   **Context Cleaning Pipeline**: Employs `cleanAnswer()` to strip noise (markdown, HTML, citations) from chat history for cleaner LLM input.
-   **Meta-Instruction Enhancement**: Follow-up questions include meta-instructions for the LLM to evaluate and clarify ambiguous pronoun references.
-   **Focus Directives System**: Questions include explicit instructions for the LLM to answer only the specific question and include only immediately relevant information.
-   **Context Payload Structure**: API requests include `conversation_id`, `response_id`, `chat_history` (last 3 cleaned Q&A pairs), and meta-instruction-enhanced questions with focus directives.
-   **Frontend State Management**: React with TanStack Query for data fetching, caching, and optimistic UI updates.
-   **Thread Management**: Supports automatic creation, title generation, switching, searching, and deletion of conversation threads, filtered to the last 30 days.
-   **Database**: PostgreSQL is used for all persistence, managed with Drizzle ORM.

### Feature Specifications
-   **Global Header**: Displays "Questions Asked" and "Quizzes Completed" counters, global search, and user menu.
-   **Multi-Section Navigation**: Includes "Conversation" (conversational AI), "Launchpad" (pre-developed templates), "Quiz" (knowledge testing), and "Atlas" (knowledge map) sections.
-   **Launchpad Templates**: 6 pre-developed templates: New Report, Client Proposal, Strategic Memo, Presentation Deck, RFP Response, and Case Study, presented in a responsive grid.
-   **RFP Response Generator**: Integrated full-stack RFP system accessible from Launchpad, featuring:
    -   **Upload Requirements**: Excel file upload (.xlsx) for RFP requirements with automatic parsing
    -   **View Responses**: Tab-based interface to browse all RFP responses with status indicators
    -   **Reference Panel**: Displays supporting evidence and source documents with relevance scores
    -   **Export Functionality**: Multiple export formats (Markdown, Excel, PDF, Email) via utility functions
    -   **Database Tables**: Four PostgreSQL tables (rfpResponses, excelRequirementResponses, referenceResponses, historicalRfps) with proper foreign key relations
    -   **RESTful API**: Complete CRUD endpoints at `/api/rfp/responses` and `/api/excel-requirements/:id/references`
    -   **AI Response Generation**: OpenAI GPT-5 integration via Replit AI Integrations for automated response generation
    -   **Two-Tier RAG Architecture (Database Ready)**: Infrastructure for retrieval-augmented generation:
        - **historicalRfps Table**: PostgreSQL table with pgvector extension for storing 10-50 past RFP responses with 1536-dimensional embeddings (OpenAI text-embedding-3-small)
        - **Tier 1 (Historical RFPs)**: Vector similarity search using pgvector cosine distance (threshold: 0.75) to find similar past responses
        - **Tier 2 (EKG Fallback)**: When no historical match found, query existing EKG service for knowledge-grounded responses
        - **Storage Interface**: Complete CRUD methods including `searchHistoricalRfpsBySimilarity()` for vector search
        - **Next Steps**: Populate historical RFPs, implement embedding service, integrate two-tier retrieval into response generation (see RFP_RAG_IMPLEMENTATION_ROADMAP.md)
-   **Quiz Question Bank**: 100 Order Management questions stored in PostgreSQL across 10 topics with 10 questions each. Topics include: Order Flow Fundamentals, Order Capture & Document Validation, Order Modification & Cancellation, Partial Confirmations & Status, Account Management & FIFO, Reconciliation Process, Pre-Trade Validations, Order Execution & Settlement, Transaction Management & Alerts, and Advanced Validations & Partial Confirmations. Questions feature 4 difficulty levels (1-4) and are randomized on each quiz attempt using ORDER BY RANDOM(). Topics display in logical learning progression order.
-   **Quiz & Assessment Dual-Mode System**: Tab-based interface offering:
    -   **Structured Quiz**: Individual topic-based quizzes with real-time question fetching from PostgreSQL. Each quiz displays:
        - Question-by-question navigation with progress tracking
        - Multiple choice answer selection (A/B/C/D)
        - **Clear Difficulty Indicators**: Color-coded difficulty circle (1-4 scale) with text label "Difficulty: [text] (Level [number]/4)" - green (Easy/1), yellow (Medium/2), orange (Hard/3), red (Very Hard/4)
        - Score calculation and results summary
        - Detailed review showing correct/incorrect answers with explanations
        - Retake functionality
    -   **Flashcards**: 4 self-paced study decks (e.g., Quick Concepts Review, Investment Terminology) for active recall.
-   **Quiz Progress Tracking System**: Comprehensive progress persistence and visualization:
    -   **Backend API**: `/api/quiz/history` endpoint aggregates quiz attempts by topic with best score, average score, total attempts, and last attempt date
    -   **Quiz Card Progress Display**: Each quiz card shows:
        - **Performance Badges**: Color-coded badges indicating mastery level - 🏆 Excellent (≥80%), ✓ Passed (≥70%), ⚠️ Review (≥50%), 📚 Practice (<50%)
        - **Best Score**: Highest percentage achieved on that topic
        - **Average Score**: Mean performance across all attempts
        - **Attempt Count**: Total number of quiz attempts for that topic
        - **Last Attempt Date**: When the quiz was last taken
        - **Button Text**: Changes from "Start" (never attempted) to "Retake" (previously attempted)
    -   **Persistent Storage**: Quiz scores save to PostgreSQL `quiz_attempts` table and persist after navigation
    -   **Real-time Updates**: TanStack Query cache invalidation ensures UI updates immediately after quiz completion
-   **Quiz Flow**: Users select a topic → answer questions one-by-one with clear difficulty indicators → receive immediate scoring and detailed feedback → scores persist on quiz selection page → option to retake or return to quiz list with visible progress history.
-   **AI Model Configuration**: Collapsible sidebar with controls for LLM model, temperature, knowledge graph hops, token limits, and custom system prompts.
-   **Core Conversational Interface**: ChatGPT-style scrolling message view with fixed input, auto-scroll, and keyboard shortcuts.
-   **Markdown Rendering**: Robust rendering for assistant messages, supporting GitHub-flavored markdown, HTML, and HTML entity decoding.
-   **Professional Formatting**: Reformats API output for improved readability.
-   **Sources Display**: Shows up to 3 source documents with filenames and relevance scores.
-   **Download & Export**: Individual answers can be exported as Markdown (.md) or PDF (.pdf).
-   **Regenerate Functionality**: A "Regenerate" button for assistant messages to resubmit questions while maintaining context.
-   **Wealth Mastery Tracking System**: Tracks user proficiency across five levels (Novice to Expert) based on quiz performance, topic coverage, and retention, with a compact, color-coded progress indicator in the global header.
-   **Interactive Knowledge Graph Visualization**: Dual-mode visualization providing educational exploration of wealth management concepts:
    
    **Network View** (Simplified Topic Bubbles):
    -   Simplified educational network with ~39 interactive topic bubbles (7 categories + 28 main topics + subtopics)
    -   **141 real connections** derived from knowledge graph relationships between nodes
    -   Force-directed d3-force layout for clean, organic positioning with collision detection
    -   Circular bubbles with varying sizes based on evidence count (60-120px)
    -   Color-coded by category: blue (Order Journey), purple (Customer Management), green (Products), amber (Transactions), cyan (Systems), red (Compliance), indigo (Reports)
    -   Two types of connection lines: gray hierarchy lines (category↔topic) and green relationship lines (topic↔topic)
    -   Search functionality to find specific topics by name
    -   Click bubbles to open detail panel with 4 tabs:
        - **Overview**: Description, key concepts, evidence count, clickable related topic badges for seamless navigation
        - **Subtopics**: Drill-down list showing up to 3 connected subtopics from knowledge graph for deeper exploration
        - **Learn**: Deep dive content with technical details (type, ID, aliases) from original node data
        - **Practice**: Quiz and flashcard buttons for topic mastery
    -   Interactive deep learning: click related topics or subtopics to navigate through connected concepts hierarchically
    -   Smooth hover effects (scale animation) and visual feedback
    -   Stats panel showing category/topic counts, connection count, and visibility status
    -   Minimap, zoom/pan controls, and fullscreen mode
    
    **Hierarchy View** (Tree-Based):
    -   **Level 0 (Root)**: "Order Management & Wealth Operations" serves as the central anchor
    -   **Level 1 (Categories)**: 7 semantic categories (Order Journey, Customer Management, Products & Securities, Transactions, Systems, Compliance, Reports)
    -   **Level 2 (Items)**: Top 5 most relevant items per category (34 total nodes when fully expanded)
    -   Progressive reveal: nodes hidden by default, appear when parent is clicked
    -   Automatic tree layout: uses dagre algorithm for hierarchical positioning
    
    Both views feature React Flow visualization with professional, educational-focused interface for learning wealth management concepts.

### System Design Choices
-   **Schema-first development**: Uses TypeScript and Zod for strict schema validation.
-   **Optimistic UI updates**: Enhances responsiveness.
-   **Component composition**: Structures the UI with reusable components.
-   **Fixed Layout**: Ensures the input area is always visible.

## External Dependencies

-   **EKG REST Service**:
    -   Endpoint: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer`
    -   Purpose: Provides AI-powered answers, context management, and source document retrieval.
-   **OpenAI GPT-4o-mini**:
    -   Purpose: Generates high-quality, context-aware quiz questions, utilizing Replit AI Integrations.
-   **PostgreSQL**:
    -   Purpose: Primary database for persisting conversation threads, messages, quiz attempts, and user mastery data.
    -   Integration: `drizzle-orm`, `@neondatabase/serverless`.
-   **NPM Packages**:
    -   `react-markdown`, `rehype-raw`, `remark-gfm`: Markdown rendering.
    -   `@tanstack/react-query`: Data fetching and state management.
    -   `wouter`: Routing.
    -   `zod`: Schema validation.
    -   `lucide-react`: Icons.
    -   `shadcn/ui`: UI component library.
    -   `date-fns`: Date formatting utilities.
    -   `jspdf`: PDF generation.