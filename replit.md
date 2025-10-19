# WealthForce Knowledge Agent - Enterprise AI Assistant

## Overview
A professional, enterprise-grade conversational AI chatbot interface inspired by ChatGPT and Claude. The application provides an intelligent knowledge base for wealth management professionals with full conversational threading, context maintenance, and persistent chat history.

## Current State (October 19, 2025)
✅ **Conversational Threading Architecture Complete** - ChatGPT-style interface with running context
- **NEW: Vector Store Sources Display** - Shows source documents with relevance scores for each answer
- **NEW: Full conversational threading** with context maintained across questions via conversation_id
- **NEW: ChatGPT-style UI** with scrolling messages, fixed bottom input, and thread sidebar
- **NEW: Thread management** - Create, switch, search, and delete conversation threads
- **NEW: Hybrid context system** - API maintains context via conversation_id (primary) or response_id (fallback)
- **NEW: Message-based architecture** - User/assistant message bubbles with role-based styling
- **NEW: Mode selector dropdown** - Choose between concise, balanced, or deep modes in header
- **REST API integration** - Using EKG service endpoint (https://ekg-service-47249889063.europe-west6.run.app/v1/answer)
- **Vector Store Integration** - API returns sources from document retrieval with relevance scoring
- **Professional typography** (Inter for UI, markdown rendering for responses)
- Markdown-formatted responses with proper styling
- **Database persistence** - PostgreSQL with threads and messages tables
- Thread sidebar with search functionality
- Optimistic UI updates for responsive feel
- Light/Dark theme support
- Comprehensive error handling
- Beautiful loading states and animations

## Architecture

### Conversational Threading
The application uses a hybrid approach to maintain conversation context:

1. **API Context Chaining**: The EKG API maintains server-side context using `conversation_id` (primary) or `response_id` (fallback)
   - First question in thread: No context IDs sent
   - Follow-up questions: Send `conversation_id` if available (for long-running context), otherwise send `response_id`
   - API returns `conversation_id` which is stored in thread for subsequent requests
   - `conversation_id` is prioritized over `response_id` for better context maintenance

2. **Database Persistence**: PostgreSQL stores all threads and messages
   - Threads: Conversation sessions with title, conversationId, and timestamps
   - Messages: Individual Q&A pairs with role (user/assistant) and response_id
   - Enables thread switching and conversation history retrieval

3. **Frontend State Management**: React state + TanStack Query
   - Optimistic updates for new messages
   - Database fetching for thread history
   - Automatic cache invalidation on mutations

## Features Implemented

### Core Functionality
1. **Conversational Interface**
   - ChatGPT-style scrolling message view
   - User messages on right (blue bubble)
   - Assistant messages on left (gray bubble) with AI icon
   - Fixed input area at bottom
   - Auto-scroll to latest message
   - Enter to send, Shift+Enter for newlines

2. **Thread Management**
   - Create new threads automatically on first question
   - Thread title auto-generated from first question (truncated to 60 chars)
   - Switch between threads to view conversation history
   - Search threads by title
   - Delete individual threads
   - Thread list shows last activity timestamp

3. **Context Maintenance**
   - Follow-up questions automatically include conversation_id (primary) or response_id (fallback)
   - API maintains conversation context server-side via conversation_id
   - conversation_id is captured from API responses and stored in thread
   - Context persists across thread switches and page refreshes
   - Prioritizes conversation_id over response_id for better long-running context

4. **Message Display**
   - User messages: Plain text in blue bubbles
   - Assistant messages: Markdown-rendered with code blocks
   - **Sources display**: Shows up to 3 source documents with filenames and relevance scores
   - Sources appear below assistant messages in a compact card format
   - Full source count shown (e.g., "Sources (8)")
   - Loading indicator while API processes
   - Error messages displayed inline
   - Empty state for new conversations

5. **User Experience**
   - Theme toggle (light/dark mode) - preserved in localStorage
   - Responsive design
   - Toast notifications for actions
   - Disabled states during processing
   - Empty state with welcoming message

## Project Structure

### Frontend (`client/src/`)
- **pages/chatbot.tsx** - Main conversational interface
  - Thread state management
  - Message display with scrolling
  - Fixed bottom input area
  - Query mutations with threadId support
- **components/thread-sidebar.tsx** - Thread list sidebar
  - New chat button
  - Search functionality
  - Thread selection
  - Delete thread actions
- **components/theme-provider.tsx** - Dark/light mode management
- **App.tsx** - Main app with routing and providers
- **lib/queryClient.ts** - TanStack Query configuration

### Backend (`server/`)
- **routes.ts** - API endpoints
  - POST `/api/query` - Processes questions, handles threading, chains response_id
  - GET `/api/threads` - Retrieves all threads
  - GET `/api/threads/:id` - Get single thread
  - GET `/api/threads/:id/messages` - Get messages for a thread
  - DELETE `/api/threads/:id` - Delete thread and messages
  - Legacy endpoints for backward compatibility
  - Validates input with Zod schemas
  - Comprehensive error handling
- **storage.ts** - Database storage interface
  - DbStorage using Drizzle ORM
  - Thread CRUD operations
  - Message CRUD operations
  - getLastAssistantMessage for response_id retrieval

### Database (`shared/`)
- **schema.ts** - Drizzle ORM schema
  - **threads** table: id, title, conversationId, createdAt, updatedAt
  - **messages** table: id, threadId, role, content, responseId, sources, metadata, createdAt
  - Relationships: thread has many messages
  - Cascading delete: deleting thread deletes all messages
- PostgreSQL database for persistence

### Shared (`shared/`)
- **schema.ts** - TypeScript types and Zod schemas
  - Query schema: question, mode, refresh, threadId (optional)
  - Response schema: data, metadata, citations, responseId, threadId, isConversational
  - Thread schema: full thread type
  - Message schema: full message type with role enum

## API Integration

### EKG REST Service
- Endpoint: `https://ekg-service-47249889063.europe-west6.run.app/v1/answer`
- Method: POST
- Package: Native fetch API
- Response time: Variable (typically < 10 seconds)

### Request Payload
```typescript
{
  question: string,
  domain: "wealth_management",
  params: {
    _mode: "balanced" | "concise" | "deep"  // Controls KG depth + vector store + LLM integration
  },
  response_id?: string,      // Optional, for follow-up questions (conversational context)
  conversation_id?: string   // Optional, alternative conversation tracking
}
```

**Mode Settings:**
- **concise**: 1 hop KG, 6 chunks, 1500 tokens, gpt-5-mini (fastest)
- **balanced**: 1 hop KG, 10 chunks, 6000 tokens, gpt-5 (default)
- **deep**: 2 hops KG, 22 chunks, 20000 tokens, gpt-5 (most comprehensive)

### Response Format
```typescript
{
  markdown: string,         // Markdown-formatted response (or 'answer' field for compatibility)
  response_id: string,      // Unique ID for this response (for context chaining)
  sources: Array<{          // Citation sources from vector store
    filename: string,       // Source document filename
    file_id: string,        // OpenAI file ID
    score: number,          // Vector similarity score (0-1)
    text: string,           // Relevant excerpt from document
    relevance_score: number // Relevance score (0-1)
  }>,
  meta: {
    model: string,          // GPT model used (gpt-5-nano, gpt-5-mini, gpt-5)
    mode: string,           // Answer mode (concise, balanced, deep)
    is_conversational: boolean,  // True if response_id/conversation_id was provided
    previous_response_id?: string,  // Previous response ID (if provided)
    conversation_id?: string,       // Conversation ID (if provided)
    domain: string,         // Domain queried (wealth_management, apf)
    vectorstore_id: string, // OpenAI vector store ID
    processing_time_seconds: number,
    request_id: string
  },
  timestamp: string
}
```

### Conversational Flow
1. **New Thread**:
   - User asks question (no threadId)
   - Backend creates new thread with title from question
   - API request sent without context IDs (no response_id or conversation_id)
   - User message saved
   - Assistant message saved with response_id from API
   - conversation_id captured from API response and stored in thread
   - Frontend displays both messages

2. **Follow-up Question**:
   - User asks question (with threadId)
   - Backend gets thread's conversation_id (if stored) and last assistant message's response_id
   - API request sent WITH conversation_id (primary) or response_id (fallback)
   - User message saved
   - Assistant message saved with new response_id
   - conversation_id captured from API response if not already stored
   - Thread timestamp updated
   - Frontend displays updated conversation

3. **Thread Switch**:
   - User selects different thread
   - Frontend fetches all messages for thread
   - Messages displayed in chronological order
   - New questions continue that thread's context

## Design System

### Color Palette
Following ChatGPT/Claude-inspired design:
- **Primary**: Vibrant blue (220 90% 56%) for user messages and actions
- **Muted**: Gray tones for assistant messages
- **Background**: Deep charcoal (15 8% 8%) in dark mode
- **Surface**: Elevated cards (15 8% 12%)

### Typography
- **Primary Font**: Inter (400, 500, 600)
- **Message Font**: System fonts for readability
- **Code Font**: Monospace for code blocks
- Title: 2xl font-semibold
- Messages: Base (16px)

### Layout
- **Two-column layout**: Sidebar (256px) + Main content (flex-1)
- **Fixed header**: Logo and title at top
- **Scrolling content**: Messages area with auto-scroll
- **Fixed footer**: Input area always visible

## Technical Stack

### Dependencies
- **react-markdown** - Markdown rendering in assistant messages
- **@tanstack/react-query** - Data fetching/mutations with cache management
- **wouter** - Routing
- **zod** - Schema validation
- **lucide-react** - Icons (Sparkles for AI, User for user, etc.)
- **shadcn/ui** - UI components (Button, ScrollArea, Textarea, etc.)
- **drizzle-orm** - Database ORM
- **@neondatabase/serverless** - PostgreSQL client
- **date-fns** - Date formatting (formatDistanceToNow)

### Key Patterns
- Schema-first development with TypeScript
- TanStack Query for async state management
- Optimistic UI updates with database as source of truth
- Hybrid context management (API + Database)
- Component composition (ThreadSidebar + ChatbotPage)
- Controlled forms with keyboard shortcuts

## Testing Recommendations
End-to-end testing should cover:
- Thread creation on first question
- Follow-up questions maintaining context via response_id
- Thread switching loading correct message history
- Search filtering threads correctly
- Thread deletion removing all messages
- Page refresh preserving thread state
- Optimistic updates showing messages immediately
- Error handling for API failures
- Empty states and loading indicators

## Known Behaviors
- **API Context**: EKG API maintains conversation context via response_id parameter
- **Thread Titles**: Auto-generated from first question (max 60 characters)
- **Message Storage**: Both user and assistant messages stored in database
- **Response_id Chaining**: Each follow-up question sends previous assistant's response_id
- **Theme preference**: Persists in localStorage
- **Empty question input**: Disables submit button
- **Keyboard shortcuts**: Enter to submit, Shift+Enter for newlines
- **Auto-scroll**: Automatically scrolls to newest message
- **Thread sidebar**: Shows threads ordered by last update (most recent first)

## Development Commands
- `npm run dev` - Start development server (port 5000)
- `npm run db:push` - Push database schema changes
- Workflow: "Start application" - Auto-restart on changes

## Database Migration Notes
- Schema uses serial IDs for auto-increment
- Threads and messages have foreign key relationship
- Cascading delete: deleting thread removes all messages
- responseId stored as nullable text for API context chaining
- sources and metadata stored as JSON text for flexibility

## Architecture Decisions
1. **Hybrid Context**: API manages active conversation context (response_id), database stores history
2. **Message-based**: Separate user/assistant messages instead of Q&A pairs
3. **Optimistic Updates**: UI updates immediately, database syncs in background
4. **Thread Auto-creation**: No explicit "new thread" step, created on first question
5. **Search in Sidebar**: Thread search rather than message search for better UX
6. **Fixed Layout**: Input always visible at bottom (ChatGPT pattern)

## Notes
- PostgreSQL database used for all persistence
- No authentication required for current EKG API endpoint
- response_id is the key to maintaining conversational context
- Thread switching is instant (local state management)
- Message fetching uses proper query keys for cache invalidation
