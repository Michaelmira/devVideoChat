# decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from .models import User

def mentor_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") == "mentor":
            return fn(*args, **kwargs)
        else:
            return jsonify(msg="Mentors only!"), 403
    return wrapper

def customer_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") == "customer":
            return fn(*args, **kwargs)
        else:
            return jsonify(msg="Customers only!"), 403
    return wrapper

def premium_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        
        # Get user from database
        user = User.query.get(user_id)
        if not user:
            return jsonify(msg="User not found"), 404
        
        # Check if user has premium subscription
        if user.subscription_status != 'premium':
            return jsonify(msg="Premium subscription required for recording features"), 403
        
        return fn(*args, **kwargs)
    return wrapper

