#!/bin/bash

echo "🚀 Deploying Habit Tracker to Firebase Hosting"
echo "============================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
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

# Check if user is logged in to Firebase
echo "🔐 Checking Firebase authentication..."
firebase projects:list &> /dev/null

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  You need to login to Firebase first."
    echo "Please run: firebase login"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

echo "✅ Firebase authentication verified!"
echo ""

# Deploy to Firebase Hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your app is now live at:"
    echo "   https://habit-tracker-b9ab9.web.app"
    echo "   https://habit-tracker-b9ab9.firebaseapp.com"
    echo ""
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi