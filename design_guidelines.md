# Design Guidelines: Graph Database Chatbot Interface

## Design Approach: Productivity-Focused Design System

**Selected Approach**: Linear/Notion-inspired design system - optimized for developer tools and productivity applications with clean aesthetics and functional clarity.

**Rationale**: This is a utility-focused application where efficiency, learnability, and clear information hierarchy are paramount. Drawing inspiration from Linear's crisp interface and Notion's content-focused design creates an optimal environment for technical workflows.

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 15 8% 8% (deep charcoal)
- Surface: 15 8% 12% (elevated cards)
- Border: 15 8% 18% (subtle separation)
- Primary: 220 90% 56% (vibrant blue for actions)
- Primary Hover: 220 90% 48%
- Text Primary: 0 0% 98%
- Text Secondary: 0 0% 65%
- Success: 142 76% 36% (cache enabled, successful responses)
- Error: 0 84% 60% (API failures)

**Light Mode**
- Background: 0 0% 100%
- Surface: 0 0% 98%
- Border: 0 0% 89%
- Primary: 220 90% 50%
- Text Primary: 0 0% 9%
- Text Secondary: 0 0% 45%

### B. Typography

**Font Stack**: 
- Primary: 'Inter' from Google Fonts (400, 500, 600)
- Code/Response: 'JetBrains Mono' from Google Fonts (400, 500)

**Hierarchy**:
- Page Title: text-2xl font-semibold (24px)
- Section Headers: text-sm font-medium uppercase tracking-wide (12px)
- Labels: text-sm font-medium (14px)
- Body/Input: text-base (16px)
- Helper Text: text-sm text-secondary (14px)

### C. Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (between related elements): 2, 4
- Component padding: 6, 8
- Section spacing: 12, 16
- Page margins: 8, 12

**Container Strategy**:
- Main container: max-w-5xl mx-auto with px-6
- Two-column layout on desktop (lg:grid-cols-2) for input/output
- Single column on mobile with sticky controls

### D. Component Library

**Input Section Components**:

1. **Question Input**
   - Large textarea with min-h-32, rounded-lg border
   - Placeholder: "Ask a question about your graph database..."
   - Character count indicator (text-xs text-secondary in bottom-right)
   - Focus state: ring-2 ring-primary

2. **Mode Selector**
   - Custom select dropdown with chevron icon (Heroicons)
   - Options: Balanced (default) | Deep | Customer-Selected
   - Styled with same border treatment as textarea
   - Hover state: border color brightens

3. **Cache Toggle**
   - Switch component with label "Use Cache"
   - When enabled: background success color with check icon
   - When disabled: muted gray background
   - Smooth transition animation (150ms)

4. **Action Button**
   - Primary button: "Send Query" with arrow-right icon
   - Full width on mobile, min-w-32 on desktop
   - Loading state: spinner replacing icon, text "Processing..."
   - Disabled state when input is empty

**Response Section Components**:

5. **Response Container**
   - Distinct surface background color
   - Markdown renderer with proper styling:
     - Headings: font-semibold with bottom margins
     - Code blocks: JetBrains Mono, darker background, p-4 rounded
     - Inline code: px-1.5 py-0.5 rounded bg-surface
     - Lists: proper indentation with custom bullet styles
   - Max height with overflow-y-auto
   - Empty state: centered text "Response will appear here"

6. **Status Indicators**
   - Loading: Animated pulse skeleton in response area
   - Success: Subtle green accent border on response container
   - Error: Red border with error message in response area
   - Copy response button (top-right of response container)

### E. Layout Structure

**Desktop (lg+)**: 
```
┌─────────────────────────────────────┐
│         Graph Query Assistant       │
├──────────────────┬──────────────────┤
│  Input Section   │  Response Area   │
│  - Question      │  - MD Content    │
│  - Mode Select   │  - Status        │
│  - Cache Toggle  │  - Copy Button   │
│  - Send Button   │                  │
└──────────────────┴──────────────────┘
```

**Mobile**: Stacked layout with sticky controls at bottom

### F. Interaction Patterns

- **Form Validation**: Real-time empty state detection
- **API States**: Clear visual feedback for loading/success/error
- **Keyboard Support**: Enter to submit (with Shift+Enter for newlines in textarea)
- **Response Actions**: Copy to clipboard with toast notification
- **Smooth Transitions**: 150ms for state changes, no layout shifts

### G. Accessibility & Dark Mode

- Consistent dark mode across ALL form elements (inputs, selects, textareas)
- WCAG AA contrast ratios for all text
- Focus indicators: ring-2 ring-primary ring-offset-2 ring-offset-background
- Semantic HTML with proper ARIA labels
- Skip to response link for keyboard users

## Visual Polish

- Subtle shadows on elevated surfaces (shadow-sm)
- Border radius consistency: rounded-lg (0.5rem) for all interactive elements
- Icon consistency: Use Heroicons throughout (outline style)
- No animations except: loading spinners, toggle switches, subtle fade-in for responses
- Monospace font for all code/technical content in responses