# Vercel Deployment Guide for Decisivis Dashboard

## Prerequisites
- Vercel account (free tier is sufficient)
- Gemini API key from Google AI Studio
- Database URL from Neon (PostgreSQL)

## Step 1: Add Gemini API Key to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following variable:
   ```
   Name: GEMINI_API_KEY
   Value: [Your API key from https://makersuite.google.com/app/apikey]
   Environment: Production, Preview, Development
   ```

## Step 2: Add Database URL

1. In the same Environment Variables section, add:
   ```
   Name: DATABASE_URL
   Value: postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
   Environment: Production, Preview, Development
   ```

## Step 3: Configure Gemini Settings

Add these optional settings for fine-tuning:
```
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.1
GEMINI_MAX_TOKENS=2048
```

## Step 4: Deploy from Dashboard Directory

```bash
cd /Users/evanuelrodrigues/Desktop/Project\ EV/decisivis-core/decisivis-dashboard
vercel --prod
```

## Step 5: Verify Deployment

1. Check the deployment URL provided by Vercel
2. Navigate to the "Gemini Agent" tab
3. You should see "Gemini Pro active" status if API key is configured correctly
4. Test with "Run Gemini Analysis" button

## Environment Variables Summary

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI Studio API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GEMINI_MODEL` | Model name (default: gemini-pro) | No |
| `GEMINI_TEMPERATURE` | Precision control (default: 0.1) | No |
| `NODE_ENV` | Environment (production) | Auto-set |

## Monitoring & Logs

1. View logs: Vercel Dashboard → Functions → View Logs
2. Monitor API usage: Google AI Studio → API Keys → View Usage
3. Database metrics: Neon Dashboard → Monitoring

## Troubleshooting

### Gemini Not Enabled
- Verify GEMINI_API_KEY is set in Vercel
- Check API key is valid at https://makersuite.google.com/app/apikey
- Ensure no quotes around the API key value

### Database Connection Failed
- Check DATABASE_URL format
- Verify SSL mode is set to 'require'
- Test connection from Neon dashboard

### Build Failures
- Run `npm run build` locally first
- Check for TypeScript errors
- Ensure all dependencies are in package.json

## Production Checklist

- [x] Dashboard shows real data only (16,102 matches)
- [x] Model accuracy displayed (53.3% current)
- [x] Gemini integration with temperature 0.1
- [x] 5 key features following 80/20 principle
- [x] Automated retraining script ready
- [ ] Add GEMINI_API_KEY to Vercel
- [ ] Deploy to production
- [ ] Test live predictions
- [ ] Monitor for 70% accuracy target

## Next Steps After Deployment

1. Monitor prediction accuracy daily
2. Check Gemini suggestions after 100 predictions
3. Run automated retraining when improvements detected
4. Target: Reach 70% accuracy through continuous learning