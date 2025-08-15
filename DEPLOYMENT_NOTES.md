# 🚀 Decisivis Engine - Complete Deployment Notes

## 📅 Last Updated: August 15, 2025

## 🌐 Live URLs
- **Production Dashboard**: https://www.decisivis.com
- **Alternative URL**: https://decisivis-engine.vercel.app
- **Python API**: https://web-production-d74c1.up.railway.app

## 🔐 Admin Login Credentials
- **Dashboard URL**: https://www.decisivis.com/login
- **Username**: `admin`
- **Password**: `Decisivis_Admin_0c77cc4e_2025!`

## 🔑 Model Access Password
- **Password**: `Model_b50915d2b58eadbc_2025!`
- Use this when making prediction API calls

---

## 🚂 RAILWAY ENVIRONMENT VARIABLES
**Platform**: https://railway.app/dashboard

### ✅ Already Set in Railway:
```
DATABASE_URL=postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=AIzaSyBnHM9XMqYHJqevxqBqZJ6LFWkm03ugogw
sslmode=require
```

### ⚠️ Need to Add to Railway:
Click "New Variable" for each of these:

```
REDIS_URL=rediss://default:Acc5AAIjcDEyOGRkYmVhYzZkNzk0OWFlYTU5OTkxNDZhNTFhNGI5M3AxMA@summary-goat-51001.upstash.io:6379

KV_REST_API_URL=https://summary-goat-51001.upstash.io

KV_REST_API_TOKEN=Acc5AAIjcDEyOGRkYmVhYzZkNzk0OWFlYTU5OTkxNDZhNTFhNGI5M3AxMA

QSTASH_TOKEN=eyJVc2VySUQiOiIwMTkzNDZlNi0yYmMyLTQ3NTItOGY2MC04ODExNjZhZjRmMWIiLCJQYXNzd29yZCI6IjRiY2ZlNjBjYTQ2MzRlZmQ5NTU1MzVkNjMxYzljOWIwIn0=

QSTASH_URL=https://qstash.upstash.io

API_KEY=dk_57789019680181655a16f720697aa9a128fae577897975f6

JWT_SECRET=404c48eceb64fa246df173eca68441582ce690fbe79a21b417477252a0acc1bc

MODEL_ACCESS_PASSWORD=Model_b50915d2b58eadbc_2025!

GEMINI_MODEL=gemini-2.5-flash

GEMINI_TEMPERATURE=0.1

PYTHON_VERSION=3.11

ALLOWED_ORIGINS=https://www.decisivis.com,https://decisivis-engine.vercel.app,http://localhost:3000

ENVIRONMENT=production
```

---

## 🔺 VERCEL ENVIRONMENT VARIABLES
**Platform**: https://vercel.com/dashboard

### Add ALL of these to Vercel (Settings → Environment Variables):

```
NEXTAUTH_URL=https://www.decisivis.com

NEXTAUTH_SECRET=cebae64f7b9394cc715a4280dae8f45c7dd65918bb17753d96f80d98aa8a7dcd

PYTHON_API_URL=https://web-production-d74c1.up.railway.app

API_KEY=dk_57789019680181655a16f720697aa9a128fae577897975f6

ADMIN_USERNAME=admin

ADMIN_PASSWORD_HASH=$2b$10$PbtY.hrvt2OqOAfJucNRbeNzSHAXsF/QTOM1sO7/Sloa7lta4mbve

GEMINI_API_KEY=AIzaSyBnHM9XMqYHJqevxqBqZJ6LFWkm03ugogw

GEMINI_MODEL=gemini-2.5-flash

GEMINI_TEMPERATURE=0.1

MODEL_ACCESS_PASSWORD=Model_b50915d2b58eadbc_2025!
```

---

## 📊 Database Connections

### PostgreSQL (Neon)
```
Host: ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech
Database: neondb
User: neondb_owner
Password: npg_0p2JovChjXZy
Connection String: postgres://neondb_owner:npg_0p2JovChjXZy@ep-misty-river-aba2zdk3-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### Redis Cache (Upstash)
```
URL: summary-goat-51001.upstash.io
REST API URL: https://summary-goat-51001.upstash.io
REST API Token: Acc5AAIjcDEyOGRkYmVhYzZkNzk0OWFlYTU5OTkxNDZhNTFhNGI5M3AxMA
Redis URL: rediss://default:Acc5AAIjcDEyOGRkYmVhYzZkNzk0OWFlYTU5OTkxNDZhNTFhNGI5M3AxMA@summary-goat-51001.upstash.io:6379
```

### QStash (Background Jobs)
```
URL: https://qstash.upstash.io
Token: eyJVc2VySUQiOiIwMTkzNDZlNi0yYmMyLTQ3NTItOGY2MC04ODExNjZhZjRmMWIiLCJQYXNzd29yZCI6IjRiY2ZlNjBjYTQ2MzRlZmQ5NTU1MzVkNjMxYzljOWIwIn0=
Current Signing Key: sig_5crmkXnKkWCXA85PABaT5kB7DiuY
Next Signing Key: sig_76gw3J718KgQeT3nR7nfu6aVpSPd
```

### Vector Database (Upstash)
```
URL: https://genuine-hamster-95494-us1-vector.upstash.io
Token: ABkFMGdlbnVpbmUtaGFtc3Rlci05NTQ5NC11czFhZG1pbk1tWmxaRFl3TjJZdE1UY3dZaTAwTjJFMkxXRmlNRFl0T0RJeVlqY3lObU16TkRZMw==
Read-Only Token: ABkIMGdlbnVpbmUtaGFtc3Rlci05NTQ5NC11czFyZWFkb25seU0yTTFORGcwTldVdE9EVmtNQzAwWTJOa0xXSmxPRFl0WWpGbU1qZGxOR0UxT1dZdw==
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│                     │         │                     │
│   Vercel (Next.js)  │ ──API─→ │  Railway (Python)   │
│   www.decisivis.com │         │    FastAPI Server   │
│                     │         │                     │
└─────────────────────┘         └──────┬──────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │                             │
                  ┌─────▼─────┐              ┌───────▼──────┐
                  │   Neon    │              │   Upstash    │
                  │ PostgreSQL│              │  Redis/Queue │
                  └───────────┘              └──────────────┘
```

---

## 🔧 Quick Commands

### Deploy to Railway
```bash
git push origin main
# Railway auto-deploys from GitHub
```

### Deploy to Vercel
```bash
git push origin main
# Vercel auto-deploys from GitHub
```

### Test Locally
```bash
# Frontend (Next.js)
cd decisivis-dashboard
npm run dev  # http://localhost:3000

# Backend (Python)
cd api
uvicorn main:app --reload --port 8000
```

---

## ⚠️ Important Security Notes

1. **NEVER** commit these credentials to Git
2. **NEVER** share the ADMIN_PASSWORD in plain text
3. **ALWAYS** use environment variables, not hardcoded values
4. **ROTATE** API keys every 90 days
5. **MONITOR** database usage to stay within free tiers

---

## 📞 Support Contacts

- **Vercel Status**: https://www.vercel-status.com
- **Railway Status**: https://status.railway.app
- **Neon Status**: https://status.neon.tech
- **Upstash Status**: https://status.upstash.com

---

## 🎯 Next Steps

1. ✅ Add remaining environment variables to Railway
2. ✅ Add all environment variables to Vercel
3. ✅ Test login at https://www.decisivis.com/login
4. ✅ Verify API health at https://web-production-d74c1.up.railway.app/health
5. ✅ Make a test prediction

---

## 📝 Notes

- Gemini 2.5 Flash model is configured for cost-efficient predictions
- Database has 16,102 matches already loaded
- Redis cache improves response times to < 100ms
- QStash handles background retraining jobs
- All services are on free tiers with these limits:
  - Vercel: 100GB bandwidth/month
  - Railway: $5 credit or 500 hours
  - Neon: 3GB storage, 1 compute hour/day
  - Upstash: 10,000 commands/day

---

Generated: August 15, 2025
Last Deployment: fec9c63 (fix: Remove functions config to fix Vercel deployment)