# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot, inspired by ChatGPT and Claude, designed to provide an intelligent knowledge base for wealth management professionals. Its primary purpose is to offer a sophisticated interface with full conversational threading, context maintenance, and persistent chat history, enhancing knowledge retrieval and interaction for financial experts. The project aims to deliver a professional, intuitive, and highly functional AI assistant, ultimately boosting efficiency and knowledge accessibility for wealth management professionals.

## Recent Changes

### October 22, 2025
- **Flash Quiz Feature**: Implemented inline quiz generation from conversation context:
  - "Quiz Me" button (⚡ icon) appears in input area after 1 Q&A exchange (2+ messages)
  - Uses the same EKG REST Service to generate 3-5 multiple-choice questions based on conversation history
  - No additional API keys required - fully integrated with existing knowledge service
  - Questions appear inline in chat thread as QuizMessage component
  - Interactive UI with instant feedback (✅ Correct / ❌ Incorrect) and explanations
  - Score display when all questions are answered
  - Defensive JSON parsing handles markdown-wrapped responses from EKG service
  - Shared types in `client/src/types/quiz.ts` for type safety
  - Backend endpoint `/api/generate-quiz` with error handling and validation
  - Removed "Press Enter to send" helper text for cleaner input area alignment
  - All three input elements (textarea, Quiz Me button, Send button) now align perfectly on same line
- **Quiz Tab Dual-Mode Implementation**: Redesigned Quiz page with two learning modes for knowledge retention and self-assessment:
  - **Structured Quiz Section**: 500+ questions across 5 comprehensive categories
    - Wealth Management Fundamentals (85 questions, Beginner, 25 min)
    - Investment Products & Strategies (120 questions, Intermediate, 35 min)
    - Client Relationship Management (95 questions, Intermediate, 30 min)
    - Regulatory & Compliance (110 questions, Advanced, 40 min)
    - Global Markets & Economics (90 questions, Advanced, 30 min)
  - **Flashcards Section**: 4 self-paced study decks for active recall
    - Quick Concepts Review (50 cards, All Topics)
    - Investment Terminology (75 cards, Investments)
    - Regulatory Definitions (60 cards, Compliance)
    - Financial Ratios & Metrics (40 cards, Analysis)
  - Tab-based navigation with icons (Layers for Structured Quiz, GraduationCap for Flashcards)
  - Each category/deck displays topic tags, difficulty, question/card counts, and estimated time
  - Compact layout matching Workshop page design (py-2.5 header, p-4 container, gap-3 spacing)
  - Info boxes explaining how each mode works
  - All interactive elements include proper test IDs for automation
- **Workshop Page Compact Layout**: Redesigned the Workshop page grid to display all 6 templates at one glance without scrolling:
  - Reduced header padding from py-4 to py-2.5
  - Reduced header title from text-2xl to text-xl
  - Reduced header subtitle from text-sm to text-xs
  - Reduced main container padding from p-6 to p-4
  - Reduced grid gap from gap-6 to gap-4
  - Reduced card padding and spacing (p-4, space-y-2.5)
  - Reduced icon boxes from w-12 h-12 to w-10 h-10
  - Reduced card titles from text-lg to text-base
  - Kept descriptions readable at text-sm with leading-snug
  - All 6 template tiles now fit in viewport without scrolling while maintaining readability

### October 21, 2025
- **Workshop Page Templates**: Implemented 6 pre-developed template tiles for wealth management professionals:
  - **New Report**: Generate comprehensive financial or market analysis reports
  - **Client Proposal**: Craft compelling proposals for new clients or projects
  - **Strategic Memo**: Compose internal memos for strategic initiatives or announcements
  - **Presentation Deck**: Create visually engaging presentations for meetings or conferences
  - **RFP Response**: Develop detailed responses to Request for Proposals efficiently
  - **Case Study**: Document successful projects and client outcomes
  - Each template tile features an appropriate icon, title, and description in a responsive 3-column grid layout
  - Cards include hover effects (shadow and border highlight) for interactivity
  - Updated page subtitle to "Pre-developed templates for wealth management professionals"
- **AI Configuration Sidebar Optimization**: Redesigned the right sidebar to display all configuration options on a single page without scrolling:
  - Reduced header title from "AI Model Configuration" to "AI Configuration" with smaller text (text-xs)
  - Compacted all typography from text-sm to text-xs throughout the sidebar
  - Reduced spacing between sections from space-y-6 to space-y-3
  - Reduced spacing within form elements from space-y-2/3 to space-y-1.5
  - Removed verbose helper text under each control for cleaner presentation
  - Reduced System Prompt textarea height from 120px to 70px
  - Made all input fields more compact (h-8 height for inputs and selects)
  - Reduced header and content padding for better space efficiency
  - All five configuration options (LLM Model, Temperature, Hops, Token Limit, System Prompt) now fit in the viewport without scrolling

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Ask before making major changes to the architecture or core functionalities. Do not make changes to the `shared/` folder without explicit instruction.

## System Architecture
The application employs a professional, enterprise-grade architecture focused on conversational AI, inspired by ChatGPT's UI/UX.

### UI/UX Decisions
The UI features a comprehensive layout with a **Global Top Header**, a **Main Navigation Sidebar** (80px width) for section switching (Explore, Workshop, Quiz, Atlas), a **Thread Sidebar** (256px) for conversation history, a flexible **Main Content Area**, and a collapsible **AI Configuration Sidebar** (320px, collapsing to 48px) for model settings. The layout includes fixed headers and footers for consistent navigation and input.

-   **Color Palette**: Uses a vibrant blue for primary actions, gray tones for assistant messages, and a deep charcoal background with elevated surfaces for dark mode.
-   **Typography**: Employs Inter for UI text and system fonts for messages, with a monospace font for code blocks.
-   **Message Display**: User messages are blue bubbles on the right; assistant messages are gray bubbles on the left, with comprehensive markdown support, HTML rendering (citations, links), and code blocks with syntax highlighting. Source documents are displayed below assistant messages.
-   **Theme**: Supports light/dark mode with preferences persisting in local storage via Context API.

### Technical Implementations
-   **Conversational Threading**: A hybrid approach uses API-driven context chaining (`conversation_id` or `response_id`) for real-time context and PostgreSQL for persistent storage.
-   **Sliding Window Context**: Implements a **3-message sliding window** that retrieves the last 3 Q&A pairs from the database and sends them as `chat_history` to the EKG API.
-   **Context Cleaning Pipeline**: Uses `cleanAnswer()` to strip markdown, HTML, citations, and other noise from chat history for cleaner LLM input.
-   **Meta-Instruction Enhancement**: Follow-up questions automatically include meta-instructions asking the LLM to evaluate and clarify ambiguous pronoun references ("this", "it", "that") for improved contextual understanding.
-   **Focus Directives System**: Every question includes explicit instructions for the LLM to answer only the specific question, include only immediately relevant information, and exclude tangential details.
-   **Context Payload Structure**: API requests include `conversation_id`, `response_id`, `chat_history` (last 3 cleaned Q&A pairs), and meta-instruction-enhanced questions with focus directives.
-   **Frontend State Management**: Utilizes React with TanStack Query for data fetching, caching, and optimistic UI updates.
-   **Thread Management**: Supports automatic thread creation, title generation, switching, searching, and deletion, filtering to the last 30 days for performance.
-   **Database**: PostgreSQL is used for all persistence, with Drizzle ORM.

### Feature Specifications
-   **Global Header**: Persistent top bar with "Questions Asked" and "Quizzes Completed" counters, global search, and user menu.
-   **Multi-Section Navigation**: Main navigation sidebar with "Explore" (conversational AI), "Workshop" (pre-developed templates), "Quiz" (knowledge testing and self-assessment), and "Atlas" (knowledge map) sections.
-   **Workshop Templates**: 6 pre-developed template tiles for document creation including New Report, Client Proposal, Strategic Memo, Presentation Deck, RFP Response, and Case Study.
-   **Quiz & Assessment Dual-Mode System**: Tab-based interface with two learning modes:
    -   **Structured Quiz**: 500+ questions across 5 categories (Wealth Management Fundamentals, Investment Products & Strategies, Client Relationship Management, Regulatory & Compliance, Global Markets & Economics) with difficulty levels, topic tags, and estimated completion times.
    -   **Flashcards**: 4 self-paced study decks (Quick Concepts Review, Investment Terminology, Regulatory Definitions, Financial Ratios & Metrics) for active recall and knowledge retention tracking.
-   **AI Model Configuration**: Collapsible right sidebar with controls for LLM model selection, temperature, knowledge graph hops, token limits, and custom system prompts.
-   **Core Conversational Interface**: ChatGPT-style scrolling message view with fixed input, auto-scroll, and keyboard shortcuts.
-   **Markdown Rendering**: Robust markdown rendering for assistant messages, supporting GitHub-flavored markdown, HTML rendering, and HTML entity decoding.
-   **Professional Formatting**: Removes technical headers and reformats API output (e.g., converting "Point 1:" to bullet points).
-   **Sources Display**: Shows up to 3 source documents with filenames and relevance scores.
-   **Download & Export**: Individual answers can be exported as Markdown (.md) or PDF (.pdf) with automatic pagination.
-   **Regenerate Functionality**: A "Regenerate" button for assistant messages to resubmit questions while maintaining conversation context.
-   **User Experience**: Includes theme toggle, responsive design, toast notifications, disabled states during processing, and welcoming empty states.

### System Design Choices
-   **Schema-first development**: Uses TypeScript and Zod for strict schema validation.
-   **Optimistic UI updates**: Enhances responsiveness.
-   **Component composition**: Structures the UI with reusable components.
-   **Fixed Layout**: Ensures the input area is always visible.

## External Dependencies

-   **EKG REST Service**:
    -   Endpoint: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer`
    -   Purpose: Provides AI-powered answers, context management, and source document retrieval.
    -   Integration: Native `fetch` API.

-   **PostgreSQL**:
    -   Purpose: Primary database for persisting conversation threads and messages.
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