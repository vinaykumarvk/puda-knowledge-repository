# Investment Portal Features Migration Guide

## Overview
This guide provides a comprehensive checklist for copying the following features from the Investment Approval Portal to your new Replit application:

**Features to Copy:**
- ✅ Dashboard
- ✅ New Investment
- ✅ My Investments  
- ✅ My Tasks
- ✅ Templates

**Features to Exclude:**
- ❌ Sign-in/Authentication system
- ❌ User role management features
- ❌ Cash Requests
- ❌ Administration features

---

## Important Notes

### Authentication Requirement
**CRITICAL**: These pages require knowing which user is logged in. You have two options:

1. **Keep minimal authentication** - Use a simple session with a single hardcoded user
2. **Mock the user** - Create a fake user context that returns a fixed user object

Without some form of user identification, these features won't work because they need to:
- Filter investments/tasks by user
- Show personalized dashboard stats
- Track who created what

**Recommendation**: Implement a simple single-user session (no login screen, just auto-login as one user).

---

## Phase 1: Dependencies & Packages

### 1.1 Install NPM Packages
Use the packager tool in Replit to install these packages:

```bash
# Core dependencies (already likely installed)
@tanstack/react-query
wouter
react-hook-form
@hookform/resolvers/zod
zod
drizzle-zod
date-fns

# UI Components (shadcn/ui)
@radix-ui/react-accordion
@radix-ui/react-alert-dialog
@radix-ui/react-avatar
@radix-ui/react-checkbox
@radix-ui/react-collapsible
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-label
@radix-ui/react-popover
@radix-ui/react-scroll-area
@radix-ui/react-select
@radix-ui/react-separator
@radix-ui/react-slider
@radix-ui/react-tabs
@radix-ui/react-toast
@radix-ui/react-tooltip

# Icons
lucide-react

# Charts (for dashboard)
recharts

# AI Integration (if you want document analysis, templates, AI features)
openai

# File upload
multer
@types/multer

# PDF generation (for rationale downloads)
jspdf

# Markdown rendering
# (You'll need a markdown renderer component - see components section)

# Backend
express
drizzle-orm
@neondatabase/serverless
```

### 1.2 Database Setup
Make sure you have PostgreSQL database enabled in your Replit project.

---

## Phase 2: Database Schema

### 2.1 Core Tables Needed

Copy these table definitions from `shared/schema.ts`:

**Required Tables:**
1. `users` - User information (even if using single user)
2. `investmentRequests` - Investment proposals
3. `tasks` - Task assignments
4. `approvals` - Approval workflow records
5. `documents` - File uploads
6. `documentCategories` - Document categories
7. `documentCategoryAssociations` - Many-to-many for docs
8. `templates` - Investment rationale templates
9. `investmentRationales` - Rationales for investments
10. `notifications` - User notifications
11. `sequences` - For generating request IDs (INV-2025-0001, etc.)

**Optional AI-Related Tables** (only if using AI features):
12. `backgroundJobs` - Async job processing
13. `crossDocumentQueries` - Search across documents
14. `webSearchQueries` - Web search history
15. `documentQueries` - Document Q&A

**Tables NOT Needed:**
- ❌ `cashRequests` - Cash request feature excluded
- ❌ `approvalWorkflows` - Complex workflow definitions excluded
- ❌ `auditLogs` - Admin feature excluded

### 2.2 Schema Migration

**File to copy:** `shared/schema.ts`

**What to modify:**
1. Remove `cashRequests` table definition
2. Remove `approvalWorkflows` table definition (lines 62-69)
3. Remove `auditLogs` table definition (lines 170-178)
4. Simplify `users` table if you want single-user:
   ```typescript
   // Minimal user schema
   export const users = pgTable("users", {
     id: serial("id").primaryKey(),
     username: text("username").notNull().unique(),
     email: text("email").notNull().unique(),
     firstName: text("first_name").notNull(),
     lastName: text("last_name").notNull(),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

**After copying:**
```bash
npm run db:push
```

---

## Phase 3: Frontend Files

### 3.1 Page Files

Copy these page files to `client/src/pages/`:

| File | Description | Dependencies |
|------|-------------|--------------|
| `Dashboard.tsx` | Main dashboard with stats, charts, proposals | Many components |
| `NewInvestment.tsx` | Create new investment form | InvestmentForm component |
| `MyInvestments.tsx` | List user's investments with filters | InvestmentDetailsInline |
| `MyTasks.tsx` | Task list with approval actions | DocumentAnalysisCard, many more |
| `Templates.tsx` | Manage investment rationale templates | Dialog components |

### 3.2 Component Files

You need to copy a LOT of components. Here's the complete list organized by category:

#### **Core Layout Components**
```
client/src/components/layout/
  - AppLayout.tsx          // Main app shell (sidebar, header, navigation)
```

**Note:** AppLayout includes navigation to ALL pages. You'll need to:
1. Remove Cash Requests nav item (line 92)
2. Remove Admin section (lines 191-215)
3. Optionally remove Help Center (line 98)

#### **Dashboard Components**
```
client/src/components/dashboard/
  - ProposalSummaryCard.tsx      // Proposal summary stats
  - RiskProfileChart.tsx          // Risk distribution chart
  - ValueDistributionChart.tsx    // Value distribution chart
  - DecisionSupportWidget.tsx     // Decision support widget
  
client/src/components/cards/
  - StatsCard.tsx                 // Stat cards for overview
  
client/src/components/tables/
  - RequestsTable.tsx             // Table for recent requests
```

#### **Investment Form Components**
```
client/src/components/forms/
  - InvestmentForm.tsx            // Main investment creation form

client/src/components/documents/
  - MultiTabDocumentUpload.tsx    // Multi-tab document uploader
  - EnhancedDocumentCategorySelector.tsx  // Category selector

client/src/components/ai/
  - TextEnhancementModal.tsx      // AI text enhancement (optional)
```

#### **Investment Details Components**
```
client/src/components/details/
  - InvestmentDetailsInline.tsx   // Expandable investment details view
```

#### **Task Components**
```
client/src/components/tasks/
  - TaskList.tsx                  // Task list component (if separate from page)

client/src/components/documents/
  - DocumentAnalysisCard.tsx      // Document analysis/preview
  - MarkdownRenderer.tsx          // Markdown rendering
  - UnifiedSearchInterface.tsx    // Cross-doc + web search
  - CrossDocumentQuery.tsx        // Cross-document search
  - WebSearchQuery.tsx            // Web search interface
  - DocumentCategoryView.tsx      // Category-based document view
  - DocumentInsights.tsx          // Document insights display
  - AnalysisCard.tsx              // Analysis results card
  - QueryCard.tsx                 // Query history card

client/src/components/rationale/
  - InvestmentRationaleModal.tsx  // Rationale creation/editing modal

client/src/components/approval/
  - ApprovalHistoryCard.tsx       // Approval history display
```

#### **Notification Components**
```
client/src/components/notifications/
  - NotificationDropdown.tsx      // Notification bell dropdown
```

#### **Shared Components**
```
client/src/components/shared/
  - MarkdownRenderer.tsx          // Shared markdown renderer (if exists)
```

#### **shadcn/ui Components** (already installed, should exist)
```
client/src/components/ui/
  - button.tsx
  - card.tsx
  - input.tsx
  - label.tsx
  - textarea.tsx
  - select.tsx
  - badge.tsx
  - dialog.tsx
  - alert-dialog.tsx
  - tabs.tsx
  - checkbox.tsx
  - slider.tsx
  - collapsible.tsx
  - dropdown-menu.tsx
  - tooltip.tsx
  - scroll-area.tsx
  - radio-group.tsx
  - theme-toggle.tsx
  - file-upload.tsx
  - form.tsx
```

### 3.3 Lib & Utility Files

Copy these utility files:

```
client/src/lib/
  - queryClient.ts          // React Query config with apiRequest helper
  - auth.ts                 // useUser hook (modify for single-user)
  - types.ts                // TypeScript type definitions
  
client/src/hooks/
  - use-toast.ts            // Toast notification hook

client/src/contexts/
  - ThemeContext.tsx        // Theme provider for dark mode
```

**Critical Modification for `auth.ts`:**
If you're using single-user mode, replace `useUser` hook with:
```typescript
export function useUser() {
  return {
    data: {
      id: 1,
      username: 'user',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'analyst',
    },
    isLoading: false,
  };
}
```

### 3.4 App Entry Point

**File:** `client/src/App.tsx`

Add these routes:
```typescript
<Route path="/" component={Dashboard} />
<Route path="/new-investment" component={NewInvestment} />
<Route path="/investments" component={MyInvestments} />
<Route path="/my-tasks" component={MyTasks} />
<Route path="/templates" component={Templates} />
```

Remove:
- ❌ `/login` route
- ❌ `/cash-requests` route
- ❌ `/admin/*` routes

### 3.5 Styling Files

**File:** `client/src/index.css`

Copy the entire file - it contains:
- CSS custom properties for theming (light/dark)
- Color definitions
- Global styles
- Animation classes

**File:** `tailwind.config.ts`

Make sure it has:
```typescript
module.exports = {
  darkMode: ["class"],
  // ... rest of config
}
```

---

## Phase 4: Backend Files

### 4.1 Storage Interface

**File:** `server/storage.ts`

**Methods needed:**
```typescript
// Investment methods
getInvestmentRequests(filters)
getInvestmentRequestById(id)
createInvestmentRequest(data)
updateInvestmentRequest(id, data)
softDeleteInvestmentRequest(id, userId)

// Task methods
getTasksForUser(userId)
getTaskById(id)
createTask(data)
updateTask(id, data)

// Document methods
createDocument(data)
getDocumentsForRequest(requestType, requestId)
getDocumentById(id)
updateDocumentAnalysis(documentId, analysis)

// Template methods
getTemplates(type)
getTemplateById(id)
createTemplate(data)
updateTemplate(id, data)
deleteTemplate(id)

// Rationale methods
getInvestmentRationales(investmentId)
createInvestmentRationale(data)
updateInvestmentRationale(id, data)
deleteInvestmentRationale(id)

// Approval methods
getApprovalsForRequest(requestType, requestId)
createApproval(data)

// Notification methods
getNotificationsForUser(userId)
markNotificationAsRead(id)
deleteNotification(id)

// Dashboard methods
getDashboardStats(userId)
getEnhancedDashboardStats(userId)
getRecentRequests(userId)

// Sequence methods (for request ID generation)
getNextSequenceValue(sequenceName, year)
```

**Methods NOT needed:**
- ❌ Cash request methods
- ❌ Approval workflow methods
- ❌ Audit log methods
- ❌ User management methods (if single-user)

### 4.2 API Routes

**File:** `server/routes.ts`

**Routes needed:**

```typescript
// Dashboard routes
GET  /api/dashboard/stats
GET  /api/dashboard/enhanced-stats
GET  /api/dashboard/recent-requests

// Investment routes
GET    /api/investments
GET    /api/investments/:id
POST   /api/investments
PUT    /api/investments/:id
DELETE /api/investments/:id

// Task routes
GET  /api/tasks
GET  /api/tasks/count
GET  /api/tasks/:id

// Approval routes
GET  /api/approvals/:requestType/:requestId
POST /api/approvals

// Document routes
POST   /api/documents/upload
GET    /api/documents/:requestType/:requestId
GET    /api/documents/download/:id
DELETE /api/documents/:id
POST   /api/documents/:id/analyze
GET    /api/documents/:id/analysis

// Template routes
GET    /api/templates/investment
GET    /api/templates/:id
POST   /api/templates
PUT    /api/templates/:id
DELETE /api/templates/:id

// Rationale routes
GET    /api/investments/:id/rationales
POST   /api/investments/:id/rationales
PUT    /api/investments/:investmentId/rationales/:id
DELETE /api/investments/:investmentId/rationales/:id

// Notification routes
GET    /api/notifications
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id

// Document category routes
GET  /api/document-categories
POST /api/document-categories

// AI/Search routes (optional)
POST /api/cross-document-query
POST /api/web-search
```

**Routes NOT needed:**
- ❌ `/api/login`, `/api/logout`, `/api/me` (if no auth)
- ❌ `/api/cash-requests/*`
- ❌ `/api/admin/*`
- ❌ `/api/users/*` (if single-user)

### 4.3 Middleware

**Files needed:**
```
server/middleware/
  - auth.ts              // Session middleware (modify for single-user)
```

**For single-user mode:**
```typescript
// Simple mock auth middleware
export function authMiddleware(req, res, next) {
  req.user = {
    id: 1,
    username: 'user',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'analyst',
  };
  next();
}
```

### 4.4 File Upload Configuration

**File:** `server/upload.ts` (or wherever multer is configured)

Make sure you have:
```typescript
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalName));
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|jpg|jpeg|png/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext.substring(1))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

## Phase 5: AI Features (Optional)

If you want AI-powered features (document analysis, text enhancement, cross-document search, web search, rationale generation):

### 5.1 OpenAI Integration

**Environment Variable:**
```bash
OPENAI_API_KEY=your-key-here
```

**Files needed:**
```
server/services/
  - openai.ts            // OpenAI client configuration
  - documentAnalysis.ts  // Document analysis logic
  - crossDocSearch.ts    // Cross-document search
  - webSearch.ts         // Web search
```

**Backend routes for AI:**
- POST `/api/documents/:id/analyze`
- POST `/api/cross-document-query`
- POST `/api/web-search`
- POST `/api/investments/:id/rationales/generate`

### 5.2 Background Jobs (Optional)

If you want async document processing:

**Table:** `backgroundJobs` (already in schema section)

**Files:**
```
server/jobs/
  - jobProcessor.ts      // Background job processing
  - documentAnalysisJob.ts
```

---

## Phase 6: Step-by-Step Migration Process

### Step 1: Setup New Project
1. Create new Replit project with Node.js template
2. Enable PostgreSQL database
3. Set up basic Express + Vite structure (similar to current project)

### Step 2: Install Dependencies
1. Use packager tool to install all packages from Section 1.1
2. Verify all packages installed successfully

### Step 3: Copy Schema & Run Migration
1. Create `shared/schema.ts`
2. Copy table definitions (exclude cash requests, audit logs, approval workflows)
3. Run `npm run db:push`
4. Verify tables created in database

### Step 4: Copy Backend Files
1. Copy `server/storage.ts` (remove excluded methods)
2. Copy `server/routes.ts` (remove excluded routes)
3. Copy middleware files
4. Set up file upload configuration
5. Test backend endpoints with curl or Postman

### Step 5: Copy Frontend Structure
1. Copy `client/src/lib/` utilities
2. Copy `client/src/hooks/`
3. Copy `client/src/contexts/`
4. Modify `auth.ts` for single-user if needed

### Step 6: Copy UI Components
1. Copy all `client/src/components/ui/` (shadcn components)
2. Copy `client/src/components/layout/AppLayout.tsx`
3. Modify AppLayout to remove excluded navigation items

### Step 7: Copy Feature Components
1. Copy dashboard components
2. Copy form components
3. Copy document components
4. Copy task components
5. Copy template components

### Step 8: Copy Pages
1. Copy `Dashboard.tsx`
2. Copy `NewInvestment.tsx`
3. Copy `MyInvestments.tsx`
4. Copy `MyTasks.tsx`
5. Copy `Templates.tsx`

### Step 9: Update App Routing
1. Modify `client/src/App.tsx`
2. Add routes for 5 pages
3. Remove excluded routes

### Step 10: Copy Styling
1. Copy `client/src/index.css`
2. Copy `tailwind.config.ts`
3. Verify theme works (light/dark mode)

### Step 11: Test Each Page
1. ✅ Test Dashboard loads
2. ✅ Test New Investment form
3. ✅ Test My Investments list
4. ✅ Test My Tasks
5. ✅ Test Templates

### Step 12: Add AI Features (Optional)
1. Set OPENAI_API_KEY
2. Copy AI service files
3. Test document analysis
4. Test cross-document search

---

## Phase 7: Data Seeding

### Seed Data Required

Create seed data for:
1. **One user** (if using single-user mode)
2. **Document categories** (Financial, Legal, Operational, etc.)
3. **Sample templates** (optional)

**Seed script example:**
```typescript
// seed.ts
import { db } from './db';
import { users, documentCategories } from '@shared/schema';

async function seed() {
  // Create user
  await db.insert(users).values({
    username: 'analyst',
    email: 'analyst@example.com',
    password: 'hashed-password', // Not needed if no auth
    firstName: 'John',
    lastName: 'Doe',
    role: 'analyst',
  });

  // Create document categories
  await db.insert(documentCategories).values([
    { name: 'Financial Statements', description: 'Balance sheets, income statements', icon: '💰', isSystem: true },
    { name: 'Legal Documents', description: 'Contracts, agreements', icon: '⚖️', isSystem: true },
    { name: 'Market Research', description: 'Industry analysis, reports', icon: '📊', isSystem: true },
    { name: 'Other', description: 'Miscellaneous documents', icon: '📄', isSystem: true },
  ]);
}

seed();
```

---

## Phase 8: Testing Checklist

### Dashboard
- [ ] Stats cards display correctly
- [ ] Proposal summary shows data
- [ ] Risk/value charts render
- [ ] Recent proposals table works
- [ ] Filters work correctly
- [ ] My Tasks section displays
- [ ] Navigation works

### New Investment
- [ ] Form displays all fields
- [ ] Validation works
- [ ] Can select investment type
- [ ] Expected return toggle works
- [ ] Document upload works
- [ ] Can save as draft
- [ ] Can submit investment
- [ ] Redirects after submit

### My Investments
- [ ] Investment list displays
- [ ] Tabs work (All, Pending, Approved, Rejected)
- [ ] Filters work
- [ ] Can expand investment details
- [ ] Can view documents
- [ ] Can delete draft investments

### My Tasks
- [ ] Task list displays
- [ ] Active/Completed tabs work
- [ ] Can expand task details
- [ ] Investment details show
- [ ] Documents display
- [ ] Can approve/reject
- [ ] Approval comments work

### Templates
- [ ] Template list displays
- [ ] Can create template
- [ ] Can edit template
- [ ] Can delete template
- [ ] Sections display correctly

---

## Troubleshooting Common Issues

### "User is undefined"
- Check `auth.ts` - make sure useUser returns valid user object
- Verify authMiddleware is applied to routes

### "Investment not found"
- Check database has data
- Verify storage methods return correct format

### "Document upload fails"
- Check uploads folder exists and has write permissions
- Verify multer configuration
- Check file size limits

### "Charts don't render"
- Verify recharts is installed
- Check data format matches expected structure

### "Dark mode doesn't work"
- Verify ThemeContext is wrapped around app
- Check CSS custom properties in index.css
- Verify darkMode: ["class"] in tailwind.config

---

## Summary

**Total Files to Copy:** ~60-80 files
**Estimated Time:** 4-8 hours for full migration
**Complexity:** Medium-High

**Key Success Factors:**
1. Copy schema first and run migration
2. Test backend routes before frontend
3. Copy components in dependency order
4. Handle authentication carefully (single-user vs. mock)
5. Test each page individually
6. Don't forget styling files

**What You'll Have:**
A fully functional investment management system with:
- Dashboard with stats and charts
- Investment creation form with document upload
- Investment list with filtering
- Task management with approvals
- Template management for rationales
- Dark mode support
- AI features (optional)

**What You Won't Have:**
- Complex multi-role authentication
- Cash request management
- Admin panels
- Audit logging
- Complex approval workflows

---

## Need Help?

If you get stuck during migration:
1. Check the browser console for errors
2. Check backend logs
3. Verify database tables exist
4. Test API endpoints independently
5. Compare component imports with original project

Good luck with your migration! 🚀
