# 🔒 Decisivis Dashboard - Private Deployment Guide

## 📦 Repository: Decisivis Dashboard (Frontend)

**⚠️ RESTRICTED ACCESS - INTERNAL USE ONLY**

This repository contains the proprietary Next.js dashboard for the Decisivis prediction system.

### 🌐 Private URLs
- **Production**: https://www.decisivis.com
- **Alternative**: https://decisivis-engine.vercel.app

### 🔐 Access Control
- **Login URL**: https://www.decisivis.com/login
- **Authorization**: Credentials distributed internally only
- **Security**: All access is logged and monitored

---

## 🔺 Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Authentication
NEXTAUTH_URL=https://www.decisivis.com
NEXTAUTH_SECRET=cebae64f7b9394cc715a4280dae8f45c7dd65918bb17753d96f80d98aa8a7dcd

# API Connection
PYTHON_API_URL=https://web-production-d74c1.up.railway.app
API_KEY=dk_57789019680181655a16f720697aa9a128fae577897975f6

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$PbtY.hrvt2OqOAfJucNRbeNzSHAXsF/QTOM1sO7/Sloa7lta4mbve

# AI Configuration
GEMINI_API_KEY=AIzaSyBnHM9XMqYHJqevxqBqZJ6LFWkm03ugogw
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TEMPERATURE=0.1

# Model Access
MODEL_ACCESS_PASSWORD=Model_b50915d2b58eadbc_2025!
```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📝 Project Structure

```
decisivis-dashboard/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions
├── public/          # Static assets
├── package.json     # Dependencies
└── vercel.json      # Vercel configuration
```

---

## 🔗 Related Repository

**API Backend**: https://github.com/AsipreVerse/decisivis-api
- Deployed on Railway
- FastAPI Python backend
- Handles predictions and model training

---

## 📊 Features

- ✅ Real-time match predictions
- ✅ Model training interface
- ✅ Data management dashboard
- ✅ Performance analytics
- ✅ Secure admin authentication

---

## 🚨 Troubleshooting

### Build Errors
- Ensure all environment variables are set
- Check Node.js version (18.x or higher)
- Clear `.next` folder and rebuild

### Authentication Issues
- Verify NEXTAUTH_SECRET is set
- Check ADMIN_PASSWORD_HASH matches
- Clear browser cookies

### API Connection Failed
- Verify PYTHON_API_URL is correct
- Check API_KEY matches backend
- Ensure Railway API is running

---

## 📞 Support

- **Vercel Status**: https://www.vercel-status.com
- **Repository Issues**: https://github.com/AsipreVerse/decisivis-engine/issues

---

Last Updated: August 15, 2025