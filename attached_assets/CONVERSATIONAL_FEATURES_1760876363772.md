# 💬 Conversational Response Features

**Date:** October 19, 2025  
**Status:** ✅ **IMPLEMENTED AND DEPLOYED**

---

## 🎯 Overview

The EKG Agent now supports conversational responses through response IDs and conversation IDs, enabling context-aware follow-up queries and multi-turn conversations.

---

## 🔧 Implementation Details

### Request Schema Updates

```python
class AskRequest(BaseModel):
    question: str
    domain: str = "wealth_management"
    vectorstore_id: Optional[str] = None
    response_id: Optional[str] = None      # NEW: Links to previous response
    conversation_id: Optional[str] = None  # NEW: Alternative conversation tracking
    params: Optional[Dict[str, Any]] = None
```

### Response Schema Updates

```python
class AskResponse(BaseModel):
    response_id: str                       # NEW: Unique identifier for this response
    markdown: str
    sources: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None  # Enhanced with conversational metadata
```

### Enhanced Metadata

The `meta` field now includes:
- `response_id` - Unique identifier for this response
- `is_conversational` - Boolean flag indicating conversational context
- `previous_response_id` - ID of the previous response (if provided)
- `conversation_id` - Conversation identifier (if provided)
- `domain` - Domain used for the query
- `vectorstore_id` - Vector store used
- `model` - AI model used (gpt-5-nano, gpt-5-mini, gpt-5)
- `mode` - Answer mode (concise/balanced/deep)

---

## 📋 Usage Examples

### 1. Initial Question (No Context)

```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is OTP verification?",
    "domain": "wealth_management"
  }'
```

**Response:**
```json
{
  "response_id": "123e4567-e89b-12d3-a456-426614174000",
  "markdown": "OTP verification is a two-factor authentication process...",
  "sources": [...],
  "meta": {
    "domain": "wealth_management",
    "vectorstore_id": "vs_689b49252a4c8191a12a1528a475fbd8",
    "is_conversational": false,
    "model": "gpt-5-mini",
    "mode": "balanced"
  }
}
```

### 2. Follow-up Using response_id

```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How long is the OTP valid?",
    "domain": "wealth_management",
    "response_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Response:**
```json
{
  "response_id": "123e4567-e89b-12d3-a456-426614174000",
  "markdown": "The OTP is typically valid for 5-10 minutes...",
  "sources": [...],
  "meta": {
    "domain": "wealth_management",
    "vectorstore_id": "vs_689b49252a4c8191a12a1528a475fbd8",
    "is_conversational": true,
    "previous_response_id": "123e4567-e89b-12d3-a456-426614174000",
    "model": "gpt-5-mini",
    "mode": "balanced"
  }
}
```

### 3. Follow-up Using conversation_id

```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What if I don't receive the OTP?",
    "domain": "wealth_management",
    "conversation_id": "conv-abc123-def456"
  }'
```

**Response:**
```json
{
  "response_id": "conv-abc123-def456",
  "markdown": "If you don't receive the OTP, you can request a new one...",
  "sources": [...],
  "meta": {
    "domain": "wealth_management",
    "vectorstore_id": "vs_689b49252a4c8191a12a1528a475fbd8",
    "is_conversational": true,
    "conversation_id": "conv-abc123-def456",
    "model": "gpt-5-mini",
    "mode": "balanced"
  }
}
```

---

## 🔄 Conversation Flow

### Pattern 1: Response ID Chain
```
Query 1 → response_id: A
Query 2 (response_id: A) → response_id: A (same ID maintained)
Query 3 (response_id: A) → response_id: A (continues chain)
```

### Pattern 2: Conversation ID Thread
```
Query 1 → conversation_id: conv-123
Query 2 (conversation_id: conv-123) → response_id: conv-123
Query 3 (conversation_id: conv-123) → response_id: conv-123
```

### Pattern 3: Mixed Usage
```
Query 1 → response_id: A
Query 2 (response_id: A) → response_id: A
Query 3 (conversation_id: conv-123) → response_id: conv-123 (new thread)
```

---

## 🎯 Key Features

### ✅ Response ID Support
- **Unique UUIDs** - Each response gets a unique identifier
- **Context Linking** - Links to previous responses for context
- **ID Reuse** - Can reuse response_id for conversation continuity
- **Metadata Tracking** - Tracks previous response relationships

### ✅ Conversation ID Support
- **Alternative Tracking** - Different from response_id approach
- **Thread Management** - Maintains conversation threads
- **Flexible Usage** - Can be used alongside response_id
- **Custom Identifiers** - Allows custom conversation IDs

### ✅ Enhanced Question Context
- **Context Injection** - Previous context ID added to question
- **Transparent Processing** - Context visible in enhanced question
- **Backward Compatible** - Works with existing question processing

### ✅ Metadata Enrichment
- **Conversational Flags** - `is_conversational` boolean
- **Relationship Tracking** - `previous_response_id` field
- **Thread Identification** - `conversation_id` field
- **Full Context** - Complete metadata for debugging

---

## 🔧 Technical Implementation

### Request Processing
1. **ID Resolution** - Uses `response_id` or `conversation_id` or generates new UUID
2. **Context Enhancement** - Adds previous context ID to question
3. **Agent Processing** - Processes enhanced question through agent
4. **Metadata Enrichment** - Adds conversational metadata to response

### Response Generation
1. **ID Assignment** - Assigns resolved ID to response
2. **Metadata Population** - Populates conversational metadata
3. **Context Tracking** - Tracks previous response relationships
4. **Flag Setting** - Sets conversational flags appropriately

---

## 📊 Usage Patterns

### 1. Simple Follow-up
```python
# Initial query
response1 = requests.post("/v1/answer", json={
    "question": "What is OTP?",
    "domain": "wealth_management"
})

# Follow-up using response_id
response2 = requests.post("/v1/answer", json={
    "question": "How long is it valid?",
    "domain": "wealth_management",
    "response_id": response1.json()["response_id"]
})
```

### 2. Conversation Thread
```python
# Start conversation
response1 = requests.post("/v1/answer", json={
    "question": "What is OTP?",
    "domain": "wealth_management",
    "conversation_id": "my-conversation-123"
})

# Continue conversation
response2 = requests.post("/v1/answer", json={
    "question": "What are the requirements?",
    "domain": "wealth_management",
    "conversation_id": "my-conversation-123"
})
```

### 3. Mixed Context
```python
# Initial with conversation_id
response1 = requests.post("/v1/answer", json={
    "question": "What is OTP?",
    "domain": "wealth_management",
    "conversation_id": "conv-123"
})

# Follow-up with response_id
response2 = requests.post("/v1/answer", json={
    "question": "How long is it valid?",
    "domain": "wealth_management",
    "response_id": response1.json()["response_id"]
})
```

---

## ✅ Benefits

### For Developers
- **Easy Integration** - Simple request/response pattern
- **Flexible Tracking** - Multiple ID types for different use cases
- **Rich Metadata** - Complete context information
- **Backward Compatible** - Existing code continues to work

### For Users
- **Contextual Responses** - Better follow-up answers
- **Conversation Continuity** - Maintains context across queries
- **Flexible Threading** - Multiple conversation patterns
- **Transparent Tracking** - Clear ID relationships

### For Analytics
- **Conversation Tracking** - Track user interaction patterns
- **Response Relationships** - Understand query dependencies
- **Usage Analytics** - Analyze conversational flows
- **Debugging Support** - Rich metadata for troubleshooting

---

## 🚀 Production Deployment Status

### ✅ **Current Deployment**
- **URL**: `https://ekg-service-47249889063.europe-west6.run.app`
- **Status**: ✅ **FULLY OPERATIONAL**
- **Domains**: wealth_management, apf
- **Models**: GPT-5-nano (concise), GPT-5-mini (balanced), GPT-5 (deep)
- **Timeout**: 5 minutes for deep analysis
- **File Export**: Disabled (handled by React frontend)

### ✅ **Conversational Features Status**
- ✅ **Fully Implemented** - All functionality working
- ✅ **Tested** - Comprehensive test coverage
- ✅ **Documented** - Complete usage documentation
- ✅ **Backward Compatible** - Existing clients unaffected
- ✅ **Production Ready** - Deployed and operational
- ✅ **Response ID Tracking** - Working with UUID generation
- ✅ **Conversation Context** - Context injection functional
- ✅ **Metadata Enrichment** - Full conversational metadata

---

## 📞 Quick Reference

**Start Conversation:**
```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -d '{"question": "What is OTP?", "domain": "wealth_management"}'
```

**Continue Conversation:**
```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -d '{"question": "How long is it valid?", "domain": "wealth_management", "response_id": "YOUR_RESPONSE_ID"}'
```

**Start New Thread:**
```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -d '{"question": "What is redemption?", "domain": "wealth_management", "conversation_id": "new-thread-123"}'
```

---

## 🔧 Current API Capabilities

### **Available Domains**
- **wealth_management**: Mutual funds, orders, customer onboarding, and wealth management processes
- **apf**: APF process data and workflows

### **Answer Modes & Models**
- **concise**: GPT-5-nano (~30-45 seconds) - Fast, focused answers
- **balanced**: GPT-5-mini (~45-60 seconds) - Detailed answers  
- **deep**: GPT-5 (~2-5 minutes) - Comprehensive analysis

### **API Endpoints**
- `GET /health` - Health check and system status
- `GET /domains` - List available domains
- `GET /metrics` - Performance metrics
- `GET /kg-status` - Knowledge graph status
- `POST /v1/answer` - Main Q&A endpoint with conversational support

### **Performance Metrics**
- **Health Check**: <1 second response time
- **Domain Loading**: Both domains fully loaded and operational
- **Cache Status**: Query and hits caching active
- **Error Handling**: Comprehensive error responses
- **Monitoring**: Real-time metrics and logging

---

*Conversational features implemented and ready for production use!* 🚀
