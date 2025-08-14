#!/bin/bash

echo "=========================================="
echo "DECISIVIS CORE - VERCEL DEPLOYMENT"
echo "Temperature: 0.1 (Maximum Precision)"
echo "=========================================="
echo ""

# Navigate to dashboard directory
cd decisivis-dashboard

# Build the project
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed! Please fix errors before deploying."
    exit 1
fi

echo ""
echo "Build successful!"
echo ""
echo "=========================================="
echo "DEPLOYMENT CHECKLIST"
echo "=========================================="
echo ""
echo "Before deploying, ensure you have:"
echo ""
echo "1. [ ] Created a Vercel account"
echo "2. [ ] Installed Vercel CLI: npm i -g vercel"
echo "3. [ ] Obtained Gemini API key from https://makersuite.google.com/app/apikey"
echo ""
echo "In Vercel Dashboard, add these environment variables:"
echo ""
echo "   GEMINI_API_KEY=your-api-key-here"
echo "   DATABASE_URL=postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
echo "   GEMINI_MODEL=gemini-pro"
echo "   GEMINI_TEMPERATURE=0.1"
echo ""
echo "=========================================="
echo "READY TO DEPLOY"
echo "=========================================="
echo ""
echo "To deploy, run:"
echo "   cd decisivis-dashboard"
echo "   vercel --prod"
echo ""
echo "After deployment:"
echo "1. Check Gemini Agent tab shows 'Active' status"
echo "2. Test with 'Run Gemini Analysis' button"
echo "3. Monitor for 70% accuracy target"
echo ""
echo "Current accuracy: 53.3%"
echo "Target accuracy: 70%+"
echo ""