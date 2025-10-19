# 🚀 EKG Agent API - Third-Party Integration Package

**Complete integration package for EKG Agent API**

---

## 📋 **What's Included**

### **📚 Documentation**
- `INTEGRATION_GUIDE.md` - Complete testing and integration guide
- `CLIENT_INTEGRATION.md` - Client SDK examples and patterns
- `CONVERSATIONAL_FEATURES.md` - Conversational features documentation
- `README.md` - Project overview and quick start

### **🧪 Testing Tools**
- `test_third_party.py` - Python testing script
- `test_kg_access.py` - Production testing script
- `examples/javascript_test.js` - JavaScript integration example
- `examples/postman_collection.json` - Postman collection

---

## 🚀 **Quick Start**

### **1. Production API URL**
```
https://ekg-service-47249889063.europe-west6.run.app
```

### **2. Test Connectivity**
```bash
# Health check
curl https://ekg-service-47249889063.europe-west6.run.app/health

# List domains
curl https://ekg-service-47249889063.europe-west6.run.app/domains
```

### **3. Basic Query**
```bash
curl -X POST https://ekg-service-47249889063.europe-west6.run.app/v1/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "What is OTP verification?", "domain": "wealth_management"}'
```

---

## 📖 **Available Endpoints**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/health` | GET | System health check | <1 second |
| `/domains` | GET | List available domains | <1 second |
| `/metrics` | GET | Performance metrics | <1 second |
| `/kg-status` | GET | Knowledge graph status | <1 second |
| `/v1/answer` | POST | Main Q&A endpoint | 30s-5min |

---

## 🎯 **Available Domains**

- **wealth_management**: Mutual funds, orders, customer onboarding
- **apf**: APF process data and workflows

---

## 🔧 **Answer Modes**

- **concise**: GPT-5-nano (~30-45 seconds) - Fast, focused answers
- **balanced**: GPT-5-mini (~45-60 seconds) - Detailed answers
- **deep**: GPT-5 (~2-5 minutes) - Comprehensive analysis

---

## 💬 **Conversational Features**

- **Response ID tracking**: Each response includes a unique `response_id`
- **Conversational context**: Use `response_id` or `conversation_id` in follow-up questions
- **Context awareness**: Maintains conversation history across requests

---

## 📚 **Next Steps**

1. **Read the documentation**: Start with `INTEGRATION_GUIDE.md`
2. **Test the API**: Use the provided testing scripts
3. **Choose your integration method**: Python, JavaScript, or other languages
4. **Implement conversational features**: Use response_id for context
5. **Deploy and monitor**: Use the metrics endpoint for monitoring

---

## 🆘 **Support**

- **Documentation**: All guides include troubleshooting sections
- **Testing**: Use the provided testing scripts to verify functionality
- **Examples**: Multiple integration examples for different languages

---

**Ready to integrate!** 🚀

*This package contains everything you need to integrate with the EKG Agent API.*
