# Environment Variables Setup Guide

## 🔐 Generated Secure Credentials

### Admin Dashboard Login
- **Username:** `admin`
- **Password:** `Decisivis_Admin_0c77cc4e_2025!`
- **Login URL:** https://decisivis-dashboard.vercel.app/login

### Model Access Password
- **Password:** `Model_b50915d2b58eadbc_2025!`
- Use this when making prediction API calls

## 📦 Deployment Architecture

### Frontend (Vercel)
- **URL:** https://decisivis-dashboard.vercel.app
- **Technology:** Next.js 15 Dashboard
- **Location:** `/decisivis-dashboard`

### Backend (Railway)
- **URL:** https://web-production-d74c1.up.railway.app
- **Technology:** Python FastAPI
- **Location:** `/api`

## 🚀 Vercel Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add these variables:

```bash
NEXTAUTH_URL=https://decisivis-dashboard.vercel.app
NEXTAUTH_SECRET=cebae64f7b9394cc715a4280dae8f45c7dd65918bb17753d96f80d98aa8a7dcd
PYTHON_API_URL=https://web-production-d74c1.up.railway.app
API_KEY=dk_57789019680181655a16f720697aa9a128fae577897975f6
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$PbtY.hrvt2OqOAfJucNRbeNzSHAXsF/QTOM1sO7/Sloa7lta4mbve
GEMINI_API_KEY=[YOUR_GEMINI_KEY]
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.1
MODEL_ACCESS_PASSWORD=Model_b50915d2b58eadbc_2025!
```

## 🚂 Railway Setup

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Go to Variables tab
4. Add these variables:

```bash
DATABASE_URL=[YOUR_NEON_DATABASE_URL]
API_KEY=dk_57789019680181655a16f720697aa9a128fae577897975f6
JWT_SECRET=404c48eceb64fa246df173eca68441582ce690fbe79a21b417477252a0acc1bc
MODEL_ACCESS_PASSWORD=Model_b50915d2b58eadbc_2025!
KV_REST_API_URL=[YOUR_UPSTASH_REDIS_URL]
KV_REST_API_TOKEN=[YOUR_UPSTASH_REDIS_TOKEN]
GEMINI_API_KEY=[YOUR_GEMINI_KEY]
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.1
PYTHON_VERSION=3.11
ALLOWED_ORIGINS=https://decisivis-dashboard.vercel.app,http://localhost:3000
```

## 🔑 Required External Services

### 1. Neon Database (PostgreSQL)
- Sign up at https://neon.tech
- Create a database
- Copy the `DATABASE_URL` from dashboard

### 2. Upstash Redis
- Sign up at https://upstash.com
- Create a Redis database
- Copy `REST API URL` and `REST API Token`

### 3. Google Gemini AI
- Get API key from https://makersuite.google.com/app/apikey
- Free tier: 60 requests per minute

## 📝 Local Development

### Frontend (Next.js)
```bash
cd decisivis-dashboard
npm install
npm run dev  # Runs on http://localhost:3000
```

### Backend (Python)
```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 🔒 Security Notes

1. **Never commit `.env` files to Git**
2. **Rotate API keys regularly**
3. **Use strong passwords for admin access**
4. **Enable 2FA on Vercel and Railway accounts**
5. **Monitor API usage on all services**

## 📊 Service Limits

### Free Tier Limits:
- **Vercel:** 100GB bandwidth, 100 hours build time
- **Railway:** $5 credit or 500 hours
- **Neon:** 3GB storage, 1 compute hour/day
- **Upstash:** 10,000 commands/day
- **Gemini:** 60 requests/minute

## 🆘 Troubleshooting

### Vercel Deployment Fails
- Check environment variables are set
- Verify no Python files in deployment
- Check `.vercelignore` is working

### Railway API Not Responding
- Check Railway logs for errors
- Verify DATABASE_URL is correct
- Ensure Python version is 3.11

### Authentication Issues
- Clear browser cookies
- Verify NEXTAUTH_SECRET matches
- Check ADMIN_PASSWORD_HASH is correct

### Database Connection Failed
- Verify DATABASE_URL includes `?sslmode=require`
- Check Neon database is active
- Ensure IP is not blocked

## 📧 Support

For issues, check:
1. Vercel deployment logs
2. Railway deployment logs
3. Browser console for errors
4. Network tab for API failures