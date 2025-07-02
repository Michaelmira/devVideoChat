# Video Chat App Usage Guide

## Overview
This app has been transformed from a complex mentor-booking platform into a simple video chat link generator with subscription tiers.

## User Flow

### 1. Landing Page (/)
- **Hero Section**: Clear value proposition for instant video chat links
- **MVP Login Card**: Quick signup/login with email or OAuth (Google/GitHub)
- **Features Section**: Highlights key benefits
- **Pricing Section**: Free vs Premium tier comparison

### 2. Authentication Options

#### Email Registration/Login
- Standard email/password with verification code
- Email verification required before first login

#### OAuth Login (Quick Access)
- **Google OAuth**: One-click login with Google account
- **GitHub OAuth**: One-click login with GitHub account
- Pre-verified accounts (no additional email verification needed)

### 3. Dashboard (/dashboard)
- **Session Creation**: One-click "Create Video Link" button
- **Active Sessions**: List of current active sessions with:
  - Session URL (click to copy)
  - Time remaining
  - Join button
  - Refresh to auto-cleanup expired sessions
- **Usage Statistics**: Shows current plan and limits
- **Upgrade Card**: Premium upgrade CTA for free users

### 4. Video Session Creation
- **Free Users**: 50-minute sessions, unlimited active sessions
- **Premium Users**: 6-hour sessions, 1 active session limit
- **Auto-expiry**: All sessions expire after 6 hours maximum
- **Instant URLs**: Shareable links generated immediately

### 5. Public Joining (/join/:meetingId)
- **No Account Required**: Anyone can join with a link
- **Guest Name**: Simple name input to join as guest
- **Session Validation**: Checks if session exists and is active
- **Feature Highlights**: Shows what's available in the session

### 6. Video Meeting Features
- **HD Video & Audio**: High-quality video chat
- **Screen Sharing**: Share screen with participants
- **Chat**: In-meeting text chat
- **Recording**: Session recording capabilities
- **Timer Display**: Shows both:
  - Total meeting duration
  - Session time remaining (based on tier)
- **Auto-end**: Sessions automatically end when time limit reached

### 7. Subscription Management
- **Free Tier**: 50-minute sessions, unlimited active sessions
- **Premium Tier**: $3/month for 6-hour sessions, 1 active session limit
- **Stripe Integration**: Secure payment processing
- **Easy Cancellation**: Cancel anytime from dashboard

## API Endpoints

### Authentication
- `POST /api/register` - Email registration
- `POST /api/login` - Email login
- `POST /api/verify-code` - Email verification
- `GET /api/auth/google/initiate` - Start Google OAuth
- `GET /api/auth/github/initiate` - Start GitHub OAuth
- `GET /api/auth/mvp/google/initiate` - Start MVP Google OAuth
- `GET /api/auth/mvp/github/initiate` - Start MVP GitHub OAuth

### Session Management
- `POST /api/create-session` - Create new video session
- `GET /api/my-sessions` - Get user's active sessions
- `GET /api/join/:meetingId` - Public join (no auth required)
- `GET /api/session-status/:meetingId` - Check session status

### Subscription
- `POST /api/create-subscription` - Start $3/month subscription
- `POST /api/cancel-subscription` - Cancel subscription
- `GET /api/subscription-status` - Check subscription status

### User Info
- `GET /api/current/user` - Get current user data

## Technical Features

### Security
- JWT token authentication
- OAuth state parameter verification
- CORS protection
- Input validation and sanitization

### Database
- PostgreSQL with SQLAlchemy ORM
- Alembic migrations for schema changes
- Backward compatibility with existing data

### Video Technology
- VideoSDK integration for high-quality video
- WebRTC for optimal performance
- Cross-platform compatibility

### Payment Processing
- Stripe for secure subscription management
- Webhook handling for real-time updates
- Automatic subscription lifecycle management

## User Experience Highlights

### Conversion Optimized
- **MVP Login Card**: Prominent on homepage for immediate conversion
- **One-Click Session Creation**: Instant link generation
- **Public Joining**: No barriers for participants
- **Clear Pricing**: Transparent free vs premium benefits

### Mobile Responsive
- Bootstrap-based responsive design
- Mobile-optimized video interface
- Touch-friendly controls

### Error Handling
- Graceful error messages
- Loading states for better UX
- Automatic retries where appropriate

## Subscription Comparison

| Feature | Free | Premium ($3/month) |
|---------|------|-------------------|
| Session Duration | 50 minutes | 6 hours |
| Active Sessions | Unlimited | 1 at a time |
| HD Video/Audio | ✅ | ✅ |
| Screen Sharing | ✅ | ✅ |
| Recording | ✅ | ✅ |
| Public Joining | ✅ | ✅ |
| Session Auto-expire | 6 hours | 6 hours |

## Migration Notes

### From DevMentor Platform
- All existing customer data preserved in new User table
- Backward compatibility maintained during transition
- Gradual migration with no data loss
- Old mentor/booking features deprecated but accessible

### Database Changes
- New simplified User model with subscription fields
- VideoSession model for session management
- Deprecated tables renamed with `_deprecated` suffix
- Migration scripts handle data preservation

## Development Setup

1. **Environment Variables**: See `docs/ENVIRONMENT_SETUP.md`
2. **Database**: Run migrations with `flask db upgrade`
3. **Frontend**: Start with `npm start`
4. **Backend**: Start with `flask run`
5. **OAuth Setup**: Configure redirect URIs in Google/GitHub consoles
6. **Stripe**: Set up webhook endpoints and price IDs

## Production Deployment

1. **Environment Variables**: Set all required vars in hosting platform
2. **Database**: Ensure PostgreSQL is configured
3. **OAuth**: Update redirect URIs for production domain
4. **Stripe**: Configure production webhooks
5. **SSL**: Ensure HTTPS for OAuth callbacks 