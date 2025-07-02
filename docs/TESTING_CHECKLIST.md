# Testing Checklist for Video Chat App

## Pre-Testing Setup

### 1. Environment Variables
- [ ] All environment variables set (see `docs/ENVIRONMENT_SETUP.md`)
- [ ] Database connection configured
- [ ] VideoSDK credentials configured
- [ ] Stripe test keys configured
- [ ] OAuth apps created and configured

### 2. Database Migration
- [ ] Run `flask db upgrade` to apply new schema
- [ ] Verify new tables created: `user`, `user_image`, `video_session`
- [ ] Verify deprecated tables renamed: `customer_deprecated`, `mentor_deprecated`, etc.
- [ ] Existing data migrated successfully

### 3. Dependencies
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)

## Backend API Testing

### Authentication Endpoints
- [ ] `POST /api/register` - User registration
- [ ] `POST /api/login` - User login  
- [ ] `POST /api/verify-code` - Email verification
- [ ] `GET /api/current/user` - Get current user info

### OAuth Endpoints
- [ ] `POST /api/auth/google/initiate` - Google OAuth initiation
- [ ] `GET /api/auth/google/callback` - Google OAuth callback
- [ ] `POST /api/auth/google/verify` - Google OAuth verification
- [ ] `POST /api/auth/github/initiate` - GitHub OAuth initiation
- [ ] `GET /api/authorize/github` - GitHub OAuth callback
- [ ] `POST /api/auth/github/verify` - GitHub OAuth verification

### MVP OAuth Endpoints
- [ ] `POST /api/auth/mvp/google/initiate` - MVP Google OAuth
- [ ] `GET /api/auth/mvp/google/callback` - MVP Google callback
- [ ] `POST /api/auth/mvp/github/initiate` - MVP GitHub OAuth
- [ ] `GET /api/auth/mvp/github/callback` - MVP GitHub callback

### Session Management
- [ ] `POST /api/create-session` - Create video session (authenticated)
- [ ] `GET /api/my-sessions` - Get user sessions (authenticated)
- [ ] `GET /api/join/<meeting_id>` - Public join (no auth)
- [ ] `GET /api/session-status/<meeting_id>` - Session status (public)

### Subscription Management
- [ ] `POST /api/create-subscription` - Create $3/month subscription
- [ ] `POST /api/cancel-subscription` - Cancel subscription
- [ ] `GET /api/subscription-status` - Get subscription status
- [ ] `POST /api/webhook` - Stripe webhook handling

## Frontend Component Testing

### Home Page (/)
- [ ] Hero section displays correctly
- [ ] MVP login card is prominent and functional
- [ ] Features section shows key benefits
- [ ] Pricing section displays free vs premium comparison
- [ ] Login/signup forms work correctly
- [ ] OAuth buttons redirect properly

### Dashboard (/dashboard)
- [ ] Requires authentication (redirects if not logged in)
- [ ] "Create Video Link" button works
- [ ] Active sessions list displays properly
- [ ] Copy link functionality works
- [ ] Time remaining shows correctly
- [ ] Upgrade card displays for free users
- [ ] Auto-cleanup removes expired sessions

### Join Session (/join/:meetingId)
- [ ] Public access (no login required)
- [ ] Guest name input works
- [ ] Session validation works
- [ ] Error handling for invalid/expired sessions
- [ ] Join button redirects to video meeting

### Video Meeting
- [ ] Video/audio streams work
- [ ] Screen sharing functional
- [ ] Chat functionality works
- [ ] Timer displays correctly (session duration + time remaining)
- [ ] Auto-end works when time limit reached
- [ ] Recording functionality works

## User Flow Testing

### Free User Journey
1. [ ] **Registration**: Sign up with email, verify with code
2. [ ] **Dashboard**: Access dashboard, see free tier features
3. [ ] **Create Session**: Generate 50-minute session link
4. [ ] **Multiple Sessions**: Create multiple active sessions (no limit)
5. [ ] **Join Session**: Test public joining as guest
6. [ ] **Video Chat**: Full video functionality for 50 minutes
7. [ ] **Auto-End**: Session ends at 50-minute mark
8. [ ] **Cleanup**: Expired sessions auto-removed from list

### Premium User Journey
1. [ ] **Upgrade**: Purchase $3/month subscription via Stripe
2. [ ] **Dashboard**: See premium features and limits
3. [ ] **Create Session**: Generate 6-hour session link
4. [ ] **Session Limit**: Can only have 1 active session at a time
5. [ ] **Extended Chat**: Video session can run for 6 hours
6. [ ] **Subscription Management**: Cancel subscription from dashboard

### OAuth User Journey
1. [ ] **Google Login**: Sign up/login with Google account
2. [ ] **GitHub Login**: Sign up/login with GitHub account
3. [ ] **MVP OAuth**: Quick login from home page
4. [ ] **Account Creation**: New OAuth users auto-created
5. [ ] **Pre-verification**: OAuth accounts don't need email verification

## Subscription & Payment Testing

### Stripe Integration
- [ ] Subscription creation works
- [ ] Payment succeeded webhook updates user status
- [ ] Payment failed webhook handled gracefully
- [ ] Subscription cancellation works
- [ ] Subscription updated webhook processed
- [ ] User downgraded correctly when subscription ends

### Session Limits
- [ ] Free users: 50-minute sessions, unlimited active
- [ ] Premium users: 6-hour sessions, 1 active session max
- [ ] Session creation blocked when limits exceeded
- [ ] Proper error messages for limit violations

## Security Testing

### Authentication
- [ ] JWT tokens properly validated
- [ ] Expired tokens rejected
- [ ] Unauthorized access blocked
- [ ] OAuth state parameters verified
- [ ] CSRF protection active

### Authorization
- [ ] Users can only access their own sessions
- [ ] Public endpoints don't require authentication
- [ ] Admin functions properly protected
- [ ] Session joining works for valid links only

## Error Handling Testing

### API Errors
- [ ] Invalid input properly validated
- [ ] Database errors handled gracefully
- [ ] External service failures (VideoSDK, Stripe) handled
- [ ] Proper HTTP status codes returned
- [ ] Meaningful error messages provided

### Frontend Errors
- [ ] Network errors displayed to user
- [ ] Loading states shown during async operations
- [ ] Form validation provides feedback
- [ ] Session expired handled gracefully
- [ ] 404 pages for invalid routes

## Performance Testing

### Load Testing
- [ ] Multiple concurrent session creations
- [ ] Multiple users joining same session
- [ ] Database performance with multiple sessions
- [ ] Video quality under load

### Browser Compatibility
- [ ] Chrome/Chromium browsers
- [ ] Firefox compatibility
- [ ] Safari compatibility
- [ ] Mobile browser support

## Deployment Testing

### Environment Configuration
- [ ] Production environment variables set
- [ ] Database migrations applied
- [ ] Static files served correctly
- [ ] HTTPS redirect working
- [ ] OAuth redirect URIs updated for production

### Monitoring
- [ ] Application logs properly captured
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Database connection pooling configured

## Regression Testing

### Backward Compatibility
- [ ] Existing user data accessible
- [ ] Old user login still works during transition
- [ ] Deprecated endpoints still functional
- [ ] Data migration reversible

### Core Features
- [ ] All video chat features work as before
- [ ] User authentication unchanged
- [ ] Session creation maintains quality
- [ ] Integration with VideoSDK preserved

## Test Data Cleanup
- [ ] Remove test users after testing
- [ ] Cancel test subscriptions
- [ ] Clean up test video sessions
- [ ] Reset database to clean state if needed 