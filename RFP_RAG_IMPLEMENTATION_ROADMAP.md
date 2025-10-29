# RFP RAG Implementation Roadmap

## Overview
This document outlines the implementation steps for the **Two-Tier RAG (Retrieval-Augmented Generation)** system for RFP response generation. The database infrastructure is now complete and ready for historical RFP data and RAG implementation.

---

## ✅ Phase 1: Database Infrastructure (COMPLETED)

### What Was Built:
1. **`historical_rfps` Table** in PostgreSQL with:
   - Metadata fields: `rfpName`, `clientName`, `clientIndustry`, `submissionDate`
   - Content fields: `category`, `requirement`, `response`
   - Quality metrics: `successScore` (1-5), `responseQuality` ("excellent", "good", "average")
   - **pgvector embedding column** (1536 dimensions for OpenAI embeddings)
   - Tracking fields: `uploadedBy`, `createdAt`

2. **Storage Interface Methods** (in `server/storage.ts`):
   - `getAllHistoricalRfps()` - Get all historical RFPs
   - `getHistoricalRfpById(id)` - Get specific RFP by ID
   - `createHistoricalRfp(rfp)` - Add new historical RFP
   - `updateHistoricalRfp(id, updates)` - Update existing RFP
   - `deleteHistoricalRfp(id)` - Remove historical RFP
   - `searchHistoricalRfpsBySimilarity(embedding, topK)` - **Vector similarity search** using pgvector

3. **pgvector Extension** - Enabled in PostgreSQL for vector operations

---

## 🚀 Phase 2: Populate Historical RFPs (NEXT STEP - User Action Required)

### What You Need:
Prepare 10-50 past RFP responses in Excel/CSV format with these columns:
- `rfp_name` - Name/title of the RFP (e.g., "Client Proposal 2025")
- `client_name` - Client company name (optional)
- `client_industry` - Industry vertical (e.g., "Financial Services", "Healthcare")
- `submission_date` - Date RFP was submitted
- `category` - RFP category/section (e.g., "Technical Capabilities", "Team Structure")
- `requirement` - The actual RFP question/requirement
- `response` - Your company's approved response that was used
- `success_score` - Rating 1-5 (Did you win? 5=Won, 3=Shortlisted, 1=Lost)
- `response_quality` - Quality assessment ("excellent", "good", "average")
- `uploaded_by` - Person who uploaded (for tracking)

### Implementation Steps:

#### Step 1: Create Admin Upload Interface
Build a simple UI page (similar to current RFP upload) that allows:
- Excel/CSV file upload for historical RFPs
- Preview of parsed data before insertion
- Validation of required fields
- Batch processing with progress indicator

**Frontend:** `client/src/pages/rfp/UploadHistoricalRfps.tsx`
**Backend Endpoint:** `POST /api/historical-rfps/upload`

#### Step 2: Generate Embeddings During Upload
When processing each historical RFP:
```typescript
// server/embeddings.ts (new file to create)
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dimensions, $0.02 per 1M tokens
    input: text,
  });
  return response.data[0].embedding;
}

// Combine requirement + category for better semantic matching
export async function generateRfpEmbedding(
  category: string, 
  requirement: string
): Promise<number[]> {
  const combinedText = `Category: ${category}\nRequirement: ${requirement}`;
  return generateEmbedding(combinedText);
}
```

#### Step 3: Batch Insert with Embeddings
```typescript
// In server/routes.ts
app.post("/api/historical-rfps/upload", async (req, res) => {
  const { rfps } = req.body; // Array of RFP objects from Excel
  
  const insertedRfps = [];
  
  for (const rfp of rfps) {
    // Generate embedding
    const embedding = await generateRfpEmbedding(rfp.category, rfp.requirement);
    
    // Insert into database
    const inserted = await storage.createHistoricalRfp({
      ...rfp,
      embedding: JSON.stringify(embedding) // Store as JSON string
    });
    
    insertedRfps.push(inserted);
  }
  
  res.json({ success: true, count: insertedRfps.length });
});
```

---

## 🔍 Phase 3: Implement Two-Tier RAG Retrieval

### Architecture:
```
Incoming RFP Requirement
    ↓
[Generate Embedding for Requirement]
    ↓
TIER 1: Search Historical RFPs (PostgreSQL + pgvector)
    ↓
Similarity > 0.75 Threshold?
    ├─ YES → Use Historical RFPs as Context
    └─ NO  → TIER 2: Query EKG Service
              ↓
         Retrieve Knowledge Graph Data
    ↓
Combine Retrieved Context + OpenAI GPT-5
    ↓
Generate Knowledge-Grounded Response with Citations
```

### Implementation Steps:

#### Step 1: Create Embedding Service
Create `server/embeddings.ts` (as shown in Phase 2, Step 2 above)

#### Step 2: Update `/api/generate-response` Endpoint
```typescript
// In server/routes.ts
app.post("/api/generate-response", async (req, res) => {
  const { requirement_id, model } = req.body;
  
  // 1. Get requirement from database
  const requirement = await storage.getRfpResponseById(parseInt(requirement_id));
  if (!requirement) return res.status(404).json({ error: "Not found" });
  
  // 2. Generate embedding for the requirement
  const { generateRfpEmbedding } = await import("./embeddings");
  const embedding = await generateRfpEmbedding(
    requirement.category, 
    requirement.requirement
  );
  
  // 3. TIER 1: Search historical RFPs
  const historicalMatches = await storage.searchHistoricalRfpsBySimilarity(
    embedding, 
    5 // Top 5 matches
  );
  
  const SIMILARITY_THRESHOLD = 0.75;
  const highQualityMatches = historicalMatches.filter(
    m => m.similarity >= SIMILARITY_THRESHOLD
  );
  
  let context = "";
  let source = "";
  
  if (highQualityMatches.length > 0) {
    // TIER 1: Use historical RFPs
    source = "historical";
    context = buildHistoricalContext(highQualityMatches);
  } else {
    // TIER 2: Fallback to EKG service
    source = "ekg";
    context = await queryEKGService(requirement.requirement, requirement.category);
  }
  
  // 4. Generate response with context
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  });
  
  const prompt = buildContextualPrompt(requirement, context, source);
  
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
    temperature: 0.7, // Lower for more consistent responses
  });
  
  const generatedResponse = response.choices[0]?.message?.content || "";
  
  // 5. Update database with generated response and metadata
  await storage.updateRfpResponse(parseInt(requirement_id), {
    finalResponse: generatedResponse,
    modelProvider: "openai",
    // Store which tier was used (could add a new column)
  });
  
  res.json({ 
    success: true,
    response: generatedResponse,
    source, // "historical" or "ekg"
    similarityMatches: highQualityMatches.length,
  });
});
```

#### Step 3: Helper Functions

**Build Historical Context:**
```typescript
function buildHistoricalContext(matches: Array<HistoricalRfp & { similarity: number }>): string {
  const examples = matches.map((match, i) => `
Example ${i+1} (Similarity: ${(match.similarity * 100).toFixed(1)}%, Success Score: ${match.successScore}/5):
RFP: ${match.rfpName} (${match.clientIndustry})
Category: ${match.category}
Requirement: ${match.requirement}
Our Past Response: ${match.response}
---`).join('\n');
  
  return examples;
}
```

**Build Contextual Prompt:**
```typescript
function buildContextualPrompt(
  requirement: ExcelRequirementResponse,
  context: string,
  source: "historical" | "ekg"
): string {
  if (source === "historical") {
    return `You are an expert RFP response writer for a wealth management company.

SIMILAR PAST RFP RESPONSES (Use these as reference):
${context}

NEW REQUIREMENT TO ANSWER:
Category: ${requirement.category}
Requirement: ${requirement.requirement}

Instructions:
1. Study the similar past responses above
2. Adapt the best elements to this new requirement
3. Maintain consistency with our proven approach
4. Write a professional, comprehensive response (200-400 words)
5. Do NOT copy verbatim - adapt and improve

Write the response now:`;
  } else {
    return `You are an expert RFP response writer for a wealth management company.

RELEVANT KNOWLEDGE FROM OUR SYSTEMS:
${context}

NEW REQUIREMENT TO ANSWER:
Category: ${requirement.category}
Requirement: ${requirement.requirement}

Instructions:
1. Use the knowledge above to ground your response
2. Reference specific capabilities mentioned
3. Maintain professional, confident tone
4. Write 200-400 words

Write the response now:`;
  }
}
```

**Query EKG Service (Tier 2 Fallback):**
```typescript
async function queryEKGService(requirement: string, category: string): Promise<string> {
  try {
    const response = await fetch(
      "https://ekg-service-47249889063.europe-west6.run.app/v1/answer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${category}: ${requirement}`,
          chat_history: [],
          model: "openai",
          temperature: 0.7,
        })
      }
    );
    
    const data = await response.json();
    
    // Format EKG response with sources
    let context = data.answer || "";
    
    if (data.sources && data.sources.length > 0) {
      context += "\n\nSOURCES:\n";
      data.sources.forEach((src: any) => {
        context += `- ${src.filename} (Relevance: ${src.score})\n`;
      });
    }
    
    return context;
  } catch (error) {
    console.error("EKG service error:", error);
    return ""; // Fallback to no context if EKG fails
  }
}
```

---

## 📊 Phase 4: Testing & Refinement

### Testing Checklist:
1. **Upload 5-10 historical RFPs** with embeddings
2. **Test similarity search** with known requirements
3. **Verify threshold logic** (0.75 cutoff)
4. **Test Tier 1** (historical matches) - should use past responses
5. **Test Tier 2** (no matches) - should query EKG service
6. **Compare response quality** between tiers
7. **Monitor API costs** (OpenAI embeddings + GPT-5 generation)

### Tuning Parameters:
- **Similarity Threshold**: Adjust 0.75 threshold (test 0.70-0.85 range)
- **Top-K Matches**: Try different values (3, 5, 10)
- **Temperature**: Adjust for creativity vs consistency (0.5-1.0)
- **Context Window**: How many past responses to include

### Metrics to Track:
- Which tier is used more often (historical vs EKG)
- Response quality ratings by tier
- API costs per response
- Generation time per tier

---

## 🎯 Success Criteria

### System is ready when:
1. ✅ Database can store 10-50 historical RFPs with embeddings
2. ✅ Vector similarity search returns relevant past responses
3. ✅ Tier 1 (historical) generates quality responses for similar requirements
4. ✅ Tier 2 (EKG) provides fallback for novel requirements
5. ✅ Response quality improves over baseline (current simple prompts)
6. ✅ System tracks which tier was used for analytics

---

## 💰 Cost Estimates

### OpenAI Pricing (as of 2025):
- **Embeddings** (text-embedding-3-small): $0.02 per 1M tokens
  - Average requirement: ~100 tokens
  - 50 historical RFPs: ~5,000 tokens = $0.0001 (one-time)
  - Each new requirement: ~100 tokens = negligible

- **GPT-5 Generation**: ~$0.10-$0.50 per response (depending on context length)
  - Tier 1 (historical): Lower cost (shorter context)
  - Tier 2 (EKG): Higher cost (knowledge graph retrieval)

### Estimated Monthly Costs (100 RFP responses):
- Embeddings: <$1
- GPT-5 Generation: $10-$50
- **Total: ~$15-$60/month** for 100 responses

---

## 📁 Files to Create/Modify

### New Files:
- `server/embeddings.ts` - Embedding generation service
- `client/src/pages/rfp/UploadHistoricalRfps.tsx` - Admin upload UI
- `RFP_RAG_IMPLEMENTATION_ROADMAP.md` - This document

### Files to Modify:
- `server/routes.ts` - Update `/api/generate-response` endpoint
- `client/src/pages/rfp.tsx` - Add "Upload Historical RFPs" tab (optional)

### Existing Infrastructure (Ready to Use):
- ✅ `shared/schema.ts` - `historicalRfps` table defined
- ✅ `server/storage.ts` - CRUD methods implemented
- ✅ PostgreSQL database - pgvector extension enabled

---

## 🚀 Quick Start (When Ready)

1. **Prepare your historical RFPs** in Excel with required columns
2. **Create embedding service** (`server/embeddings.ts`)
3. **Build upload interface** for historical RFPs
4. **Update generate-response endpoint** with two-tier RAG logic
5. **Test with real requirements** and refine thresholds
6. **Monitor performance** and iterate

---

## 📞 Need Help?

If you encounter issues:
1. Check database connection (pgvector enabled?)
2. Verify OpenAI integration (embeddings working?)
3. Test similarity search (returning results?)
4. Review EKG service response format
5. Check logs for API errors

The foundation is built and ready. Just add your historical RFP data and implement the retrieval logic when you're ready!
