#!/bin/bash
# Script to view environment variables (run locally, not in production)

echo "=========================================="
echo "Environment Variables Reference"
echo "=========================================="
echo ""

if [ -f .env ]; then
    echo "📄 Found .env file"
    echo ""
    echo "Variables found in .env:"
    echo "----------------------------------------"
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Show key and mask value
        if [ -n "$value" ]; then
            # Show first 10 chars and last 4 chars of value
            masked=$(echo "$value" | sed 's/\(.\{10\}\).*\(.\{4\}\)/\1...\2/')
            echo "$key=$masked"
        else
            echo "$key=(empty)"
        fi
    done < .env
    echo ""
else
    echo "⚠️  No .env file found"
    echo ""
fi

echo "=========================================="
echo "Required Variables for Google Cloud:"
echo "=========================================="
echo ""
echo "1. DATABASE_URL"
echo "   Format: postgresql://user:password@host:port/database"
echo ""
echo "2. OPENAI_API_KEY"
echo "   Format: sk-..."
echo ""
echo "=========================================="
echo ""
echo "To view full values (LOCALLY ONLY):"
echo "  cat .env"
echo ""
echo "To copy values for Google Cloud:"
echo "  Use the values from your .env file"
echo ""

