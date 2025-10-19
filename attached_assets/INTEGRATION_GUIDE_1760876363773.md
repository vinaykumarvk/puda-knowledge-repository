# 🔗 Third-Party Integration Guide

**Complete guide for testing and integrating with EKG Agent API**

---

## 🚀 Quick Start

### 1. Local Development Server
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-proj-your-actual-key-here

# Start the server
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Production Deployment
```bash
# Production URL (no setup required)
https://ekg-service-47249889063.europe-west6.run.app
```

### 3. Test Connectivity
```bash
# Local health check
curl http://localhost:8000/health

# Production health check
curl https://ekg-service-47249889063.europe-west6.run.app/health

# List domains (local)
curl http://localhost:8000/domains

# List domains (production)
curl https://ekg-service-47249889063.europe-west6.run.app/domains
```

---

## 📋 API Reference

### Base URLs
```
Local Development: http://localhost:8000
Production:       https://ekg-service-47249889063.europe-west6.run.app
```

### Available Endpoints
| Method | Endpoint | Description | Response Time |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Health check with domain status, OpenAI connectivity, cache status | <1 second |
| `GET` | `/domains` | List all available domains with node/edge counts | <1 second |
| `GET` | `/metrics` | Performance metrics, response times, cache status | <1 second |
| `GET` | `/kg-status` | Knowledge graph file accessibility and validation | <1 second |
| `POST` | `/v1/answer` | Main Q&A endpoint with conversational support | 30s-5min |

### Endpoint Details

#### `/health` - System Health Check
```bash
# Local
curl http://localhost:8000/health

# Production
curl https://ekg-service-47249889063.europe-west6.run.app/health
```
**Response includes:**
- System status (healthy/degraded)
- OpenAI connectivity status
- Domain loading status
- Cache sizes
- Available answer modes
- Timestamp

#### `/domains` - Available Domains
```bash
# Local
curl http://localhost:8000/domains

# Production
curl https://ekg-service-47249889063.europe-west6.run.app/domains
```
**Response includes:**
- Domain IDs and names
- Knowledge graph node/edge counts
- Vector store IDs
- Domain status (loaded/error)

#### `/metrics` - Performance Metrics
```bash
# Local
curl http://localhost:8000/metrics

# Production
curl https://ekg-service-47249889063.europe-west6.run.app/metrics
```
**Response includes:**
- Total request count
- Average/max/min response times
- Cache status (query cache, hits cache)
- Timestamp

#### `/kg-status` - Knowledge Graph Status
```bash
# Local
curl http://localhost:8000/kg-status

# Production
curl https://ekg-service-47249889063.europe-west6.run.app/kg-status
```
**Response includes:**
- Data directory accessibility
- KG file existence and validation
- File sizes and JSON validity
- Error details if any

#### `/v1/answer` - Main Q&A Endpoint
```bash
# Local
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management"}'

# Production
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management"}'
```
**Response includes:**
- Unique response_id
- Markdown-formatted answer
- Source citations
- Metadata (domain, model, mode, timing)
- Conversational context flags

### Request Format
```json
{
  "question": "Your question here",
  "domain": "wealth_management",
  "response_id": "optional-previous-response-id",
  "conversation_id": "optional-conversation-id",
  "vectorstore_id": "optional-vector-store-id",
  "params": {
    "_mode": "balanced"
  }
}
```

### Response Format
```json
{
  "response_id": "uuid-string",
  "markdown": "Answer content...",
  "sources": [...],
  "meta": {
    "domain": "wealth_management",
    "vectorstore_id": "vs_...",
    "is_conversational": false,
    "previous_response_id": "uuid-string",
    "conversation_id": "conversation-id",
    "model": "gpt-5-mini",
    "mode": "balanced"
  }
}
```

---

## 🧪 Testing Methods

### Method 1: Python Testing Script
```bash
# Install dependencies
pip install requests

# Run full test suite (local)
python test_third_party.py

# Run full test suite (production)
python test_third_party.py --url https://ekg-service-47249889063.europe-west6.run.app

# Run specific tests (local)
python test_third_party.py --test health
python test_third_party.py --test domains
python test_third_party.py --test query
python test_third_party.py --test conversational
python test_third_party.py --test performance

# Run specific tests (production)
python test_third_party.py --url https://ekg-service-47249889063.europe-west6.run.app --test health
```

### Method 2: cURL Commands
```bash
# Basic query (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is OTP verification?",
    "domain": "wealth_management"
  }'

# Basic query (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is OTP verification?",
    "domain": "wealth_management"
  }'

# Conversational follow-up (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How long is the OTP valid?",
    "domain": "wealth_management",
    "response_id": "YOUR_RESPONSE_ID_HERE"
  }'

# Conversational follow-up (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How long is the OTP valid?",
    "domain": "wealth_management",
    "response_id": "YOUR_RESPONSE_ID_HERE"
  }'
```

### Method 3: JavaScript/Node.js
```bash
# Install dependencies
npm install axios

# Run JavaScript test (local)
node examples/javascript_test.js

# Run JavaScript test (production)
node examples/javascript_test.js --url https://ekg-service-47249889063.europe-west6.run.app
```

### Method 4: cURL Script
```bash
# Run comprehensive cURL tests (local)
./examples/curl_examples.sh

# Run comprehensive cURL tests (production)
./examples/curl_examples.sh --url https://ekg-service-47249889063.europe-west6.run.app
```

### Method 5: Postman Collection
1. Import `examples/postman_collection.json` into Postman
2. Set environment variable `base_url` to:
   - Local: `http://localhost:8000`
   - Production: `https://ekg-service-47249889063.europe-west6.run.app`
3. Run the collection

---

## 🔧 Integration Examples

### Python Integration
```python
import requests

class EkgApiClient:
    def __init__(self, base_url="http://localhost:8000"):
        """
        Initialize EKG API client
        
        Args:
            base_url: API base URL
                - Local: http://localhost:8000
                - Production: https://ekg-service-47249889063.europe-west6.run.app
        """
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def ask(self, question, domain="wealth_management", response_id=None, conversation_id=None):
        payload = {
            "question": question,
            "domain": domain
        }
        
        if response_id:
            payload["response_id"] = response_id
        if conversation_id:
            payload["conversation_id"] = conversation_id
        
        response = self.session.post(f"{self.base_url}/v1/answer", json=payload)
        return response.json()

# Usage - Local Development
client = EkgApiClient()  # Defaults to http://localhost:8000

# Usage - Production
# client = EkgApiClient("https://ekg-service-47249889063.europe-west6.run.app")

# Initial question
result1 = client.ask("What is OTP verification?")
print(f"Response ID: {result1['response_id']}")

# Follow-up
result2 = client.ask(
    "How long is the OTP valid?",
    response_id=result1['response_id']
)
print(f"Follow-up response: {result2['markdown']}")
```

### JavaScript Integration
```javascript
const axios = require('axios');

class EkgApiClient {
    constructor(baseUrl = 'http://localhost:8000') {
        /**
         * Initialize EKG API client
         * 
         * @param {string} baseUrl - API base URL
         *   - Local: http://localhost:8000
         *   - Production: https://ekg-service-47249889063.europe-west6.run.app
         */
        this.client = axios.create({
            baseURL: baseUrl,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    async ask(question, domain = 'wealth_management', responseId = null, conversationId = null) {
        const payload = { question, domain };
        if (responseId) payload.response_id = responseId;
        if (conversationId) payload.conversation_id = conversationId;
        
        const response = await this.client.post('/v1/answer', payload);
        return response.data;
    }
}

// Usage - Local Development
const client = new EkgApiClient();  // Defaults to http://localhost:8000

// Usage - Production
// const client = new EkgApiClient('https://ekg-service-47249889063.europe-west6.run.app');

async function example() {
    // Initial question
    const result1 = await client.ask("What is OTP verification?");
    console.log(`Response ID: ${result1.response_id}`);
    
    // Follow-up
    const result2 = await client.ask(
        "How long is the OTP valid?",
        "wealth_management",
        result1.response_id
    );
    console.log(`Follow-up: ${result2.markdown}`);
}
```

### Java Integration
```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

public class EkgApiClient {
    private final HttpClient client;
    private final ObjectMapper mapper;
    private final String baseUrl;
    
    public EkgApiClient(String baseUrl) {
        this.client = HttpClient.newHttpClient();
        this.mapper = new ObjectMapper();
        this.baseUrl = baseUrl;
    }
    
    public ApiResponse ask(String question, String domain, String responseId, String conversationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("question", question);
            payload.put("domain", domain);
            if (responseId != null) payload.put("response_id", responseId);
            if (conversationId != null) payload.put("conversation_id", conversationId);
            
            String jsonPayload = mapper.writeValueAsString(payload);
            
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/answer"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();
            
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            return mapper.readValue(response.body(), ApiResponse.class);
        } catch (Exception e) {
            throw new RuntimeException("API call failed", e);
        }
    }
}
```

---

## 🔍 Testing Scenarios

### Scenario 1: Basic Functionality
```bash
# Test all endpoints (local)
curl http://localhost:8000/health
curl http://localhost:8000/domains
curl http://localhost:8000/metrics
curl http://localhost:8000/kg-status
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management"}'

# Test all endpoints (production)
curl https://ekg-service-47249889063.europe-west6.run.app/health
curl https://ekg-service-47249889063.europe-west6.run.app/domains
curl https://ekg-service-47249889063.europe-west6.run.app/metrics
curl https://ekg-service-47249889063.europe-west6.run.app/kg-status
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management"}'
```

### Scenario 2: Multi-Domain Testing
```bash
# Test wealth_management domain (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is redemption?", "domain": "wealth_management"}'

# Test APF domain (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is project approval?", "domain": "apf"}'

# Test wealth_management domain (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is redemption?", "domain": "wealth_management"}'

# Test APF domain (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is project approval?", "domain": "apf"}'
```

### Scenario 3: Conversational Flow
```bash
# Step 1: Initial question (local)
RESPONSE=$(curl -s -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP verification?", "domain": "wealth_management"}')

# Extract response_id
RESPONSE_ID=$(echo $RESPONSE | jq -r '.response_id')
echo "Response ID: $RESPONSE_ID"

# Step 2: Follow-up (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"How long is the OTP valid?\", \"domain\": \"wealth_management\", \"response_id\": \"$RESPONSE_ID\"}"

# Step 1: Initial question (production)
RESPONSE=$(curl -s -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP verification?", "domain": "wealth_management"}')

# Extract response_id
RESPONSE_ID=$(echo $RESPONSE | jq -r '.response_id')
echo "Response ID: $RESPONSE_ID"

# Step 2: Follow-up (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"How long is the OTP valid?\", \"domain\": \"wealth_management\", \"response_id\": \"$RESPONSE_ID\"}"
```

### Scenario 4: Error Handling
```bash
# Test invalid domain (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Test question", "domain": "invalid_domain"}'

# Test malformed request (local)
curl -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Test question"}'

# Test invalid domain (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Test question", "domain": "invalid_domain"}'

# Test malformed request (production)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Test question"}'
```

---

## 🧪 Comprehensive Endpoint Testing

### All Available Endpoints for Testing

#### 1. Health Check Endpoint
```bash
# Local
curl -v http://localhost:8000/health

# Production
curl -v https://ekg-service-47249889063.europe-west6.run.app/health
```
**Expected Response:**
- Status: 200 OK
- Content: JSON with system status, domains, OpenAI connectivity
- Response Time: <1 second

#### 2. Domains Endpoint
```bash
# Local
curl -v http://localhost:8000/domains

# Production
curl -v https://ekg-service-47249889063.europe-west6.run.app/domains
```
**Expected Response:**
- Status: 200 OK
- Content: JSON with available domains (wealth_management, apf)
- Response Time: <1 second

#### 3. Metrics Endpoint
```bash
# Local
curl -v http://localhost:8000/metrics

# Production
curl -v https://ekg-service-47249889063.europe-west6.run.app/metrics
```
**Expected Response:**
- Status: 200 OK
- Content: JSON with performance metrics, cache status
- Response Time: <1 second

#### 4. Knowledge Graph Status Endpoint
```bash
# Local
curl -v http://localhost:8000/kg-status

# Production
curl -v https://ekg-service-47249889063.europe-west6.run.app/kg-status
```
**Expected Response:**
- Status: 200 OK
- Content: JSON with KG file accessibility and validation
- Response Time: <1 second

#### 5. Answer Endpoint (Main Q&A)
```bash
# Local - Basic Query
curl -v -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP verification?", "domain": "wealth_management"}'

# Production - Basic Query
curl -v -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP verification?", "domain": "wealth_management"}'

# Local - Conversational Query
curl -v -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "How long is OTP valid?", "domain": "wealth_management", "response_id": "YOUR_RESPONSE_ID"}'

# Production - Conversational Query
curl -v -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "How long is OTP valid?", "domain": "wealth_management", "response_id": "YOUR_RESPONSE_ID"}'
```
**Expected Response:**
- Status: 200 OK
- Content: JSON with response_id, markdown answer, sources, metadata
- Response Time: 30 seconds - 5 minutes (depending on mode)

### Answer Modes Testing
```bash
# Concise Mode (GPT-5-nano, ~30-45 seconds)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management", "params": {"_mode": "concise"}}'

# Balanced Mode (GPT-5-mini, ~45-60 seconds)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management", "params": {"_mode": "balanced"}}'

# Deep Mode (GPT-5, ~2-5 minutes)
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP?", "domain": "wealth_management", "params": {"_mode": "deep"}}'
```

### Domain Testing
```bash
# Wealth Management Domain
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is mutual fund redemption?", "domain": "wealth_management"}'

# APF Domain
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is project approval process?", "domain": "apf"}'
```

---

## 📊 Response Validation

### Expected Response Structure
```json
{
  "response_id": "uuid-string",
  "markdown": "Answer content...",
  "sources": [...],
  "meta": {
    "domain": "wealth_management",
    "vectorstore_id": "vs_...",
    "is_conversational": false,
    "model": "gpt-5-mini",
    "mode": "balanced"
  }
}
```

### Validation Checklist
- [ ] `response_id` is present and valid UUID
- [ ] `markdown` contains answer content
- [ ] `meta.domain` matches request domain
- [ ] `meta.is_conversational` is boolean
- [ ] `meta.model` is present
- [ ] `meta.mode` is one of: concise, balanced, deep

---

## 🚨 Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Check if server is running
curl http://localhost:8000/health
# If fails, start server:
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**2. 401 Unauthorized**
```bash
# Check OpenAI API key
export OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**3. 500 Internal Server Error**
```bash
# Check server logs
# Usually indicates missing dependencies or configuration
```

**4. 400 Bad Request**
```bash
# Check request format
# Ensure Content-Type: application/json
# Validate required fields: question, domain
```

### Debug Commands
```bash
# Check server status
curl -v http://localhost:8000/health

# Test with verbose output
curl -v -X POST http://localhost:8000/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Test", "domain": "wealth_management"}'

# Check response headers
curl -I http://localhost:8000/health
```

---

## 📱 Mobile/App Integration

### React Native
```javascript
import axios from 'axios';

const ekgApi = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});

export const askQuestion = async (question, domain = 'wealth_management', responseId = null) => {
  try {
    const payload = { question, domain };
    if (responseId) payload.response_id = responseId;
    
    const response = await ekgApi.post('/v1/answer', payload);
    return response.data;
  } catch (error) {
    throw new Error(`API call failed: ${error.message}`);
  }
};
```

### Flutter
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class EkgApiClient {
  static const String baseUrl = 'http://localhost:8000';
  
  static Future<Map<String, dynamic>> askQuestion(
    String question, 
    String domain, 
    String? responseId
  ) async {
    final payload = {
      'question': question,
      'domain': domain,
      if (responseId != null) 'response_id': responseId,
    };
    
    final response = await http.post(
      Uri.parse('$baseUrl/v1/answer'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(payload),
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load data: ${response.statusCode}');
    }
  }
}
```

---

## 🔧 Production Testing

### Load Testing with Apache Bench
```bash
# Install Apache Bench
# Ubuntu: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Test health endpoint
ab -n 100 -c 10 http://localhost:8000/health

# Test answer endpoint
ab -n 50 -c 5 -p test_payload.json -T application/json http://localhost:8000/v1/answer
```

### Test Payload File (test_payload.json)
```json
{
  "question": "What is OTP verification?",
  "domain": "wealth_management"
}
```

---

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] Server is running on correct port
- [ ] OpenAI API key is configured
- [ ] Knowledge graphs are loaded
- [ ] Network connectivity is working

### Basic Functionality
- [ ] Health endpoint responds
- [ ] Domains endpoint lists available domains
- [ ] Answer endpoint returns valid responses
- [ ] Response includes required fields

### Conversational Features
- [ ] response_id is included in responses
- [ ] Follow-up queries work with response_id
- [ ] conversation_id works for threading
- [ ] Metadata includes conversational flags

### Error Handling
- [ ] Invalid domains return 400
- [ ] Malformed requests return 400
- [ ] Server errors return 500
- [ ] Network timeouts are handled

### Performance
- [ ] Response times are acceptable
- [ ] Concurrent requests work
- [ ] Memory usage is stable
- [ ] No memory leaks

---

## 🎯 Ready for Integration

Your EKG Agent API is ready for third-party integration with:
- ✅ RESTful API endpoints
- ✅ JSON request/response format
- ✅ Conversational support
- ✅ Multi-domain capability
- ✅ Comprehensive error handling
- ✅ Production-ready performance

**Start testing and integrating!** 🚀
