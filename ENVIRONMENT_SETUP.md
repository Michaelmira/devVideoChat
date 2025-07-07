# Environment Setup

## Stripe Configuration Issue Fixed

### Problem
The application was experiencing two main Stripe-related errors:
1. `401 Unauthorized` error when accessing Stripe wallet config
2. `500 Internal Server Error` when creating subscriptions due to missing payment_intent

### Solution
1. **Backend Fix**: Updated the `create-subscription` endpoint in `src/api/routes.py` to properly handle payment_intent creation with better error handling and fallback logic.

2. **Environment Configuration**: The application requires proper environment variables to be set.

### Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Backend Configuration
BACKEND_URL=https://your-backend-url.com
FRONTEND_URL=http://localhost:3000

# Stripe Configuration (Required)
# Get these from your Stripe Dashboard: https://dashboard.stripe.com/apikeys
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PRICE_ID=price_your_stripe_price_id_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# VideoSDK Configuration
VIDEOSDK_API_KEY=your_videosdk_api_key_here
VIDEOSDK_SECRET_KEY=your_videosdk_secret_key_here

# Database Configuration
DATABASE_URL=your_database_url_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
```

### How to Get Stripe Keys

1. **Sign up/Login to Stripe**: Go to https://stripe.com and create an account
2. **Get API Keys**: Go to https://dashboard.stripe.com/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`) to `REACT_APP_STRIPE_PUBLIC_KEY`
   - Copy your **Secret key** (starts with `sk_test_`) to `STRIPE_SECRET_KEY`
3. **Create a Product**: Go to https://dashboard.stripe.com/products
   - Create a new product for your $3/month subscription
   - Copy the **Price ID** (starts with `price_`) to `STRIPE_PRICE_ID`
4. **Set up Webhooks**: Go to https://dashboard.stripe.com/webhooks
   - Add your endpoint URL
   - Copy the **Webhook Secret** to `STRIPE_WEBHOOK_SECRET`

### Testing
After setting up the environment variables:
1. Restart your development server
2. Try creating a subscription again
3. The payment flow should now work properly

The 401 error should be resolved once the `REACT_APP_STRIPE_PUBLIC_KEY` is properly set, and the 500 error should be resolved with the backend fixes.

---

## Original Environment Setup Instructions

For setting up the general development environment, please follow the instructions below... 