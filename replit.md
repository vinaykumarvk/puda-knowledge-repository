# Graph Query Assistant - WealthEKG Chatbot

## Overview
A beautiful, production-ready chatbot interface for querying graph databases using AI-powered insights. The application connects to the WealthEKG Gradio service and provides a polished user experience with markdown-formatted responses, multiple query modes, and caching options.

## Current State (October 16, 2025)
✅ **Production-Ready Application** - All enhanced features implemented and tested
- Question input with real-time character count
- Three query modes: Balanced, Deep, Customer-Selected (concise)
- Cache toggle for refresh control
- Markdown-formatted response display
- Copy to clipboard functionality
- **Chat history with PostgreSQL database persistence**
- **Advanced search and filtering in history sidebar**
- **Export conversations as Markdown or PDF**
- **API authentication settings (for future use)**
- Light/Dark theme support
- Comprehensive error handling
- Beautiful loading states and animations

## Features Implemented

### Core Functionality
1. **Query Interface**
   - Large textarea for question input with character counter
   - Mode selector dropdown (Balanced/Deep/Customer-Selected)
   - Cache toggle switch with visual feedback
   - Submit button with loading states
   - Enter to submit, Shift+Enter for newlines

2. **Response Display**
   - Markdown rendering with proper styling
   - Code blocks with JetBrains Mono font
   - Loading skeleton animations
   - Error messages displayed inline with red border
   - Success state with green border
   - Copy response to clipboard

3. **Chat History (NEW)**
   - PostgreSQL database persistence
   - Collapsible sidebar with conversation list
   - Auto-saves every successful query
   - Shows timestamps, mode, and question preview
   - Click to load previous conversations
   - Delete individual conversations
   - Toggle sidebar visibility

4. **Search & Filtering (NEW)**
   - Real-time search by question text
   - Filter by query mode (All/Balanced/Deep/Concise)
   - Combined search and filter logic
   - Shows "X of Y conversations" count
   - Clear filters button
   - Empty state for no matches

5. **Export Functionality (NEW)**
   - Export conversations as Markdown (.md)
   - Export conversations as PDF
   - Includes metadata (timestamp, mode, cache status)
   - Download with timestamped filenames
   - Dropdown menu for format selection

6. **API Authentication (NEW)**
   - Settings dialog for API key configuration
   - Secure storage in localStorage
   - Auth status indicator in header
   - Prepared for future authenticated endpoints
   - Currently using public API (vinaykumarvk/WealthEKG)
   - **Note**: To use auth with Gradio client, add `hf_token` or `headers` parameter when initializing the client in `server/routes.ts`

7. **User Experience**
   - Theme toggle (light/dark mode) - preserved in localStorage
   - Responsive design (desktop two-column, mobile stacked)
   - Toast notifications for actions
   - Disabled states during processing
   - Empty state messages

## Project Structure

### Frontend (`client/src/`)
- **pages/chatbot.tsx** - Main chatbot interface with query UI, export, settings
- **components/history-sidebar.tsx** - Chat history sidebar with search/filter
- **components/theme-provider.tsx** - Dark/light mode management
- **App.tsx** - Main app with routing and providers
- **lib/queryClient.ts** - TanStack Query configuration

### Backend (`server/`)
- **routes.ts** - API endpoints
  - POST `/api/query` - Processes questions via Gradio and auto-saves to DB
  - GET `/api/conversations` - Retrieves chat history
  - DELETE `/api/conversations/:id` - Deletes conversation
  - Validates input with Zod schemas
  - Comprehensive error handling
- **storage.ts** - Database storage interface
  - MemStorage for development
  - Conversation CRUD operations

### Database (`db/`)
- **schema.ts** - Drizzle ORM schema
  - Conversations table (id, question, mode, useCache, response, createdAt)
- PostgreSQL database for persistence

### Shared (`shared/`)
- **schema.ts** - TypeScript types and Zod schemas
  - Query schema: question, mode, refresh
  - Response schema: data (markdown), error
  - Conversation schema: full conversation type

## API Integration

### Gradio Service
- Endpoint: `vinaykumarvk/WealthEKG`
- Method: `/process_question`
- Package: `@gradio/client`
- Response time: 30-60 seconds (slow but working)

### Request Payload
```typescript
{
  question: string,
  mode: "balanced" | "deep" | "concise",
  refresh: boolean
}
```

### Response Format
```typescript
{
  data: string, // Markdown-formatted response
  error?: string // Optional error message
}
```

## Design System

### Color Palette
Following Linear/Notion-inspired design system:
- **Primary**: Vibrant blue (220 90% 56%) for actions
- **Success**: Green (142 76% 36%) for cache/success states
- **Destructive**: Red (0 84% 60%) for errors
- **Background**: Deep charcoal (15 8% 8%) in dark mode
- **Surface**: Elevated cards (15 8% 12%)

### Typography
- **Primary Font**: Inter (400, 500, 600)
- **Code Font**: JetBrains Mono (400, 500)
- Title: 2xl font-semibold
- Labels: sm font-medium uppercase
- Body: base (16px)

### Spacing
- Micro spacing: 2, 4
- Component padding: 6, 8
- Section spacing: 12, 16
- Max-width: 5xl with mx-auto

## Technical Stack

### Dependencies
- **@gradio/client** - Gradio API integration
- **react-markdown** - Markdown rendering
- **@tanstack/react-query** - Data fetching/mutations
- **wouter** - Routing
- **zod** - Schema validation
- **lucide-react** - Icons
- **shadcn/ui** - UI components
- **jsPDF** - PDF export functionality
- **drizzle-orm** - Database ORM
- **@neondatabase/serverless** - PostgreSQL client

### Key Patterns
- Schema-first development with TypeScript
- TanStack Query for async state management
- Controlled forms with real-time validation
- Error boundaries with inline error display
- Optimistic UI updates

## Testing
✅ All end-to-end tests passing:
- Question submission across all modes
- Cache toggle functionality
- Response rendering and copy feature
- Chat history persistence and loading
- Search and filter functionality
- Export to Markdown and PDF
- API key settings and persistence
- Theme switching
- Loading/error/empty states
- Responsive design verification

## Known Behaviors
- Gradio API responses can take 30-60 seconds (external service limitation)
- Theme preference persists in localStorage
- API key stored in localStorage (for future use)
- Empty question input disables submit button
- Keyboard shortcuts: Enter to submit, Shift+Enter for newlines

## Development Commands
- `npm run dev` - Start development server (port 5000)
- Workflow: "Start application" - Auto-restart on changes

## Notes
- PostgreSQL database used for chat history
- No authentication required for current public API
- API key setting prepared for future authenticated endpoints
- Follows design_guidelines.md religiously
