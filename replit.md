# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot, inspired by ChatGPT and Claude, designed to provide an intelligent knowledge base for wealth management professionals. Its primary purpose is to offer a sophisticated interface with full conversational threading, context maintenance, and persistent chat history, enhancing knowledge retrieval and interaction for financial experts. The project aims to deliver a professional, intuitive, and highly functional AI assistant, ultimately boosting efficiency and knowledge accessibility for wealth management professionals.

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
-   **Multi-Section Navigation**: Main navigation sidebar with "Explore" (conversational AI), "Workshop" (tools), "Quiz" (knowledge testing), and "Atlas" (knowledge map) sections.
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