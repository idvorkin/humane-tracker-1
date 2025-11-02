#!/bin/bash

echo "🚀 Deploying Humane Tracker to Surge"
echo "====================================="
echo ""

# Check if Surge CLI is installed
if ! command -v surge &> /dev/null; then
    echo "❌ Surge CLI not found. Installing..."
    npm install -g surge
fi

# Build the production version
echo "📦 Building production version..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix any errors and try again."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

# Deploy to Surge
echo "🌐 Deploying to Surge..."
echo ""
echo "Note: If this is your first time, you'll need to:"
echo "  1. Enter your email"
echo "  2. Create a password (or enter existing password)"
echo ""

cd build
surge --domain humane-tracker.surge.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your app is now live at:"
    echo "   https://humane-tracker.surge.sh"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
