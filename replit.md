# Graph Query Assistant - WealthEKG

## Overview

Graph Query Assistant is a web-based chatbot interface for querying graph databases with AI-powered natural language processing. The application allows users to ask questions about graph data in plain English, configure query modes (balanced, deep, or concise), and receive markdown-formatted responses. It integrates with the WealthEKG Gradio API to process questions and return insights from graph database queries.

The application features a modern, productivity-focused design system inspired by Linear and Notion, with support for both light and dark themes. It provides a clean, efficient interface optimized for developer tools and data exploration workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- React Router (Wouter) for lightweight client-side routing

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, customizable components
- Tailwind CSS for utility-first styling with custom design tokens
- Class Variance Authority (CVA) for component variant management
- Design system follows Linear/Notion-inspired patterns with focus on productivity and clean aesthetics

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- React hooks for local component state
- Form state managed via React Hook Form with Zod validation

**Theming**
- CSS variables-based theming system supporting light and dark modes
- Theme persistence via localStorage
- Comprehensive color palette with semantic tokens (primary, secondary, destructive, muted, accent)
- Typography system using Inter (UI) and JetBrains Mono (code/monospace) fonts

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- TypeScript for type safety across the entire stack
- Custom middleware for request logging and error handling

**API Design**
- RESTful API endpoint (`/api/query`) for query processing
- Request/response validation using Zod schemas
- Centralized error handling with appropriate HTTP status codes

**Development Tools**
- Vite middleware integration for seamless HMR in development
- Separate build processes for client (Vite) and server (esbuild)
- TypeScript path aliases for clean imports (@/, @shared/)

### Data Storage Solutions

**Database Configuration**
- Drizzle ORM configured for PostgreSQL with Neon serverless driver
- Schema definitions in TypeScript with Drizzle-Zod integration
- Migration system setup via drizzle-kit
- In-memory storage implementation for user management (extensible to database)

**Data Models**
- Query schema: question (string), mode (enum: balanced/deep/concise), refresh (boolean)
- Response schema: data (markdown string), optional error field
- User schema: username, password, with UUID-based IDs

### Authentication & Authorization

Currently implements a minimal authentication structure with:
- In-memory user storage (IStorage interface)
- Extensible storage interface ready for database implementation
- Session management foundation (connect-pg-simple package available)

**Design Decision**: Authentication is scaffolded but not fully implemented, allowing for future integration without restructuring the core application.

### External Dependencies

**Third-Party APIs**
- **Gradio Client**: Primary integration with WealthEKG Gradio API (vinaykumarvk/WealthEKG)
  - Endpoint: `/process_question`
  - Handles natural language query processing
  - Returns markdown-formatted responses from graph database queries
  - Supports query modes (balanced, deep, concise) and cache refresh control

**Database Services**
- **Neon Database**: Serverless PostgreSQL configured via DATABASE_URL environment variable
- Connection pooling via @neondatabase/serverless driver

**UI Libraries & Tools**
- Radix UI: Headless component primitives for accessibility
- Lucide React: Icon library
- React Markdown: Markdown rendering for query responses
- date-fns: Date manipulation utilities

**Development Dependencies**
- Replit plugins: Vite integration, error overlay, cartographer, dev banner
- PostCSS with Autoprefixer for CSS processing

**Design Rationale**: The Gradio Client integration provides a clean separation between the UI layer and the graph database query logic. This allows the WealthEKG service to handle complex graph traversal and AI processing while the frontend focuses on user experience and response presentation.