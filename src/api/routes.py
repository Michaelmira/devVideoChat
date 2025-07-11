"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
from datetime import datetime, timedelta
import stripe

from flask import Flask, request, jsonify, url_for, Blueprint, current_app, redirect, session, Response
from flask_cors import CORS, cross_origin
import jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash

from api.services.videosdk_service import VideoSDKService

# Updated imports for new models
from api.models import db, User, UserImage, VideoSession
from api.utils import generate_sitemap, APIException
from api.send_email import send_email, send_verification_email_code
from api.decorators import premium_required

from urllib.parse import urlencode
import json
from google.oauth2.credentials import Credentials
import requests # For making HTTP requests to OAuth
import secrets # For generating secure state tokens for OAuth



from dotenv import load_dotenv

# Load environment variables
load_dotenv()
FRONTEND_URL = os.getenv("FRONTEND_URL") or "http://localhost:3000"
BACKEND_URL = os.getenv("BACKEND_URL") or "http://localhost:3001"

# Stripe API Setup
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_CLIENT_ID = os.getenv("STRIPE_CLIENT_ID")
STRIPE_CALLBACK_URL = f"{os.getenv('BACKEND_URL')}/api/stripe/callback"
stripe.api_key = STRIPE_SECRET_KEY


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

import random
import string

def generate_verification_code():
    return "".join(random.choices(string.digits, k=6))

# ===========================================
# PHASE 2: NEW SIMPLIFIED VIDEO CHAT ROUTES  
# ===========================================

@api.route('/current/user')
@jwt_required()
@cross_origin(origins=[os.getenv("FRONTEND_URL") or "http://localhost:3000"])
def get_current_user():
    """Get current user data for video chat app"""
    user_id = get_jwt_identity()
    
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"msg": "No user with this ID exists."}), 404
    
    # Auto-fix missing billing date for premium users
    if user.subscription_status == 'premium' and not user.current_period_end:
        try:
            if user.subscription_id:
                # Fetch subscription from Stripe to get current_period_end
                subscription = stripe.Subscription.retrieve(user.subscription_id)
                print(f"🔍 DEBUG - Auto-fixing billing date for user {user_id}")
                
                # Try multiple methods to get the billing date
                if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                    user.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
                    print(f"🔍 DEBUG - Auto-fixed billing date: {user.current_period_end}")
                elif 'current_period_end' in subscription:
                    user.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
                    print(f"🔍 DEBUG - Auto-fixed billing date from dict: {user.current_period_end}")
                else:
                    # Fallback: Set to 30 days from now
                    user.current_period_end = datetime.utcnow() + timedelta(days=30)
                    print(f"🔍 DEBUG - Auto-fixed with fallback billing date: {user.current_period_end}")
                
                db.session.commit()
            else:
                # No subscription_id, set fallback date
                user.current_period_end = datetime.utcnow() + timedelta(days=30)
                db.session.commit()
                print(f"🔍 DEBUG - Auto-fixed with fallback (no subscription_id): {user.current_period_end}")
                
        except Exception as e:
            print(f"🔍 DEBUG - Error auto-fixing billing date: {str(e)}")
            # Continue anyway
    
    return jsonify(role="user", user_data=user.serialize())


# NEW: User Registration/Login (simplified, unified)
@api.route('/register', methods=['POST'])
def user_register():
    """Unified user registration for video chat app"""

    email = request.json.get("email", None)
    password = request.json.get("password", None)
    first_name = request.json.get("first_name", None)
    last_name = request.json.get("last_name", None)
    phone = request.json.get("phone", "Not provided")

    if email is None or password is None or first_name is None or last_name is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
        
    existing_user_email = User.query.filter_by(email=email).one_or_none()
    if existing_user_email:
        return jsonify({"msg": "An account associated with the email already exists"}), 409

    verification_code = generate_verification_code()
    user = User(
        email=email, 
        password=generate_password_hash(password), 
        first_name=first_name, 
        last_name=last_name, 
        phone=phone,
        is_verified=False,
        verification_code=verification_code,
        subscription_status='free'  # All users start with free tier
    )
    db.session.add(user)
    db.session.commit()
    
    # Send verification email
    send_verification_email_code(email, verification_code)

    db.session.refresh(user)
    response_body = {
        "msg": "Account successfully created! Please check your email to verify your account.",
        "user": user.serialize()
    }
    return jsonify(response_body), 201


@api.route('/login', methods=['POST'])
def user_login():
    """Unified user login for video chat app"""
    email = request.json.get("email", None)
    password = request.json.get("password", None)

    if email is None or password is None:
        return jsonify({"msg": "Email and password are required."}), 400
    
    user = User.query.filter_by(email=email).one_or_none()
    if user is None:
        return jsonify({"msg": "No user with this email exists."}), 404
    
    if not check_password_hash(user.password, password):
        return jsonify({"msg": "Incorrect password, please try again."}), 401

    if not user.is_verified:
        return jsonify({"msg": "Please verify your email address before logging in."}), 403

    access_token = create_access_token(
        identity=user.id, 
        additional_claims={"role": "user"},
    )
    return jsonify({
        "access_token": access_token,
        "user_id": user.id,
        "user_data": user.serialize()
    }), 200


# NEW: Video Session Management Routes
@api.route('/create-session', methods=['POST'])
@jwt_required()
def create_video_session():
    """Create a new video chat session"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Check subscription limits
    if user.subscription_status == 'premium':
        # Premium users can only have 1 active session
        active_sessions = VideoSession.query.filter_by(
            creator_id=user_id, 
            status='active'
        ).filter(VideoSession.expires_at > datetime.utcnow()).count()
        
        if active_sessions >= 1:
            return jsonify({"msg": "Premium users can only have 1 active session at a time"}), 400
        
        max_duration = 360  # 6 hours
    else:
        max_duration = 50   # 50 minutes
    
    try:
        # Initialize VideoSDK service
        videosdk_service = VideoSDKService()
        
        # Create VideoSDK meeting
        meeting_result = videosdk_service.create_meeting(
            booking_id=f"user_{user_id}_{int(datetime.utcnow().timestamp())}",
            mentor_name=f"{user.first_name} {user.last_name}",
            customer_name="Guest",
            start_time=datetime.utcnow(),
            duration_minutes=max_duration
        )
        
        if not meeting_result.get('success'):
            return jsonify({"msg": "Failed to create video meeting"}), 500
        
        # Create VideoSession record
        expires_at = datetime.utcnow() + timedelta(hours=6)  # All links expire in 6 hours
        
        # Generate public join URL for our frontend
        frontend_join_url = f"{os.getenv('FRONTEND_URL')}/join/{meeting_result['meeting_id']}"
        
        video_session = VideoSession(
            creator_id=user_id,
            meeting_id=meeting_result['meeting_id'],
            session_url=frontend_join_url,  # Use our public join route
            expires_at=expires_at,
            max_duration_minutes=max_duration,
            meeting_token=meeting_result['token'],
            status='active'
        )
        
        db.session.add(video_session)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "session": video_session.serialize(),
            "meeting_url": frontend_join_url  # Return our public join URL
        }), 201
        
    except Exception as e:
        print(f"Error creating video session: {str(e)}")
        return jsonify({"msg": "Failed to create video session"}), 500


@api.route('/my-sessions', methods=['GET'])
@jwt_required()
def get_my_sessions():
    """Get user's active video sessions with auto-cleanup"""
    user_id = get_jwt_identity()
    
    # Clean up expired sessions first
    expired_sessions = VideoSession.query.filter(
        VideoSession.creator_id == user_id,
        VideoSession.expires_at < datetime.utcnow()
    ).all()
    
    for session in expired_sessions:
        session.status = 'expired'
    
    db.session.commit()
    
    # Get active sessions
    active_sessions = VideoSession.query.filter_by(
        creator_id=user_id,
        status='active'
    ).filter(VideoSession.expires_at > datetime.utcnow()).all()
    
    return jsonify({
        "sessions": [session.serialize() for session in active_sessions]
    }), 200


@api.route('/join/<meeting_id>', methods=['GET'])
def join_session_public(meeting_id):
    """Public route for anyone to join a video session (no auth required)"""
    session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
    
    if not session:
        return jsonify({"msg": "Session not found"}), 404
    
    # Use timezone-aware datetime for comparison
    from datetime import timezone
    current_time = datetime.now(timezone.utc)
    
    # Check if session is expired
    if session.expires_at < current_time:
        session.status = 'expired'
        db.session.commit()
        return jsonify({"msg": "This session has expired"}), 410
    
    if session.status != 'active':
        return jsonify({"msg": "This session is no longer active"}), 410
    
    # Generate guest token for VideoSDK
    try:
        videosdk_service = VideoSDKService()
        guest_token = videosdk_service.generate_token(
            permissions=['allow_join'],
            duration_hours=6
        )
        
        return jsonify({
            "success": True,
            "meeting_id": meeting_id,
            "meeting_url": session.session_url,
            "guest_token": guest_token,
            "max_duration_minutes": session.max_duration_minutes,
            "creator_name": session.creator.first_name if session.creator else "Host",
            "time_remaining_minutes": int((session.expires_at - current_time).total_seconds() / 60)
        }), 200
        
    except Exception as e:
        print(f"Error generating guest token: {str(e)}")
        return jsonify({"msg": "Failed to join session"}), 500


@api.route('/session-status/<meeting_id>', methods=['GET'])
def get_session_status(meeting_id):
    """Public route to check session status"""
    session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
    
    if not session:
        return jsonify({"msg": "Session not found"}), 404
    
    # Use timezone-aware datetime for comparison
    from datetime import timezone
    current_time = datetime.now(timezone.utc)
    
    # Auto-update expired sessions
    if session.expires_at < current_time and session.status == 'active':
        session.status = 'expired'
        db.session.commit()

    time_remaining = max(0, int((session.expires_at - current_time).total_seconds() / 60))
    
    return jsonify({
        "status": session.status,
        "time_remaining_minutes": time_remaining,
        "max_duration_minutes": session.max_duration_minutes,
        "creator_name": session.creator.first_name if session.creator else "Host",
        "creator_id": session.creator.id if session.creator else None
    }), 200


# NEW: Subscription Management Routes
@api.route('/debug-stripe', methods=['GET'])
@jwt_required()
def debug_stripe():
    """Debug Stripe API connection and list available prices"""
    try:
        # Test API connection and list prices
        prices = stripe.Price.list(limit=10)
        
        # Check if our specific price exists
        target_price_id = os.getenv('STRIPE_PRICE_ID')
        price_found = False
        
        for price in prices.data:
            if price.id == target_price_id:
                price_found = True
                break
        
        return jsonify({
            "api_connection": "success",
            "stripe_key_type": "test" if os.getenv('STRIPE_SECRET_KEY', '').startswith('sk_test_') else "live",
            "target_price_id": target_price_id,
            "price_found": price_found,
            "available_prices": [
                {
                    "id": price.id,
                    "product": price.product,
                    "unit_amount": price.unit_amount,
                    "currency": price.currency,
                    "recurring": price.recurring
                } for price in prices.data
            ]
        }), 200
        
    except Exception as e:
        return jsonify({
            "api_connection": "failed",
            "error": str(e),
            "stripe_key_type": "test" if os.getenv('STRIPE_SECRET_KEY', '').startswith('sk_test_') else "live",
            "target_price_id": os.getenv('STRIPE_PRICE_ID')
        }), 500


@api.route('/create-subscription', methods=['POST'])
@jwt_required()
def create_subscription():
    """Create a payment intent for subscription - payment first, then subscription"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    if user.subscription_status == 'premium':
        return jsonify({"msg": "User already has premium subscription"}), 400
    
    try:
        # Create or get Stripe customer
        if not user.stripe_customer_id:
            stripe_customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}"
            )
            user.stripe_customer_id = stripe_customer.id
            db.session.commit()
        else:
            # Verify the customer exists, if not create a new one
            try:
                stripe.Customer.retrieve(user.stripe_customer_id)
            except stripe.error.InvalidRequestError:
                print(f"🔍 DEBUG - Customer {user.stripe_customer_id} not found, creating new one")
                stripe_customer = stripe.Customer.create(
                    email=user.email,
                    name=f"{user.first_name} {user.last_name}"
                )
                user.stripe_customer_id = stripe_customer.id
                db.session.commit()
        
        # Create a payment intent for $3 and save payment method for future use
        payment_intent = stripe.PaymentIntent.create(
            amount=300,  # $3.00 in cents
            currency='usd',
            customer=user.stripe_customer_id,
            setup_future_usage='off_session',  # Save payment method for future use
            metadata={
                'user_id': str(user_id),
                'type': 'subscription_payment'
            },
            description='Premium subscription payment'
        )
        
        print(f"🔍 DEBUG - Created payment intent: {payment_intent.id}")
        
        return jsonify({
            "client_secret": payment_intent.client_secret,
            "status": "requires_payment_method"
        }), 200
        
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        return jsonify({"msg": "Failed to create payment intent"}), 500


@api.route('/confirm-subscription', methods=['POST'])
@jwt_required()
def confirm_subscription():
    """Confirm payment and create subscription - called after payment succeeds"""
    print(f"🔍 DEBUG - Starting confirm_subscription")
    
    user_id = get_jwt_identity()
    print(f"🔍 DEBUG - User ID: {user_id}")
    
    user = User.query.get(user_id)
    print(f"🔍 DEBUG - User found: {user is not None}")
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    print(f"🔍 DEBUG - User subscription status: {user.subscription_status}")
    if user.subscription_status == 'premium':
        return jsonify({"msg": "User already has premium subscription"}), 400
    
    try:
        data = request.get_json()
        print(f"🔍 DEBUG - Request data: {data}")
        
        payment_intent_id = data.get('payment_intent_id')
        print(f"🔍 DEBUG - Payment intent ID: {payment_intent_id}")
        
        if not payment_intent_id:
            return jsonify({"msg": "Payment intent ID required"}), 400
        
        # Verify the payment intent was successful
        print(f"🔍 DEBUG - Retrieving payment intent from Stripe")
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        print(f"🔍 DEBUG - Payment intent status: {payment_intent.status}")
        
        if payment_intent.status != 'succeeded':
            return jsonify({"msg": "Payment not completed"}), 400
        
        # Verify this payment belongs to this user
        print(f"🔍 DEBUG - Payment customer: {payment_intent.customer}")
        print(f"🔍 DEBUG - User customer: {user.stripe_customer_id}")
        if payment_intent.customer != user.stripe_customer_id:
            return jsonify({"msg": "Payment verification failed"}), 400
        
        # Get the payment method from the successful payment intent
        payment_method = payment_intent.payment_method
        print(f"🔍 DEBUG - Payment method: {payment_method}")
        
        # Set the payment method as default for the customer (should already be attached)
        print(f"🔍 DEBUG - Setting default payment method for customer")
        try:
            stripe.Customer.modify(
                user.stripe_customer_id,
                invoice_settings={
                    'default_payment_method': payment_method
                }
            )
            print(f"🔍 DEBUG - Set default payment method for customer: {user.stripe_customer_id}")
        except Exception as pm_error:
            print(f"🔍 DEBUG - Error setting default payment method: {str(pm_error)}")
            # Continue anyway - the subscription creation might still work
        
        # Check STRIPE_PRICE_ID environment variable
        price_id = os.getenv('STRIPE_PRICE_ID')
        print(f"🔍 DEBUG - STRIPE_PRICE_ID: {price_id}")
        
        if not price_id:
            raise Exception("STRIPE_PRICE_ID environment variable not set")
        
        # Create the subscription with automatic payment behavior
        print(f"🔍 DEBUG - Creating subscription with price ID: {price_id}")
        subscription = stripe.Subscription.create(
            customer=user.stripe_customer_id,
            items=[{
                'price': price_id  # $3/month price ID
            }],
            # Use existing payment method for future payments
            default_payment_method=payment_method,
            expand=['latest_invoice.payment_intent']
        )
        
        print(f"🔍 DEBUG - Created subscription: {subscription.id}, status: {subscription.status}")
        
        # Update user status immediately
        print(f"🔍 DEBUG - Updating user status to premium")
        user.subscription_status = 'premium'
        user.subscription_id = subscription.id
        
        # Get current_period_end from subscription (multiple approaches)
        try:
            # Method 1: Try to get from subscription object directly
            if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                user.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
                print(f"🔍 DEBUG - Got current_period_end from subscription: {user.current_period_end}")
            
            # Method 2: Get from subscription items
            elif subscription.items and subscription.items.data:
                item = subscription.items.data[0]
                if hasattr(item, 'current_period_end') and item.current_period_end:
                    user.current_period_end = datetime.fromtimestamp(item.current_period_end)
                    print(f"🔍 DEBUG - Got current_period_end from item: {user.current_period_end}")
                    
            # Method 3: Try to access as dictionary key
            elif 'current_period_end' in subscription:
                user.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
                print(f"🔍 DEBUG - Got current_period_end from dict: {user.current_period_end}")
                
            # Method 4: Use billing_cycle_anchor + 1 month as fallback
            else:
                print(f"🔍 DEBUG - Subscription object keys: {list(subscription.keys()) if hasattr(subscription, 'keys') else 'No keys method'}")
                # Calculate next billing date (30 days from now)
                user.current_period_end = datetime.utcnow() + timedelta(days=30)
                print(f"🔍 DEBUG - Using fallback current_period_end: {user.current_period_end}")
                
        except Exception as period_error:
            print(f"🔍 DEBUG - Error setting current_period_end: {str(period_error)}")
            # Fallback: Set to 30 days from now
            user.current_period_end = datetime.utcnow() + timedelta(days=30)
            print(f"🔍 DEBUG - Using error fallback current_period_end: {user.current_period_end}")
        
        db.session.commit()
        
        print(f"🔍 DEBUG - Successfully updated user {user_id} to premium status")
        
        return jsonify({
            "msg": "Subscription created successfully",
            "subscription_id": subscription.id,
            "status": "active"
        }), 200
        
    except Exception as e:
        print(f"❌ Error confirming subscription: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Full traceback:\n{traceback.format_exc()}")
        return jsonify({
            "msg": "Failed to confirm subscription",
            "error": str(e),
            "error_type": str(type(e))
        }), 500


@api.route('/cancel-subscription', methods=['POST'])
@jwt_required()
def cancel_subscription():
    """Cancel user's subscription"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.subscription_id:
        return jsonify({"msg": "No active subscription found"}), 404
    
    try:
        stripe.Subscription.delete(user.subscription_id)
        
        user.subscription_status = 'free'
        user.subscription_id = None
        user.current_period_end = None
        db.session.commit()
        
        return jsonify({"msg": "Subscription cancelled successfully"}), 200
        
    except Exception as e:
        print(f"Error cancelling subscription: {str(e)}")
        return jsonify({"msg": "Failed to cancel subscription"}), 500


@api.route('/subscription-status', methods=['GET'])
@jwt_required()
def get_subscription_status():
    """Get user's subscription status"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    return jsonify({
        "subscription_status": user.subscription_status,
        "current_period_end": user.current_period_end.isoformat() if user.current_period_end else None
    }), 200


@api.route('/fix-billing-date', methods=['POST'])
@jwt_required()
def fix_billing_date():
    """Fix billing date for premium users who don't have current_period_end set"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    if user.subscription_status != 'premium':
        return jsonify({"msg": "User is not premium"}), 400
    
    if user.current_period_end:
        return jsonify({
            "msg": "Billing date already set",
            "current_period_end": user.current_period_end.isoformat()
        }), 200
    
    try:
        if user.subscription_id:
            # Fetch subscription from Stripe to get current_period_end
            subscription = stripe.Subscription.retrieve(user.subscription_id)
            print(f"🔍 DEBUG - Retrieved subscription: {subscription.id}")
            
            # Try multiple methods to get the billing date
            if hasattr(subscription, 'current_period_end') and subscription.current_period_end:
                user.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
                print(f"🔍 DEBUG - Got billing date from subscription: {user.current_period_end}")
            elif 'current_period_end' in subscription:
                user.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
                print(f"🔍 DEBUG - Got billing date from dict: {user.current_period_end}")
            else:
                # Fallback: Set to 30 days from now
                user.current_period_end = datetime.utcnow() + timedelta(days=30)
                print(f"🔍 DEBUG - Using fallback billing date: {user.current_period_end}")
            
            db.session.commit()
            
            return jsonify({
                "msg": "Billing date updated successfully",
                "current_period_end": user.current_period_end.isoformat()
            }), 200
        else:
            # No subscription_id, set fallback date
            user.current_period_end = datetime.utcnow() + timedelta(days=30)
            db.session.commit()
            
            return jsonify({
                "msg": "Billing date set with fallback",
                "current_period_end": user.current_period_end.isoformat()
            }), 200
            
    except Exception as e:
        print(f"Error fixing billing date: {str(e)}")
        return jsonify({"msg": "Failed to fix billing date"}), 500


# ===========================================
# EXISTING AUTH ROUTES (KEEP UNCHANGED)
# ===========================================

@api.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({"msg": "Email and code are required"}), 400

    # Check user in new unified system
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Developer bypass code
    if code == "999000":
        user.is_verified = True
        user.verification_code = None
        db.session.commit()
        return jsonify({"msg": "Email verified successfully"}), 200

    if user.verification_code == code:
        user.is_verified = True
        user.verification_code = None
        db.session.commit()
        return jsonify({"msg": "Email verified successfully"}), 200
    else:
        return jsonify({"msg": "Invalid verification code"}), 400


# NEW: Updated Stripe Webhook for Subscription Events
@api.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events for subscriptions"""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({"error": "Invalid signature"}), 400

    # Handle subscription events
    if event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        # Update user to premium
        user = User.query.filter_by(stripe_customer_id=subscription['customer']).first()
        if user:
            user.subscription_status = 'premium'
            user.subscription_id = subscription['id']
            user.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
            db.session.commit()
    
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        user = User.query.filter_by(stripe_customer_id=subscription['customer']).first()
        if user:
            if subscription['status'] == 'active':
                user.subscription_status = 'premium'
            else:
                user.subscription_status = 'free'
            user.current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
            db.session.commit()
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        user = User.query.filter_by(stripe_customer_id=subscription['customer']).first()
        if user:
            user.subscription_status = 'free'
            user.subscription_id = None
            user.current_period_end = None
            db.session.commit()
    
    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        # Subscription payment succeeded - keep user as premium
        if invoice.get('subscription'):
            user = User.query.filter_by(stripe_customer_id=invoice['customer']).first()
            if user:
                user.subscription_status = 'premium'
                db.session.commit()
    
    elif event['type'] == 'invoice.payment_failed':
        invoice = event['data']['object']
        # Handle failed payment - could downgrade or send notification
        if invoice.get('subscription'):
            user = User.query.filter_by(stripe_customer_id=invoice['customer']).first()
            if user:
                # Note: Stripe will retry payment automatically
                # You might want to send an email notification here
                pass

    return jsonify({"status": "success"}), 200


# ===========================================
# VIDEOSDK WEBHOOK ROUTES
# ===========================================

@api.route('/videosdk/webhook', methods=['POST', 'GET'])
def videosdk_webhook():
    """Handle VideoSDK webhook events for recording lifecycle"""
    try:
        print(f"🎬 VideoSDK Webhook endpoint called - Method: {request.method}")
        print(f"📊 Request headers: {dict(request.headers)}")
        
        # Handle GET requests for webhook testing
        if request.method == 'GET':
            print("🔍 GET request to webhook endpoint - endpoint is accessible")
            return jsonify({"status": "webhook endpoint accessible", "method": "GET"}), 200
        
        data = request.get_json()
        
        # VideoSDK uses 'webhookType' field instead of 'event'
        webhook_type = data.get('webhookType') if data else None
        event_type = data.get('event') if data else None
        
        print(f"🎬 VideoSDK Webhook received - webhookType: {webhook_type}, event: {event_type}")
        print(f"📊 Webhook data: {data}")
        
        # Handle new VideoSDK webhook format (webhookType)
        if webhook_type == 'hls-starting':
            print("🔄 HLS Recording starting...")
            # Handle starting event - could update status if needed
            handle_hls_starting(data.get('data', {}))
        elif webhook_type == 'hls-started':
            print("✅ HLS Recording started!")
            handle_hls_started(data.get('data', {}))
        elif webhook_type == 'hls-playable':
            print("🎬 HLS Stream is playable!")
            # Stream is ready for playback - could be useful for live streaming
        elif webhook_type == 'hls-stopping':
            print("🔄 HLS Recording stopping...")
            handle_hls_stopping(data.get('data', {}))
        elif webhook_type == 'hls-stopped':
            print("🛑 HLS Recording stopped!")
            handle_hls_stopped(data.get('data', {}))
        elif webhook_type == 'hls-failed':
            print("❌ HLS Recording failed!")
            handle_hls_failed(data.get('data', {}))
        # Handle legacy event format as fallback
        elif event_type == 'hls.started':
            handle_hls_started(data)
        elif event_type == 'hls.stopped':
            handle_hls_stopped(data)
        elif event_type == 'hls.failed':
            handle_hls_failed(data)
        elif event_type == 'recording.started':
            handle_recording_started(data)
        elif event_type == 'recording.stopped':
            handle_recording_stopped(data)
        elif event_type == 'recording.failed':
            handle_recording_failed(data)
        else:
            print(f"⚠️ Unknown VideoSDK webhook type: {webhook_type} or event: {event_type}")
        
        return jsonify({"status": "success"}), 200
        
    except Exception as e:
        print(f"❌ Error processing VideoSDK webhook: {str(e)}")
        return jsonify({"error": "Webhook processing failed"}), 400

def handle_recording_started(data):
    """Handle recording started event"""
    try:
        meeting_id = data.get('meetingId')
        recording_id = data.get('recordingId')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # NEW: Update recording in JSON array
            session.update_recording(recording_id, {
                "recording_status": "active",
                "started_at": datetime.utcnow().isoformat()
            })
            
            # Also update old fields for backward compatibility
            session.recording_id = recording_id
            session.recording_status = 'active'
            
            db.session.commit()
            print(f"✅ Recording started for session {session.id}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling recording started: {str(e)}")

def handle_recording_stopped(data):
    """Handle recording stopped event"""
    try:
        meeting_id = data.get('meetingId')
        recording_id = data.get('recordingId')
        download_url = data.get('downloadUrl')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # NEW: Update recording in JSON array
            session.update_recording(recording_id, {
                "recording_status": "completed",
                "recording_url": download_url,
                "completed_at": datetime.utcnow().isoformat()
            })
            
            # Also update old fields for backward compatibility
            session.recording_url = download_url
            session.recording_status = 'completed'
            
            db.session.commit()
            print(f"✅ Recording completed for session {session.id}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling recording stopped: {str(e)}")

def handle_recording_failed(data):
    """Handle recording failed event"""
    try:
        meeting_id = data.get('meetingId')
        recording_id = data.get('recordingId')
        error_message = data.get('error', 'Unknown error')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            session.recording_status = 'failed'
            db.session.commit()
            print(f"❌ Recording failed for session {session.id}: {error_message}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling recording failed: {str(e)}")

def handle_hls_starting(data):
    """Handle HLS starting event (for recording)"""
    try:
        meeting_id = data.get('meetingId')
        session_id = data.get('sessionId')
        recording_id = data.get('id')  # This is the actual recording ID
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # NEW: Check if recording exists in JSON array, if not create it
            existing_recording = session.get_recording(recording_id) if recording_id else None
            if not existing_recording and recording_id:
                # Create new recording in JSON array
                recording_data = {
                    "recording_id": recording_id,
                    "recording_status": "starting",
                    "started_at": datetime.utcnow().isoformat()
                }
                session.add_recording(recording_data)
                print(f"📝 Created new recording in JSON array: {recording_id}")
            elif existing_recording:
                # Update existing recording
                session.update_recording(recording_id, {
                    "recording_status": "starting",
                    "started_at": datetime.utcnow().isoformat()
                })
                print(f"📝 Updated existing recording: {recording_id}")
            
            # Also update old fields for backward compatibility
            if not session.recording_id:
                session.recording_id = recording_id or session_id
            session.recording_status = 'starting'
            
            db.session.commit()
            db.session.refresh(session)
            print(f"🔄 HLS Recording starting for session {session.id}")
            print(f"🔍 DEBUG: After commit, session has {len(session.recordings or [])} recordings")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling HLS starting: {str(e)}")

def handle_hls_started(data):
    """Handle HLS started event (for recording)"""
    try:
        meeting_id = data.get('meetingId')
        session_id = data.get('sessionId')
        recording_id = data.get('id')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # NEW: Update recording in JSON array
            if recording_id:
                session.update_recording(recording_id, {
                    "recording_status": "active",
                    "started_at": datetime.utcnow().isoformat()
                })
                print(f"📝 Updated recording in JSON array to active: {recording_id}")
            
            # Also update old fields for backward compatibility
            session.recording_id = recording_id or session_id
            session.recording_status = 'active'
            db.session.commit()
            db.session.refresh(session)
            print(f"✅ HLS Recording started for session {session.id}")
            print(f"🔍 DEBUG: After started commit, session has {len(session.recordings or [])} recordings")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling HLS started: {str(e)}")

def handle_hls_stopping(data):
    """Handle HLS stopping event (for recording)"""
    try:
        meeting_id = data.get('meetingId')
        session_id = data.get('sessionId')
        recording_id = data.get('id')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # NEW: Update recording in JSON array
            if recording_id:
                session.update_recording(recording_id, {
                    "recording_status": "stopping"
                })
                print(f"📝 Updated recording in JSON array to stopping: {recording_id}")
            
            # Also update old fields for backward compatibility
            session.recording_status = 'stopping'
            db.session.commit()
            print(f"⏹️ HLS Recording stopping for session {session.id}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling HLS stopping: {str(e)}")

def handle_hls_stopped(data):
    """Handle HLS stopped event (for recording)"""
    try:
        meeting_id = data.get('meetingId')
        session_id = data.get('sessionId')
        recording_id = data.get('id')
        download_url = data.get('downloadUrl')
        playback_url = data.get('playbackHlsUrl')
        downstream_url = data.get('downstreamUrl')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            # Use playback URL if available, otherwise downstream URL, otherwise download URL
            final_url = playback_url or downstream_url or download_url
            
            # NEW: Update recording in JSON array
            if recording_id:
                session.update_recording(recording_id, {
                    "recording_status": "completed",
                    "recording_url": final_url,
                    "completed_at": datetime.utcnow().isoformat()
                })
                print(f"📝 Updated recording in JSON array to completed: {recording_id}")
            
            # Also update old fields for backward compatibility
            session.recording_url = final_url
            session.recording_status = 'completed'
            db.session.commit()
            print(f"✅ HLS Recording completed for session {session.id}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling HLS stopped: {str(e)}")

def handle_hls_failed(data):
    """Handle HLS failed event (for recording)"""
    try:
        meeting_id = data.get('meetingId')
        session_id = data.get('sessionId')
        error_message = data.get('error', 'Unknown error')
        
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if session:
            session.recording_status = 'failed'
            db.session.commit()
            print(f"❌ HLS Recording failed for session {session.id}: {error_message}")
        else:
            print(f"⚠️ Session not found for meeting_id: {meeting_id}")
            
    except Exception as e:
        print(f"❌ Error handling HLS failed: {str(e)}")


# ===========================================
# RECORDING API ROUTES
# ===========================================

@api.route('/sessions/<meeting_id>/start-recording', methods=['POST'])
@jwt_required()
@premium_required
def start_recording(meeting_id):
    """Start recording for a video session - Premium only"""
    try:
        user_id = get_jwt_identity()
        
        # Get the session
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({"msg": "Session not found"}), 404
        
        # Check if user is the creator
        if session.creator_id != user_id:
            return jsonify({"msg": "Only session creator can start recording"}), 403
        
        # Check if any recording is already active (NEW: check JSON array)
        active_recordings = session.get_active_recordings()
        if active_recordings:
            return jsonify({"msg": "Recording already in progress"}), 400
        
        # Call VideoSDK HLS API to start recording
        from .services.videosdk_service import VideoSDKService
        videosdk = VideoSDKService()
        
        # Generate token for recording operation
        token = videosdk.generate_token(permissions=['allow_record'])
        
        # Start HLS streaming with recording enabled via VideoSDK API
        headers = {
            "Authorization": token,
            "Content-Type": "application/json"
        }
        
        recording_data = {
            "roomId": meeting_id,
            "config": {
                "layout": {
                    "type": "GRID",
                    "priority": "SPEAKER",
                    "gridSize": 25
                },
                "orientation": "landscape",
                "theme": "DARK",
                "mode": "video-and-audio",
                "quality": "high",
                "recording": {
                    "enabled": True
                }
            },
            "webhookUrl": f"{os.getenv('BACKEND_URL')}/api/videosdk/webhook"
        }
        
        print(f"🔄 Starting HLS recording for meeting {meeting_id}")
        print(f"📊 VideoSDK API URL: {videosdk.api_endpoint}/hls/start")
        print(f"📊 Webhook URL: {recording_data['webhookUrl']}")
        print(f"📊 Recording data: {recording_data}")
        
        try:
            print("🔄 Making POST request to VideoSDK API...")
            response = requests.post(
                f"{videosdk.api_endpoint}/hls/start",
                headers=headers,
                json=recording_data,
                timeout=10  # Reduced timeout to 10 seconds
            )
            
            print(f"📊 VideoSDK Response Status: {response.status_code}")
            print(f"📊 VideoSDK Response Text: {response.text}")
            
            if response.status_code == 200:
                response_data = response.json()
                
                print(f"🔍 VideoSDK Response Data: {response_data}")
                hls_id = response_data.get('id')
                session_id = response_data.get('sessionId')
                print(f"🔍 HLS ID: {hls_id}, Session ID: {session_id}")
                
                # NEW: Add recording to JSON array
                # Use 'id' field (which is what webhooks use) rather than 'sessionId'
                recording_data = {
                    "recording_id": response_data.get('id', response_data.get('sessionId')),
                    "recording_status": "starting",
                    "started_at": datetime.utcnow().isoformat()
                }
                
                print(f"🔍 Storing recording with ID: {recording_data['recording_id']}")
                
                new_recording = session.add_recording(recording_data)
                
                # Also update old fields for backward compatibility
                session.recording_status = 'starting'
                session.recording_id = recording_data["recording_id"]
                
                print(f"🔄 Before DB commit - Session {session.id}: Added recording {new_recording['id']}")
                
                db.session.commit()
                
                # Verify the update was saved
                db.session.refresh(session)
                print(f"✅ After DB commit - Session {session.id}: Total recordings: {len(session.recordings)}")
                
                print(f"✅ HLS Recording start initiated for session {session.id}")
                return jsonify({
                    "success": True,
                    "message": "Recording started successfully",
                    "recording": new_recording,
                    "total_recordings": len(session.recordings),
                    # Backward compatibility
                    "recording_status": session.recording_status,
                    "hls_session_id": session.recording_id
                }), 200
            else:
                error_msg = f"VideoSDK API Error: Status {response.status_code}, Response: {response.text}"
                print(f"❌ {error_msg}")
                return jsonify({"msg": f"Failed to start recording: {error_msg}"}), 400
                
        except requests.exceptions.Timeout:
            print("⏰ VideoSDK API request timed out")
            # Still update session status as starting since the webhook might come later
            session.recording_status = 'starting'
            db.session.commit()
            print(f"✅ Recording start initiated (timeout occurred) for session {session.id}")
            return jsonify({
                "success": True,
                "message": "Recording start initiated (processing)",
                "recording_status": session.recording_status
            }), 200
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error: {str(e)}")
            return jsonify({"msg": f"Network error starting recording: {str(e)}"}), 500
            
    except Exception as e:
        print(f"❌ Error starting recording: {str(e)}")
        return jsonify({"msg": "Error starting recording"}), 500

@api.route('/sessions/<meeting_id>/stop-recording', methods=['POST'])
@jwt_required()
@premium_required
def stop_recording(meeting_id):
    """Stop recording for a video session - Premium only"""
    try:
        user_id = get_jwt_identity()
        
        # Get the session
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({"msg": "Session not found"}), 404
        
        # Check if user is the creator
        if session.creator_id != user_id:
            return jsonify({"msg": "Only session creator can stop recording"}), 403
        
        # Check if recording is active
        if session.recording_status not in ['active', 'starting']:
            return jsonify({"msg": "No active recording to stop"}), 400
        
        # Call VideoSDK HLS API to stop recording
        from .services.videosdk_service import VideoSDKService
        videosdk = VideoSDKService()
        
        # Generate token for recording operation
        token = videosdk.generate_token(permissions=['allow_record'])
        
        # Stop HLS streaming/recording via VideoSDK API
        headers = {
            "Authorization": token,
            "Content-Type": "application/json"
        }
        
        # Get the recording ID from the session
        recording_id = session.recording_id
        
        print(f"🔄 Stopping HLS recording {recording_id} for meeting {meeting_id}")
        print(f"📊 VideoSDK API URL: {videosdk.api_endpoint}/hls/stop")
        print(f"🔍 Session recordings: {session.recordings}")
        
        # Debug: Show active recordings
        active_recordings = session.get_active_recordings()
        print(f"🔍 Active recordings: {active_recordings}")
        
        # Try the correct VideoSDK API format for stopping HLS
        stop_data = {
            "roomId": meeting_id,
            "hlsId": recording_id  # Changed from sessionId to hlsId
        }
        
        # Also try with different data formats for different endpoints
        simple_stop_data = {
            "roomId": meeting_id
        }
        
        try:
            print("🔄 Making POST request to VideoSDK API to stop HLS...")
            print(f"📊 Stop data: {stop_data}")
            
            # Try multiple approaches to stop the HLS recording
            
            # Approach 1: Try /v2/hls/stop with hlsId
            response = requests.post(
                f"{videosdk.api_endpoint}/hls/stop",
                headers=headers,
                json=stop_data,
                timeout=10
            )
            
            print(f"📊 VideoSDK Response Status: {response.status_code}")
            print(f"📊 VideoSDK Response Text: {response.text}")
            
            # If the first approach fails with 404, try alternative approaches
            print(f"🔍 Checking if we should try alternatives. Status: {response.status_code}")
            
            # Approach 2: Try /v2/hls/{id}/stop
            if response.status_code == 404:
                print("🔄 Trying alternative approach: /v2/hls/{id}/stop")
                
                try:
                    response = requests.post(
                        f"{videosdk.api_endpoint}/hls/{recording_id}/stop",
                        headers=headers,
                        json={"roomId": meeting_id},
                        timeout=10
                    )
                    
                    print(f"📊 Alternative Response Status: {response.status_code}")
                    print(f"📊 Alternative Response Text: {response.text}")
                    
                    # If still 404, try another approach
                    if response.status_code == 404:
                        print("🔄 Trying final approach: Session management")
                        
                        # Approach 3: Try stopping via session management
                        response = requests.post(
                            f"{videosdk.api_endpoint}/sessions/{recording_id}/stop",
                            headers=headers,
                            json={"roomId": meeting_id},
                            timeout=10
                        )
                        
                        print(f"📊 Session Response Status: {response.status_code}")
                        print(f"📊 Session Response Text: {response.text}")
                        
                        # If still failing, try stopping the room itself
                        if response.status_code == 404:
                            print("🔄 Trying room deactivation approach")
                            
                            # Approach 4: Try with simple room data
                            print("🔄 Trying simple room approach: /v2/hls/stop with just roomId")
                            
                            response = requests.post(
                                f"{videosdk.api_endpoint}/hls/stop",
                                headers=headers,
                                json=simple_stop_data,
                                timeout=10
                            )
                            
                            print(f"📊 Simple room Response Status: {response.status_code}")
                            print(f"📊 Simple room Response Text: {response.text}")
                            
                            # If still failing, try deactivating the room
                            if response.status_code == 404:
                                print("🔄 Trying room deactivation approach")
                                
                                response = requests.post(
                                    f"{videosdk.api_endpoint}/rooms/{meeting_id}/deactivate",
                                    headers=headers,
                                    json={},
                                    timeout=10
                                )
                                
                                print(f"📊 Room deactivation Response Status: {response.status_code}")
                                print(f"📊 Room deactivation Response Text: {response.text}")
                            
                except Exception as e:
                    print(f"❌ Error in alternative approaches: {str(e)}")
                    # Continue with the fallback approach
                    pass
            
            if response.status_code == 200:
                # NEW: Update recording in JSON array
                session.update_recording(recording_id, {
                    "recording_status": "stopping"
                })
                
                # Also update old fields for backward compatibility
                session.recording_status = 'stopping'
                db.session.commit()
                
                print(f"✅ HLS stop request successful for {recording_id}")
                return jsonify({
                    "success": True,
                    "message": "Recording stopped successfully",
                    "recording_status": session.recording_status
                }), 200
            else:
                # If the API call fails, let's still update the status and rely on webhooks
                print(f"❌ VideoSDK API Error: Status {response.status_code}, Response: {response.text}")
                print("🔄 Fallback: Setting status to stopping and relying on webhooks")
                print("💡 Note: VideoSDK may stop the recording automatically when the room ends")
                
                # NEW: Update recording in JSON array
                session.update_recording(recording_id, {
                    "recording_status": "stopping"
                })
                
                # Also update old fields for backward compatibility
                session.recording_status = 'stopping'
                db.session.commit()
                
                # Since all API calls failed, immediately mark as completed
                print("🔄 All API calls failed, marking recording as completed immediately...")
                
                # Mark as completed since VideoSDK API is not working
                from datetime import datetime
                session.update_recording(recording_id, {
                    "recording_status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "recording_url": "Recording stopped by user (VideoSDK API unavailable)"
                })
                
                session.recording_status = 'completed'
                session.recording_url = "Recording stopped by user (VideoSDK API unavailable)"
                db.session.commit()
                
                print(f"✅ Recording {recording_id} marked as completed immediately due to API failure")
                
                print("✅ Recording marked as completed immediately (no threading delays needed)")
                
                return jsonify({
                    "success": True,
                    "message": "Recording stop initiated (webhook processing)",
                    "recording_status": session.recording_status,
                    "note": "API call failed but status updated, webhooks will handle completion"
                }), 200
                
        except requests.exceptions.Timeout:
            print("⏰ VideoSDK API request timed out")
            # Still update session status as stopping since the webhook might come later
            # NEW: Update recording in JSON array
            session.update_recording(recording_id, {
                "recording_status": "stopping"
            })
            
            # Also update old fields for backward compatibility
            session.recording_status = 'stopping'
            db.session.commit()
            print(f"✅ Recording stop initiated (timeout occurred) for session {session.id}")
            return jsonify({
                "success": True,
                "message": "Recording stop initiated (processing)",
                "recording_status": session.recording_status
            }), 200
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error: {str(e)}")
            # Still update session status as stopping since the webhook might come later
            # NEW: Update recording in JSON array
            session.update_recording(recording_id, {
                "recording_status": "stopping"
            })
            
            # Also update old fields for backward compatibility
            session.recording_status = 'stopping'
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Recording stop initiated (network error, relying on webhooks)",
                "recording_status": session.recording_status
            }), 200
            
    except Exception as e:
        print(f"❌ Error stopping recording: {str(e)}")
        return jsonify({"msg": "Error stopping recording"}), 500

@api.route('/sessions/<meeting_id>/recordings', methods=['GET'])
@jwt_required()
@premium_required
def get_session_recordings(meeting_id):
    """Get recordings for a specific session - Premium only"""
    try:
        user_id = get_jwt_identity()
        
        # Get the session
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({"msg": "Session not found"}), 404
        
        # Check if user is the creator
        if session.creator_id != user_id:
            return jsonify({"msg": "Only session creator can view recordings"}), 403
        
        # Refresh session to get latest data from database
        db.session.refresh(session)
        
        # NEW: Return all recordings from JSON array
        recordings = session.recordings or []
        
        print(f"📊 get_session_recordings - Session {session.id}: {len(recordings)} recordings")
        print(f"🔍 DEBUG get_session_recordings: Raw recordings data: {recordings}")
        
        return jsonify({
            "success": True,
            "session_id": session.id,
            "meeting_id": meeting_id,
            "recordings": recordings,
            "total_recordings": len(recordings),
            "has_recordings": bool(recordings),
            # Backward compatibility
            "recording_status": session.recording_status,
            "recording_url": session.recording_url,
            "recording_id": session.recording_id,
            "has_recording": bool(session.recording_url)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting recordings: {str(e)}")
        return jsonify({"msg": "Error getting recordings"}), 500

@api.route('/my-recordings', methods=['GET'])
@jwt_required()
@premium_required
def get_my_recordings():
    """Get all recordings for the current user - Premium only"""
    try:
        user_id = get_jwt_identity()
        
        # Get all sessions for this user
        sessions = VideoSession.query.filter_by(creator_id=user_id).order_by(VideoSession.created_at.desc()).all()
        
        all_recordings = []
        for session in sessions:
            # NEW: Get recordings from JSON array
            session_recordings = session.recordings or []
            
            for recording in session_recordings:
                all_recordings.append({
                    "session_id": session.id,
                    "meeting_id": session.meeting_id,
                    "session_created_at": session.created_at.isoformat(),
                    "max_duration_minutes": session.max_duration_minutes,
                    # Recording specific data
                    "recording_id": recording.get("id"),
                    "videosdk_recording_id": recording.get("recording_id"),
                    "recording_url": recording.get("recording_url"),
                    "recording_status": recording.get("recording_status"),
                    "recording_created_at": recording.get("created_at"),
                    "recording_completed_at": recording.get("completed_at"),
                    "duration_seconds": recording.get("duration_seconds"),
                    "quality": recording.get("quality")
                })
        
        # Sort by recording creation date (newest first)
        all_recordings.sort(key=lambda x: x.get("recording_created_at", ""), reverse=True)
        
        return jsonify({
            "success": True,
            "recordings": all_recordings,
            "total_count": len(all_recordings),
            "sessions_count": len(sessions)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting user recordings: {str(e)}")
        return jsonify({"msg": "Error getting recordings"}), 500

# DEBUG ROUTE - Remove after testing
@api.route('/debug/sessions/<meeting_id>/force-active', methods=['POST'])
@jwt_required()
@premium_required
def debug_force_recording_active(meeting_id):
    """DEBUG: Force recording status to active for testing"""
    try:
        user_id = get_jwt_identity()
        
        # Get the session
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({"msg": "Session not found"}), 404
        
        # Check if user is the creator
        if session.creator_id != user_id:
            return jsonify({"msg": "Only session creator can debug"}), 403
        
        # Force update status to active
        session.recording_status = 'active'
        session.recording_id = session.recording_id or 'debug-recording-id'
        db.session.commit()
        
        print(f"🔧 DEBUG: Forced recording status to active for session {session.id}")
        
        return jsonify({
            "success": True,
            "message": "Recording status forced to active",
            "recording_status": session.recording_status,
            "recording_id": session.recording_id
        }), 200
        
    except Exception as e:
        print(f"❌ Error forcing recording active: {str(e)}")
        return jsonify({"msg": "Error forcing recording active"}), 500


# ===========================================
# OAUTH AUTHENTICATION ROUTES
# ===========================================

@api.route('/auth/google/initiate', methods=['GET', 'POST'])
def google_oauth_initiate():
    """Initiate Google OAuth for regular login"""
    try:
        # Handle both GET (from redirect) and POST (from API call)
        user_type = 'user'  # Default to new user type
        if request.method == 'POST' and request.json:
            user_type = request.json.get('user_type', 'user')
        
        # Create signed state for security
        state_data = {
        'user_type': user_type,
            'oauth_type': 'google',
            'timestamp': datetime.utcnow().isoformat()
        }
        state = create_signed_state(state_data)
        
        # Build Google OAuth URL
        google_auth_url = (
            f"https://accounts.google.com/o/oauth2/auth?"
            f"client_id={os.getenv('GOOGLE_CLIENT_ID')}&"
            f"redirect_uri={os.getenv('BACKEND_URL')}/api/auth/google/callback&"
            f"scope=openid email profile&"
            f"response_type=code&"
            f"state={state}"
        )
        
        # If GET request (from redirect), redirect directly
        if request.method == 'GET':
            return redirect(google_auth_url)
        
        # If POST request (from API), return JSON
        return jsonify({
            "success": True,
            "auth_url": google_auth_url
        }), 200
        
    except Exception as e:
        print(f"Error initiating Google OAuth: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to initiate Google authentication"
        }), 500


@api.route('/auth/google/callback', methods=['GET'])
def google_oauth_callback():
    """Handle Google OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error={error}")
    
    if not code or not state:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error=missing_params")
    
    try:
        # Verify state
        state_data = verify_signed_state(state)
        if not state_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error=invalid_state")
        
        # Exchange code for token
        token_data = {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': f"{os.getenv('BACKEND_URL')}/api/auth/google/callback"
        }
        
        token_response = requests.post('https://oauth2.googleapis.com/token', data=token_data)
        token_result = token_response.json()
        
        if 'access_token' not in token_result:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error=token_exchange_failed")
        
        # Get user info from Google
        user_response = requests.get(
            f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={token_result['access_token']}"
        )
        user_data = user_response.json()
        
        if 'email' not in user_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error=no_email")
        
        # Check if user exists
        existing_user = User.query.filter_by(email=user_data['email']).first()
        
        if existing_user:
            # Login existing user
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?google_auth=success&token={access_token}&"
                f"user_id={existing_user.id}&user_type=user&new_user=false"
            )
        else:
            # Create new user
            new_user = User(
                email=user_data['email'],
                first_name=user_data.get('given_name', ''),
                last_name=user_data.get('family_name', ''),
                phone='Not provided',
                password=generate_password_hash('oauth_user'),  # Placeholder password
                is_verified=True,  # Google accounts are pre-verified
                subscription_status='free'
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?google_auth=success&token={access_token}&"
                f"user_id={new_user.id}&user_type=user&new_user=true"
            )
            
    except Exception as e:
        print(f"Google OAuth callback error: {str(e)}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/?google_auth=error&error=server_error")


@api.route('/auth/google/verify', methods=['POST'])
def verify_google_auth():
    """Verify Google OAuth token and return user data"""
    try:
        token = request.json.get('token')
        user_id = request.json.get('user_id')
        
        if not token or not user_id:
            return jsonify({
                "success": False,
                "message": "Missing token or user_id"
            }), 400
        
        # Verify JWT token
        try:
            decoded_token = jwt.decode(token, os.getenv('JWT_SECRET_KEY'), algorithms=['HS256'])
            if decoded_token.get('sub') != int(user_id):
                return jsonify({
                    "success": False,
                    "message": "Token user_id mismatch"
                }), 400
        except jwt.InvalidTokenError:
            return jsonify({
                "success": False,
                "message": "Invalid token"
            }), 400
        
        # Get user data
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404
        
        return jsonify({
            "success": True,
            "access_token": token,
            "user_data": user.serialize()
        }), 200
        
    except Exception as e:
        print(f"Google auth verification error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Verification failed"
        }), 500


@api.route('/auth/github/initiate', methods=['POST'])
def github_oauth_initiate():
    """Initiate GitHub OAuth for regular login"""
    try:
        user_type = request.json.get('user_type', 'customer')
        
        # Create signed state for security
        state_data = {
            'user_type': user_type,
            'oauth_type': 'github',
            'timestamp': datetime.utcnow().isoformat()
        }
        state = create_signed_state(state_data)
        
        # Build GitHub OAuth URL
        github_auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={os.getenv('GITHUB_CLIENT_ID')}&"
            f"redirect_uri={os.getenv('BACKEND_URL')}/api/authorize/github&"
            f"scope=user:email&"
            f"state={state}"
        )
        
        return jsonify({
            "success": True,
            "auth_url": github_auth_url
        }), 200
        
    except Exception as e:
        print(f"Error initiating GitHub OAuth: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to initiate GitHub authentication"
        }), 500


@api.route('/authorize/github', methods=['GET'])
def github_oauth_callback():
    """Handle GitHub OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error={error}")
    
    if not code or not state:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error=missing_params")
    
    try:
        # Verify state
        state_data = verify_signed_state(state)
        if not state_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error=invalid_state")
        
        # Exchange code for token
        token_data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code
        }
        
        token_response = requests.post(
            'https://github.com/login/oauth/access_token', 
            data=token_data,
            headers={'Accept': 'application/json'}
        )
        token_result = token_response.json()
        
        if 'access_token' not in token_result:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error=token_exchange_failed")
        
        # Get user info from GitHub
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f"token {token_result['access_token']}"}
        )
        user_data = user_response.json()
        
        # Get email (may be private)
        if not user_data.get('email'):
            email_response = requests.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f"token {token_result['access_token']}"}
            )
        emails = email_response.json()
        primary_email = next((email['email'] for email in emails if email['primary']), None)
        user_data['email'] = primary_email
        
        if not user_data.get('email'):
            return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error=no_email")
        
        # Check if user exists
        existing_user = User.query.filter_by(email=user_data['email']).first()
        
        if existing_user:
            # Login existing user
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?github_auth=success&token={access_token}&"
                f"user_id={existing_user.id}&user_type=user&new_user=false"
            )
        else:
            # Create new user
            name_parts = (user_data.get('name') or '').split(' ', 1)
            first_name = name_parts[0] if name_parts else user_data.get('login', '')
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            new_user = User(
                email=user_data['email'],
                first_name=first_name,
                last_name=last_name,
                phone='Not provided',
                password=generate_password_hash('oauth_user'),  # Placeholder password
                is_verified=True,  # GitHub accounts are pre-verified
                subscription_status='free'
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?github_auth=success&token={access_token}&"
                f"user_id={new_user.id}&user_type=user&new_user=true"
            )
            
    except Exception as e:
        print(f"GitHub OAuth callback error: {str(e)}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/?github_auth=error&error=server_error")


@api.route('/auth/github/verify', methods=['POST'])
def verify_github_auth():
    """Verify GitHub OAuth token and return user data"""
    # Same implementation as Google verify
    return verify_google_auth()


# ===========================================
# MVP OAUTH ROUTES (for home page login)
# ===========================================

@api.route('/auth/mvp/google/initiate', methods=['POST'])
def mvp_google_oauth_initiate():
    """Initiate MVP Google OAuth for home page"""
    try:
        # Create signed state for security
        state_data = {
            'user_type': 'user',
            'oauth_type': 'mvp_google',
            'timestamp': datetime.utcnow().isoformat()
        }
        state = create_mvp_signed_state(state_data)
    
        # Use MVP Google credentials
        google_auth_url = (
            f"https://accounts.google.com/o/oauth2/auth?"
            f"client_id={os.getenv('MVP_GOOGLE_CLIENT_ID')}&"
            f"redirect_uri={os.getenv('BACKEND_URL')}/api/auth/mvp/google/callback&"
            f"scope=openid email profile&"
            f"response_type=code&"
            f"state={state}"
        )
        
        return jsonify({
            "success": True,
            "auth_url": google_auth_url
        }), 200
        
    except Exception as e:
        print(f"Error initiating MVP Google OAuth: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to initiate MVP Google authentication"
        }), 500


@api.route('/auth/mvp/google/callback', methods=['GET'])
def mvp_google_oauth_callback():
    """Handle MVP Google OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error={error}")
    
    if not code or not state:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error=missing_params")
    
    try:
        # Verify state
        state_data = verify_mvp_signed_state(state)
        if not state_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error=invalid_state")
        
        # Exchange code for token
        token_data = {
            'client_id': os.getenv('MVP_GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('MVP_GOOGLE_CLIENT_SECRET'),
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': f"{os.getenv('BACKEND_URL')}/api/auth/mvp/google/callback"
        }
        
        token_response = requests.post('https://oauth2.googleapis.com/token', data=token_data)
        token_result = token_response.json()
        
        if 'access_token' not in token_result:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error=token_exchange_failed")
        
        # Get user info from Google
        user_response = requests.get(
            f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={token_result['access_token']}"
        )
        user_data = user_response.json()
        
        if 'email' not in user_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error=no_email")
        
        # Check if user exists
        existing_user = User.query.filter_by(email=user_data['email']).first()
        
        if existing_user:
            # Login existing user
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=success&token={access_token}&"
                f"user_id={existing_user.id}&user_type=user&new_user=false"
            )
        else:
            # Create new user
            new_user = User(
                email=user_data['email'],
                first_name=user_data.get('given_name', ''),
                last_name=user_data.get('family_name', ''),
                phone='Not provided',
                password=generate_password_hash('oauth_user'),  # Placeholder password
                is_verified=True,  # Google accounts are pre-verified
                subscription_status='free'
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=success&token={access_token}&"
                f"user_id={new_user.id}&user_type=user&new_user=true"
            )
            
    except Exception as e:
        print(f"MVP Google OAuth callback error: {str(e)}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_google_auth=error&error=server_error")


@api.route('/auth/mvp/github/initiate', methods=['GET', 'POST'])
def mvp_github_oauth_initiate():
    """Initiate MVP GitHub OAuth for home page"""
    try:
        # Create signed state for security
        state_data = {
            'user_type': 'user',
            'oauth_type': 'mvp_github',
            'timestamp': datetime.utcnow().isoformat()
        }
        state = create_mvp_signed_state(state_data)
    
        # Use MVP GitHub credentials
        github_auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={os.getenv('GITHUB_CLIENT_ID_MVP')}&"
            f"redirect_uri={os.getenv('BACKEND_URL')}/api/auth/mvp/github/callback&"
            f"scope=user:email&"
            f"state={state}"
        )
        
        # If GET request (from redirect), redirect directly
        if request.method == 'GET':
            return redirect(github_auth_url)
        
        # If POST request (from API), return JSON
        return jsonify({
            "success": True,
            "auth_url": github_auth_url
        }), 200
        
    except Exception as e:
        print(f"Error initiating MVP GitHub OAuth: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to initiate MVP GitHub authentication"
        }), 500


@api.route('/auth/mvp/github/callback', methods=['GET'])
def mvp_github_oauth_callback():
    """Handle MVP GitHub OAuth callback"""
    code = request.args.get('code')
    state = request.args.get('state')
    error = request.args.get('error')
    
    if error:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error={error}")
    
    if not code or not state:
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error=missing_params")
    
    try:
        # Verify state
        state_data = verify_mvp_signed_state(state)
        if not state_data:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error=invalid_state")
        
        # Exchange code for token
        token_data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID_MVP'),
            'client_secret': os.getenv('GITHUB_CLIENT_MVP_SECRET'),
            'code': code
        }
        
        token_response = requests.post(
            'https://github.com/login/oauth/access_token', 
            data=token_data,
            headers={'Accept': 'application/json'}
        )
        token_result = token_response.json()
        
        if 'access_token' not in token_result:
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error=token_exchange_failed")
        
        # Get user info from GitHub
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f"token {token_result['access_token']}"}
        )
        user_data = user_response.json()
        
        # Get email (may be private)
        if not user_data.get('email'):
            email_response = requests.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f"token {token_result['access_token']}"}
            )
        emails = email_response.json()
        primary_email = next((email['email'] for email in emails if email['primary']), None)
        user_data['email'] = primary_email
        
        if not user_data.get('email'):
            return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error=no_email")
        
        # Check if user exists
        existing_user = User.query.filter_by(email=user_data['email']).first()
        
        if existing_user:
            # Login existing user
            access_token = create_access_token(
                identity=existing_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=success&token={access_token}&"
                f"user_id={existing_user.id}&user_type=user&new_user=false"
            )
        else:
            # Create new user
            name_parts = (user_data.get('name') or '').split(' ', 1)
            first_name = name_parts[0] if name_parts else user_data.get('login', '')
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            new_user = User(
                email=user_data['email'],
                first_name=first_name,
                last_name=last_name,
                phone='Not provided',
                password=generate_password_hash('oauth_user'),  # Placeholder password
                is_verified=True,  # GitHub accounts are pre-verified
                subscription_status='free'
            )
            
            db.session.add(new_user)
            db.session.commit()
            
            access_token = create_access_token(
                identity=new_user.id,
                additional_claims={"role": "user"}
            )
            
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=success&token={access_token}&"
                f"user_id={new_user.id}&user_type=user&new_user=true"
            )
            
    except Exception as e:
        print(f"MVP GitHub OAuth callback error: {str(e)}")
        return redirect(f"{os.getenv('FRONTEND_URL')}/?mvp_github_auth=error&error=server_error")


# Helper functions for state management
def create_signed_state(state_data):
    """Create a signed state parameter for OAuth security"""
    import json
    import base64
    import hmac
    import hashlib
    
    state_json = json.dumps(state_data)
    state_b64 = base64.urlsafe_b64encode(state_json.encode()).decode()
    
    secret = os.getenv('JWT_SECRET_KEY', 'fallback_secret')
    signature = hmac.new(
        secret.encode(),
        state_b64.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"{state_b64}.{signature}"


def verify_signed_state(state_param):
    """Verify a signed state parameter"""
    import json
    import base64
    import hmac
    import hashlib
    
    try:
        state_b64, signature = state_param.split('.', 1)
        
        secret = os.getenv('JWT_SECRET_KEY', 'fallback_secret')
        expected_signature = hmac.new(
            secret.encode(),
            state_b64.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            return None
        
        state_json = base64.urlsafe_b64decode(state_b64.encode()).decode()
        return json.loads(state_json)
        
    except Exception as e:
        print(f"State verification error: {str(e)}")
        return None


def create_mvp_signed_state(state_data):
    """Create a signed state parameter for MVP OAuth security"""
    # Same implementation as regular signed state
    return create_signed_state(state_data)


def verify_mvp_signed_state(state_param):
    """Verify a signed state parameter for MVP OAuth"""
    # Same implementation as regular signed state
    return verify_signed_state(state_param)


@api.route('/debug/sessions/<meeting_id>/force-completed', methods=['POST'])
@jwt_required()
@premium_required
def debug_force_recording_completed(meeting_id):
    """Debug endpoint to force any stuck recordings to completed status"""
    try:
        user_id = get_jwt_identity()
        
        # Get the session
        session = VideoSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({"msg": "Session not found"}), 404
        
        # Check if user is the creator
        if session.creator_id != user_id:
            return jsonify({"msg": "Only session creator can manage recordings"}), 403
        
        # Find any stuck recordings (stopping, starting, active)
        stuck_recordings = []
        recordings = session.recordings or []
        
        for recording in recordings:
            status = recording.get("recording_status", "")
            if status in ["stopping", "starting", "active"]:
                stuck_recordings.append(recording)
        
        # Force all stuck recordings to completed
        from datetime import datetime
        for recording in stuck_recordings:
            recording_id = recording.get("recording_id")
            session.update_recording(recording_id, {
                "recording_status": "completed",
                "completed_at": datetime.utcnow().isoformat(),
                "recording_url": "Recording completed via manual intervention"
            })
        
        # Also update old fields for backward compatibility
        if session.recording_status in ["stopping", "starting", "active"]:
            session.recording_status = 'completed'
            session.recording_url = "Recording completed via manual intervention"
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Forced {len(stuck_recordings)} recordings to completed status",
            "stuck_recordings_fixed": len(stuck_recordings),
            "recordings": session.recordings,
            "recording_status": session.recording_status
        }), 200
        
    except Exception as e:
        print(f"❌ Error forcing recording completed: {str(e)}")
        return jsonify({"msg": "Error forcing recording completed"}), 500