# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
The WealthForce Knowledge Agent is an enterprise-grade conversational AI chatbot, inspired by ChatGPT and Claude, designed to provide an intelligent knowledge base for wealth management professionals. Its primary purpose is to offer a sophisticated interface with full conversational threading, context maintenance, and persistent chat history, enhancing knowledge retrieval and interaction for financial experts. The project aims to deliver a professional, intuitive, and highly functional AI assistant.

## Recent Changes

### October 19, 2025
- **Professional Response Formatting**: Removed technical headers ("KG + VectorStore Answer"), context IDs, and "Question:" labels for cleaner display. Converted API formatting (Point 1:, Finding 1/) to standard bullet points.
- **Download & Export Features**: Added dropdown menu with Markdown (.md) and PDF (.pdf) export options for individual messages. PDF generation includes automatic pagination for long content.
- **Regenerate Functionality**: Implemented regenerate button for assistant messages to resubmit questions while maintaining conversation context. Uses mutation variables to prevent stale state issues.
- **Layout Improvements**: Moved "Generated:" timestamp to bottom of responses, removed zero-gap spacing between citation lines, and unified question/answer text styling.
- **Enhanced Conversational Context**: Implemented sliding window context management with **3 Q&A pairs** sent to the EKG API. Reduced from 5 to 3 for more focused context.
- **Clean Context Formatting**: Added `cleanAnswer()` function to strip markdown, HTML tags, citations, bold formatting, and technical noise from chat history before sending to API. This ensures cleaner context for better LLM understanding.
- **Meta-Instruction Prompting**: Follow-up questions automatically include meta-instructions that ask the LLM to evaluate and clarify ambiguous pronoun references ("this", "it", "that") before answering. This hybrid approach combines clean text context with LLM self-evaluation for improved contextual understanding.
- **Focus Directives**: Implemented comprehensive focus directives for both initial and follow-up questions. The LLM is instructed to answer only the specific question asked, include only immediately relevant information, exclude tangential details, and prioritize clarity and relevance. This makes responses sharper and more directly relevant to each question.
- **30-Day Thread Retention**: Limited thread history access to the last 30 days to maintain optimal performance and relevant conversation history.
- **Sidebar Improvements**: Enhanced thread sidebar with always-visible red trash icons for thread deletion, 2-line text wrapping for full thread titles, and collapsible sidebar functionality with collapse/expand buttons.
- **Improved Scroll Position**: Fixed auto-scroll behavior to position cursor at the top of new assistant answers instead of the bottom, providing better reading experience by showing the start of responses immediately.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development with frequent, small updates rather than large, infrequent ones. Ask before making major changes to the architecture or core functionalities. Do not make changes to the `shared/` folder without explicit instruction.

## System Architecture
The application employs a professional, enterprise-grade architecture focused on conversational AI.

### UI/UX Decisions
The UI is inspired by ChatGPT, featuring a two-column layout with a fixed sidebar (256px) and a main content area. It includes a fixed header and footer for consistent navigation and input.
- **Color Palette**: Uses a vibrant blue for primary actions and user messages, gray tones for assistant messages, and a deep charcoal background with elevated surfaces for dark mode.
- **Typography**: Employs Inter for UI text and system fonts for messages, with a monospace font for code blocks.
- **Message Display**: User messages are displayed in blue bubbles on the right, while assistant messages are in gray bubbles on the left, rendered with comprehensive markdown support including HTML, citation superscripts, and code blocks with syntax highlighting. Source documents with relevance scores are displayed below assistant messages.
- **Theme**: Supports light/dark mode, with preferences persisting in local storage.

### Technical Implementations
- **Conversational Threading**: A hybrid approach uses API-driven context chaining (`conversation_id` or `response_id`) for real-time context and PostgreSQL for persistent storage of threads and messages. `conversation_id` is prioritized for long-running context.
- **Sliding Window Context**: Implements a **3-message sliding window** that retrieves the last 3 Q&A pairs from the database and sends them as `chat_history` to the EKG API along with context IDs. This provides focused conversation history while preventing excessive payload sizes.
- **Context Cleaning Pipeline**: Uses `cleanAnswer()` helper function to strip markdown formatting, HTML tags, citations, bold markers, timestamps, and Knowledge Graph tags from answers before sending as chat history. This ensures clean, readable context for the LLM.
- **Meta-Instruction Enhancement**: For follow-up questions, automatically prepends meta-instructions asking the LLM to detect and clarify ambiguous references (pronouns like "this", "it", "that") using conversation history before providing the answer. This enables LLM-driven context enrichment.
- **Focus Directives System**: Every question (both initial and follow-up) includes explicit focus instructions that guide the LLM to answer only the specific question, include only immediately relevant information, exclude tangential details, and prioritize clarity and relevance. For follow-ups, this is combined with context understanding in a two-step process.
- **Context Payload Structure**: API requests include: (1) `conversation_id` for long-running threads, (2) `response_id` for chaining responses, (3) `chat_history` array with last 3 cleaned Q&A pairs, and (4) meta-instruction-enhanced question with focus directives.
- **Frontend State Management**: Utilizes React with TanStack Query for data fetching, caching, optimistic UI updates, and automatic cache invalidation.
- **Message Architecture**: Stores individual user and assistant messages, enabling flexible display and retrieval.
- **Thread Management**: Automatically creates new threads, generates titles, allows switching, searching, and deleting threads, and updates last activity timestamps. Threads are filtered to show only the last 30 days for optimal performance.
- **Error Handling**: Comprehensive error handling is implemented across the application, with inline error messages and toast notifications.
- **Loading States**: Features beautiful loading states and animations for a smooth user experience.

### Feature Specifications
- **Core Conversational Interface**: ChatGPT-style scrolling message view with fixed input, auto-scroll, and keyboard shortcuts (Enter to send, Shift+Enter for newlines).
- **Context Maintenance**: Automatic inclusion of `conversation_id` or `response_id` in follow-up questions to maintain server-side context.
- **Markdown Rendering**: Robust markdown rendering for assistant messages, supporting GitHub-flavored markdown, HTML rendering (citations, links), HTML entity decoding, and removal of Knowledge Graph tags.
- **Professional Formatting**: Removes technical headers ("KG + VectorStore Answer", context IDs, "Question:" labels) and reformats API output (converting "Point 1:", "Finding 1/" to clean bullet points). Question and answer text use consistent styling.
- **Sources Display**: Shows up to 3 source documents with filenames, relevance scores, and full source count below assistant messages.
- **Download & Export**: Individual answers can be exported as Markdown (.md) or PDF (.pdf) files via dropdown menu. PDF export includes automatic pagination for long content.
- **Regenerate Functionality**: Each assistant message has a "Regenerate" button that resubmits the same question to get a fresh response while maintaining conversation context.
- **User Experience**: Includes theme toggle, responsive design, toast notifications, disabled states during processing, and welcoming empty states.

### System Design Choices
- **Schema-first development**: Uses TypeScript and Zod for strict schema validation.
- **Optimistic UI updates**: Enhances responsiveness by updating the UI immediately.
- **Component composition**: Structures the UI with reusable components.
- **Fixed Layout**: Ensures the input area is always visible at the bottom.
- **Database**: PostgreSQL is used for all persistence, with Drizzle ORM managing schema and interactions.

## External Dependencies

- **EKG REST Service**:
    - Endpoint: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer`
    - Purpose: Provides AI-powered answers, context management (`response_id`, `conversation_id`), and source document retrieval.
    - Integration: Native `fetch` API.

- **PostgreSQL**:
    - Purpose: Primary database for persisting conversation threads and messages.
    - Integration: `drizzle-orm` for ORM, `@neondatabase/serverless` for client.

- **NPM Packages**:
    - `react-markdown`, `rehype-raw`, `remark-gfm`: Markdown rendering and extensions.
    - `@tanstack/react-query`: Data fetching and state management.
    - `wouter`: Routing.
    - `zod`: Schema validation.
    - `lucide-react`: Icons.
    - `shadcn/ui`: UI component library.
    - `date-fns`: Date formatting utilities.
    - `jspdf`: PDF generation for export functionality.