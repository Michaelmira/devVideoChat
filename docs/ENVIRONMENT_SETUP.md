# Environment Variables Setup for Video Chat App

## Required Environment Variables

### Basic Configuration
```env
# Flask Configuration
FLASK_APP=src/app.py
FLASK_DEBUG=1

# Database
DATABASE_URL=postgresql://username:password@localhost/dbname

# Frontend/Backend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# JWT Secret
JWT_SECRET_KEY=your-super-secret-jwt-key-here
```

### VideoSDK Configuration
```env
# Get these from https://videosdk.live/
VIDEOSDK_API_KEY=your-videosdk-api-key
VIDEOSDK_SECRET_KEY=your-videosdk-secret-key
```

### Stripe Configuration (for $3/month subscriptions)
```env
# Get these from https://stripe.com/
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... # Create a $3/month recurring price in Stripe
```

### OAuth Configuration

#### Google OAuth (Regular)
```env
# Create OAuth app at https://console.developers.google.com/
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### GitHub OAuth (Regular) 
```env
# Create OAuth app at https://github.com/settings/applications/new
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### MVP OAuth (for Home Page Quick Login)
```env
# Separate OAuth apps for MVP login (optional - can reuse regular ones)
MVP_GOOGLE_CLIENT_ID=your-mvp-google-client-id.apps.googleusercontent.com
MVP_GOOGLE_CLIENT_SECRET=your-mvp-google-client-secret

MVP_GITHUB_CLIENT_ID=your-mvp-github-client-id
MVP_GITHUB_CLIENT_SECRET=your-mvp-github-client-secret
```

### Email Configuration (for verification codes)
```env
# Configure based on your email provider
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Cloudinary Configuration (for file uploads)
```env
# Get these from https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## OAuth Redirect URIs Setup

### Google OAuth Console
Add these redirect URIs to your Google OAuth app:
- `http://localhost:3001/api/auth/google/callback` (regular OAuth)
- `http://localhost:3001/api/auth/mvp/google/callback` (MVP OAuth)
- `https://yourdomain.com/api/auth/google/callback` (production)
- `https://yourdomain.com/api/auth/mvp/google/callback` (production MVP)

### GitHub OAuth Settings
Add these redirect URIs to your GitHub OAuth app:
- `http://localhost:3001/api/authorize/github` (regular OAuth)
- `http://localhost:3001/api/auth/mvp/github/callback` (MVP OAuth)
- `https://yourdomain.com/api/authorize/github` (production)
- `https://yourdomain.com/api/auth/mvp/github/callback` (production MVP)

## Stripe Webhook Setup

1. In your Stripe dashboard, create a webhook endpoint pointing to:
   - Local: `http://localhost:3001/api/webhook`
   - Production: `https://yourdomain.com/api/webhook`

2. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Production Environment

For production deployment (e.g., Render, Heroku):

1. Set all environment variables in your hosting platform
2. Update redirect URIs with your production domain
3. Use production Stripe keys and webhook endpoints
4. Set `FLASK_DEBUG=0` for production

## VideoSDK Limits

- **Free tier**: 50 minutes per session
- **Premium tier**: 6 hours (360 minutes) per session
- Sessions auto-expire after 6 hours regardless of tier

## Default User Roles

- All new users start with `subscription_status='free'`
- Premium users have `subscription_status='premium'`
- Session limits are enforced based on subscription status 