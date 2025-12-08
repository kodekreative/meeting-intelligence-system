#!/bin/bash

echo "🚀 Starting Meeting Intelligence System with Calendar Integration"
echo ""
echo "This will start:"
echo "  - API Server on http://localhost:3001"
echo "  - Web App on http://localhost:3000"
echo ""
echo "Calendar page will be at:"
echo "  👉 http://localhost:3000/settings/calendar-simple"
echo ""
echo "Starting servers..."
echo ""

# Start from the root directory
cd "$(dirname "$0")"

# Run both servers
pnpm dev
