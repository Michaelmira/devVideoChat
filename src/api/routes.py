"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import logging
from datetime import datetime, timedelta, date, time as datetime_time 
import stripe

from flask import Flask, request, jsonify, url_for, Blueprint, current_app, redirect, session, Response
from flask_cors import CORS, cross_origin
import jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm.attributes import flag_modified

import cloudinary.uploader as uploader
from cloudinary.uploader import destroy
from cloudinary.api import delete_resources_by_tag

from api.services.videosdk_service import VideoSDKService

# Updated imports for new models
from api.models import db, User, UserImage, VideoSession
from api.utils import generate_sitemap, APIException
# Removed old decorators for mentor/customer system
from api.send_email import send_email, send_verification_email_code

import pytz
from enum import Enum as PyEnum

# from .googlemeet import meet_service
from urllib.parse import urlencode

# from .mentorGoogleCalendar import calendar_service
import json
from google.oauth2.credentials import Credentials
import requests # For making HTTP requests to Calendly
import secrets # For generating secure state tokens for OAuth

from datetime import datetime as dt
from decimal import Decimal
import time

from api.calendar_utils import generate_icalendar_content



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
        "creator_name": session.creator.first_name if session.creator else "Host"
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
        
        # Create a simple payment intent for $3 (not a subscription yet)
        payment_intent = stripe.PaymentIntent.create(
            amount=300,  # $3.00 in cents
            currency='usd',
            customer=user.stripe_customer_id,
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
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    if user.subscription_status == 'premium':
        return jsonify({"msg": "User already has premium subscription"}), 400
    
    try:
        data = request.get_json()
        payment_intent_id = data.get('payment_intent_id')
        
        if not payment_intent_id:
            return jsonify({"msg": "Payment intent ID required"}), 400
        
        # Verify the payment intent was successful
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status != 'succeeded':
            return jsonify({"msg": "Payment not completed"}), 400
        
        # Verify this payment belongs to this user
        if payment_intent.customer != user.stripe_customer_id:
            return jsonify({"msg": "Payment verification failed"}), 400
        
        # Get the payment method from the successful payment intent
        payment_method = payment_intent.payment_method
        
        # Attach payment method to customer (if not already attached)
        try:
            stripe.PaymentMethod.attach(
                payment_method,
                customer=user.stripe_customer_id
            )
        except stripe.error.InvalidRequestError:
            # Payment method already attached, that's fine
            pass
        
        # Update customer's default payment method
        stripe.Customer.modify(
            user.stripe_customer_id,
            invoice_settings={
                'default_payment_method': payment_method
            }
        )
        
        # Create the subscription with automatic payment behavior
        subscription = stripe.Subscription.create(
            customer=user.stripe_customer_id,
            items=[{
                'price': os.getenv('STRIPE_PRICE_ID')  # $3/month price ID
            }],
            # Start immediately with default payment method
            payment_behavior='default_incomplete',
            expand=['latest_invoice.payment_intent']
        )
        
        # Pay the first invoice immediately if it's not already paid
        if subscription.latest_invoice and subscription.latest_invoice.status != 'paid':
            stripe.Invoice.pay(
                subscription.latest_invoice.id,
                payment_method=payment_method
            )
        
        # Update user status immediately
        user.subscription_status = 'premium'
        user.subscription_id = subscription.id
        if subscription.current_period_end:
            user.current_period_end = datetime.fromtimestamp(subscription.current_period_end)
        db.session.commit()
        
        print(f"🔍 DEBUG - Created subscription: {subscription.id} for user: {user_id}")
        
        return jsonify({
            "msg": "Subscription created successfully",
            "subscription_id": subscription.id,
            "status": "active"
        }), 200
        
    except Exception as e:
        print(f"Error confirming subscription: {str(e)}")
        return jsonify({"msg": "Failed to confirm subscription"}), 500


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