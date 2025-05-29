"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
import os
import logging
from datetime import datetime, timedelta, date
import stripe

from flask import Flask, request, jsonify, url_for, Blueprint, current_app, redirect
from flask_cors import CORS
import jwt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm.attributes import flag_modified

import cloudinary.uploader as uploader
from cloudinary.uploader import destroy
from cloudinary.api import delete_resources_by_tag

from api.models import db, Mentor, Customer, MentorImage, PortfolioPhoto, Booking, BookingStatus
from api.utils import generate_sitemap, APIException
from api.decorators import mentor_required, customer_required
from api.send_email import send_email


import pytz
from enum import Enum as PyEnum

# from .googlemeet import meet_service
from urllib.parse import urlencode

# from .mentorGoogleCalendar import calendar_service
import json
from google.oauth2.credentials import Credentials
import requests # For making HTTP requests to Calendly


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)



@api.route('/current/user')
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    role = get_jwt()['role']

    if role == 'mentor':
        mentor = Mentor.query.get(user_id)
        if mentor is None:
            return jsonify({"msg": "No user with this email exists."}), 404
        return jsonify(role = "mentor", user_data = mentor.serialize())
    
    if role == 'customer':
        customer = Customer.query.get(user_id)
        if customer is None:
            return jsonify({"msg": "No user with this email exists."}), 404
        return jsonify(role = "customer", user_data = customer.serialize())


# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start
# Mentor routes Start # Mentor routes Start # Mentor routes Start


@api.route('/mentor/signup', methods=['POST'])
def mentor_signup():

    email = request.json.get("email", None)
    password = request.json.get("password", None)
    first_name = request.json.get("first_name", None)
    last_name = request.json.get("last_name", None)
    city = request.json.get("city", None)
    what_state = request.json.get("what_state", None)
    country = request.json.get("country", None)
    phone = request.json.get("phone", "None")

    if email is None or password is None or first_name is None or last_name is None or city is None or what_state is None or country is None or phone is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    existingMentorEmail = Mentor.query.filter_by(email=email).one_or_none()
    if existingMentorEmail:
        return jsonify({"msg": "An account associated with the email already exists"}), 409
    existingMentorPhone = Mentor.query.filter_by(phone=phone).one_or_none()
    if existingMentorPhone:
        return jsonify({"msg": "An account associated with this number already exists. Please try a different phone number."}), 409

    mentor = Mentor(
        email=email, 
        password=generate_password_hash(password), 
        first_name=first_name, 
        last_name=last_name, 
        city=city, 
        what_state=what_state, 
        country=country, 
        phone=phone
    )
    db.session.add(mentor)
    db.session.commit()
    db.session.refresh(mentor)
    response_body = {
        "msg": "Mentor Account successfully created!",
        "mentor":mentor.serialize()
    }
    return jsonify(response_body), 201

@api.route('/mentor/login', methods=['POST'])
def mentor_login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)

    if email is None or password is None:
        return jsonify({"msg": "Email and password are required."}), 400
    
    mentor = Mentor.query.filter_by(email=email).one_or_none()
    if mentor is None:
        return jsonify({"msg": "No user with this email exists."}), 404
    
    if not check_password_hash(mentor.password, password):
        return jsonify({"msg": "Incorrect password, please try again."}), 401

    access_token = create_access_token(
        identity=mentor.id, 
        additional_claims={"role": "mentor"},
    )
    return jsonify({
        "access_token":access_token,
        "mentor_id": mentor.id,
        "mentor_data": mentor.serialize()
    }), 200

# @api.route("/forgot-password", methods=["POST"])
# def forgot_password():
#     data=request.json
#     email=data.get("email")
#     # want to get user type in the same fashion as email
#     if not email:
#         return jsonify({"message": "Email is required"}), 400
    
#     user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
#     if user is None:
#         return jsonify({"message": "Email does not exist"}), 400
    
#     expiration_time = datetime.utcnow() + timedelta(hours=1)
#     token = jwt.encode({"email": email, "exp": expiration_time}, os.getenv("FLASK_APP_KEY"), algorithm="HS256")

#     # /?userType = {usertype} in the email value
#     # email_value = f"Here is the password recovery link!\n{os.getenv('FRONTEND_URL')}/reset-password?token={token}"
#     email_value = f"Here is the password recovery link!\n{os.getenv('FRONTEND_URL')}/?token={token}"
#     send_email(email, email_value, "Subject: Password recovery for devMentor")
#     return jsonify({"message": "Recovery password email has been sent!"}), 200

@api.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    
    if not email:
        return jsonify({"message": "Email is required"}), 400
    
    user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
    if user is None:
        return jsonify({"message": "Email does not exist"}), 400
    
    expiration_time = datetime.utcnow() + timedelta(hours=3)
    token = jwt.encode({"email": email, "exp": expiration_time}, os.getenv("FLASK_APP_KEY"), algorithm="HS256")

    reset_link = f"{os.getenv('FRONTEND_URL')}/?token={token}"
    
    email_html = f"""
    <html>
    <body style="color: #333;">
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello {user.first_name},</p>
            <p>We received a request to reset your password for your devMentor account. If you didn't make this request, you can safely ignore this email.</p>
            <p>To reset your password, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" 
                   style="background-color: #4CAF50; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 4px; 
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you're having trouble clicking the button, you can also copy and paste the link from the button into your browser.</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
                Best regards,<br>
                The devMentor Team
            </p>
        </div>
    </body>
    </html>
    """
    
    send_email(email, email_html, "Password Reset Request: devMentor")
    return jsonify({"message": "Recovery password email has been sent!"}), 200

# @api.route("/reset-password/<token>", methods=["PUT"])
# def reset_password(token):
#     data = request.get_json()
#     password = data.get("password")

#     if not password:
#         return jsonify({"message": "Please provide a new password."}), 400

#     try:
#         decoded_token = jwt.decode(token, os.getenv("FLASK_APP_KEY"), algorithms=["HS256"])
#         email = decoded_token.get("email")
#     # except Exception as e:
#     #     return jsonify({"message": "Invalid or expired token."}), 400
#     except jwt.ExpiredSignatureError:
#         return jsonify({"message": "Token has expired"}), 400
#     except jwt.InvalidTokenError:
#         return jsonify({"message": "Invalid token"}), 400

#     # email = json_secret.get('email')
#     # if not email:
#     #     return jsonify({"message": "Invalid token data."}), 400

#     mentor = Mentor.query.filter_by(email=email).first()
#     customer = Customer.query.filter_by(email=email).first()

#     user = Mentor.query.filter_by(email=email).first() or Customer.query.filter_by(email=email).first()
#     if not user:
#         return jsonify({"message": "Email does not exist"}), 400

#     # user.password = hashlib.sha256(password.encode()).hexdigest()
#     user.password = generate_password_hash(password)
#     db.session.commit()

#     send_email(email, "Your password has been changed successfully.", "Password Change Notification")

#     return jsonify({
#         "message": "Password successfully changed.", 
#         "role": "mentor" if mentor else "customer" if customer else None
#     }), 200

@api.route("/reset-password/<token>", methods=["PUT"])
def reset_password(token):
    data = request.get_json()
    password = data.get("password")

    if not password:
        return jsonify({"message": "Please provide a new password."}), 400

    try:
        decoded_token = jwt.decode(token, os.getenv("FLASK_APP_KEY"), algorithms=["HS256"])
        email = decoded_token.get("email")
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired"}), 400
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 400

    # Query both tables
    mentor = Mentor.query.filter_by(email=email).first()
    customer = Customer.query.filter_by(email=email).first()

    # Check if email exists in either table
    if not mentor and not customer:
        return jsonify({"message": "Email does not exist"}), 400

    # Generate hashed password once
    hashed_password = generate_password_hash(password)

    # Update password in relevant table(s)
    if mentor:
        mentor.password = hashed_password
    if customer:
        customer.password = hashed_password

    db.session.commit()

    # Determine roles for response
    roles = []
    if mentor:
        roles.append("mentor")
    if customer:
        roles.append("customer")

    send_email(email, "Your password has been changed successfully.", "Password Change Notification")

    return jsonify({
        "message": "Password successfully changed.", 
        "roles": roles,
        "email": email
    }), 200


@api.route("/change-password", methods=["PUT"])
@jwt_required()  # This ensures that the request includes a valid JWT token
def change_password():
    data = request.json
    password = data.get("password")
    if not password:
        return jsonify({"message": "Please provide a new password."}), 400
    
    try:
        # This will now work because @jwt_required() has validated the token
        user_id = get_jwt_identity()
        print(f"Decoded JWT Identity: {user_id}")

        user = Mentor.query.get(user_id) or Customer.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        user.password = generate_password_hash(password)
        db.session.commit()
        
        # Send an email notification after the password has been changed
        email_body = "Your password has been changed successfully. If you did not request this change, please contact support."
        send_email(user.email, email_body, "Password Change Notification")

        return jsonify({"message": "Password changed successfully"}), 200
    except Exception as e:
        print(f"Token decryption failed: {str(e)}")
        logging.error(f"Error changing password: {str(e)}")
        return jsonify({"message": "An error occurred. Please try again later."}), 500

@api.route('/mentors', methods=['GET'])
def all_mentors():
   mentors = Mentor.query.all()
   return jsonify([mentor.serialize() for mentor in mentors]), 200

@api.route('/mentorsnosession', methods=['GET'])
def all_mentors_no_sessions():
    mentors = Mentor.query.all()
    serialized_mentors = [mentor.serialize() for mentor in mentors]
    # Remove confirmed_sessions from each mentor's data
    for mentor in serialized_mentors:
        mentor.pop('confirmed_sessions', None)
    return jsonify(serialized_mentors), 200

@api.route('/mentor/<int:mentor_id>', methods=['GET'])
def get_mentor_by_id(mentor_id):
    mentor = Mentor.query.get(mentor_id)
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    return jsonify(mentor.serialize()), 200

@api.route('/mentor', methods=['GET'])
@mentor_required
def mentor_by_id():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404

    return jsonify(mentor.serialize()), 200

@api.route('/mentor/edit-self', methods={'PUT'})
@mentor_required
def mentor_edit_self():
    email = request.json.get("email")
    is_active = request.json.get("is_active")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    nick_name = request.json.get("nick_name")
    phone = request.json.get("phone")
    city = request.json.get("city")
    what_state = request.json.get("what_state")
    country = request.json.get("country")
    years_exp = request.json.get("years_exp")
    skills = request.json.get("skills")
    days = request.json.get("days")
    price = request.json.get("price")
    about_me = request.json.get("about_me")
    calendly_url = request.json.get("calendly_url")
    
    profile_photo = request.json.get("profile_photo")
    position_x = profile_photo.get("position_x")
    position_y = profile_photo.get("position_y")
    scale = profile_photo.get("scale")

    print("position_x", position_x)
    print("position_y", position_y)
    print("Scale", scale)
    
    if email is None or first_name is None or last_name is None or city is None or what_state is None or country is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    
    mentor =  Mentor.query.filter_by(id=get_jwt_identity()).first()
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    mentor_img=MentorImage.query.filter_by(mentor_id=mentor.id).first()
    if mentor_img:
        if position_x:
            mentor_img.position_x=position_x
        if position_y:
            mentor_img.position_y=position_y
        if scale:
            mentor_img.scale=scale
    
    mentor.email=email
    mentor.is_active=is_active
    mentor.first_name=first_name
    mentor.last_name=last_name
    mentor.nick_name=nick_name
    mentor.phone=phone
    mentor.city=city    
    mentor.what_state=what_state
    mentor.country=country
    mentor.years_exp=years_exp
    mentor.skills=skills
    mentor.days=days
    mentor.price=price
    mentor.about_me=about_me
    mentor.calendly_url=calendly_url

    db.session.commit()
    db.session.refresh(mentor)

    response_body = {"msg": "Mentor Account sucessfully edited",
    "mentor":mentor.serialize()
    }
    return jsonify(response_body, 201)

@api.route('/mentor/upload-photo', methods =['POST'])
@mentor_required
def mentor_upload_photo():

    mentor =  Mentor.query.get(get_jwt_identity())
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404
    
    position_x = request.form.get("position_x")
    position_y = request.form.get("position_y")
    scale = request.form.get("scale")

    images = request.files.getlist("file")
    mentor_img=MentorImage.query.filter_by(mentor_id=mentor.id).all()
    for image_file in images:
        response = uploader.upload(image_file)
        print(response)
        if len(mentor_img) == 1:
            print(f"{response.items()}")
            mentor_img[0].image_url=response['secure_url']
            uploader.destroy(mentor_img[0].public_id)
            mentor_img[0].public_id=response['public_id']
            mentor_img[0].position_x=position_x
            mentor_img[0].position_y=position_y
            mentor_img[0].scale=scale
            db.session.commit()
        if len(mentor_img) == 0:
            new_image = MentorImage(public_id=response["public_id"], image_url=response["secure_url"],mentor_id=mentor.id, position_x=position_x, position_y=position_y, scale=scale)
            db.session.add(new_image)
            db.session.commit()

    return jsonify ({"Msg": "Image Sucessfully Uploaded"})

@api.route('/mentor/delete-photo', methods =['DELETE'])
@mentor_required
def mentor_delete_photo():
    mentor =  Mentor.query.get(get_jwt_identity())

    mentor_img=MentorImage.query.filter_by(mentor_id=get_jwt_identity()).first()
    uploader.destroy(mentor_img.public_id)
    db.session.delete(mentor_img)
    db.session.commit()

    return jsonify ({"Msg": "Image Sucessfully Deleted", "mentor": mentor.serialize()})


@api.route('/mentor/upload-portfolio-image', methods =['POST'])
@mentor_required
def mentor_upload_portfolio():

    mentor =  Mentor.query.filter_by(id=get_jwt_identity()).first()
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404

    images = request.files.getlist("file")
    print(images)
    for image_file in images:
        response = uploader.upload(image_file)
        if response["secure_url"] is None:
            return jsonify({"Msg": "An error occured while uploading 1 or more images"}), 500
        print(f"{response.items()}")
        new_image = PortfolioPhoto(public_id=response["public_id"], image_url=response["secure_url"],mentor_id=mentor.id)
        db.session.add(new_image)
        db.session.commit()
        db.session.refresh(mentor)

    return jsonify ({"Msg": "Image Sucessfully Uploaded"})

@api.route('/mentor/delete-portfolio-images', methods=['DELETE'])
@mentor_required
def delete_portfolio_images():
    mentor = Mentor.query.get(get_jwt_identity())
    if mentor is None:
        return jsonify({"msg": "No mentor found"}), 404

    image_indices = request.json.get('indices', [])
    images_to_delete = [mentor.portfolio_photos[i] for i in image_indices if i < len(mentor.portfolio_photos)]
    
    for image in images_to_delete:
        uploader.destroy(image.public_id)
        db.session.delete(image)
    
    db.session.commit()
    return jsonify({"msg": "Images successfully deleted"}), 200

@api.route('/mentor/delete/<int:cust_id>', methods =['DELETE'])
def delete_mentor(cust_id):
    mentor = Mentor.query.get(cust_id)
    if mentor is None:
        return jsonify({"msg": "mentor not found" }), 404
    
    # picture_public_ids = [image.image_url.split("/")[-1].split(".")[0] for image in work_order.images]

    # for public_id in picture_public_ids:
    #     delete_response = destroy(public_id)
    #     if delete_response.get("result") != "ok":
    #         print(f"Failed to delete picture with public ID: {public_id}")

    db.session.delete(mentor)
    db.session.commit()
    return jsonify({"msg": "mentor successfully deleted"}), 200


def get_mentor_id_from_token(token):
    try: 
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms = ['HS256'])
        print(f"Token payload: {payload}")
        return payload.get("mentor_id") or payload['sub']
    except jwt.ExpiredSignatureError:
        print("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Invalid Token: {e}")
        return None
    except KeyError: 
        print("mentor_id key not found")
        return None
    
@api.route('/mentor/deactivate', methods=['PUT'])
@jwt_required()
def deactivate_mentor():
    mentor_id = get_jwt_identity()
    if not mentor_id: 
        return jsonify({"msg": "invalid token"}), 401
    
    mentor = Mentor.query.get(mentor_id)
    if mentor:
        mentor.is_active = False
        db.session.commit()
        return jsonify({"msg": "Account deactivated successfully"}), 200
    else:
        return jsonify({"msg": "Mentor not found"}), 404

@api.route('/mentor/reactivate', methods=['PUT'])
@jwt_required()
def reactivate_mentor():
    mentor_id = get_jwt_identity()
    if not mentor_id: 
        return jsonify({"msg": "invalid token"}), 401
    
    mentor = Mentor.query.get(mentor_id)
    if mentor:
        mentor.is_active = True
        db.session.commit()
        return jsonify({"msg": "Account reactivated successfully"}), 200
    else:
        return jsonify({"msg": "Mentor not found"}), 404
    

# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End
# Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End # Mentor Routes End


# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start
# Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start # Customer Routes Start

@api.route('/customers', methods=['GET'])
def all_customers():
   customers = Customer.query.all()
   return jsonify([customer.serialize() for customer in customers]), 200

# @api.route('/customer/<int:cust_id>', methods=['GET'])
# # @mentor_required()
# def customer_by_id(cust_id):
#     # current_user_id = get_jwt_identity()
#     # current_user = User.query.get(current_user_id)

#     customer = Customer.query.get(cust_id)
#     if customer is None:
#         return jsonify({"msg": "No customer found"}), 404
    
#     return jsonify(customer.serialize()), 200

@api.route('/customer/signup', methods=['POST'])
def customer_signup():
   
    email = request.json.get("email", None)
    password = request.json.get("password", None)
    first_name = request.json.get("first_name", None)
    last_name = request.json.get("last_name", None)
    phone = request.json.get("phone", None)
    
    
    if first_name is None or last_name is None  or phone is None or email is None or password is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
    existingCustomerEmail = Customer.query.filter_by(email=email).one_or_none()
    if existingCustomerEmail:
        return jsonify({"msg": "An account associated with the email already exists"}), 409
    existingCustomerPhone = Customer.query.filter_by(phone=phone).one_or_none()
    if existingCustomerPhone:
        return jsonify({"msg": "An account associated with this phone number already exists. Please try a different phone number."}), 409
    
    customer = Customer(
        email=email, 
        password=generate_password_hash(password),
        first_name=first_name, 
        last_name=last_name, 
        phone=phone,
    ) 
    db.session.add(customer)
    db.session.commit()
    db.session.refresh(customer)
    response_body = {"msg": "Account succesfully created!", "customer":customer.serialize()}
    return jsonify(response_body), 201

@api.route('/customer/login', methods=['POST'])
def customer_login():
    email = request.json.get("email", None)
    password = request.json.get("password", None)
    if email is None or password is None:
        return jsonify({"msg": "No email or password"}), 400
    
    customer = Customer.query.filter_by(email=email).one_or_none()
    if customer is None:
        return jsonify({"msg": "no such user"}), 404
    if not check_password_hash(customer.password, password):
        return jsonify({"msg": "Bad email or password"}), 401

    access_token = create_access_token(
        identity=customer.id,
        additional_claims = {"role": "customer"} 
        )
    return jsonify({
        "access_token":access_token,
        "customer_id": customer.id,
        "customer_data": customer.serialize()
    }), 201

@api.route('/customer/edit-self', methods=['PUT'])
@customer_required
def handle_customer_edit_by_customer():
    email = request.json.get("email")
    first_name = request.json.get("first_name")
    last_name = request.json.get("last_name")
    city = request.json.get("city")
    what_state = request.json.get("what_state",None)
    country = request.json.get("country",None)
    phone = request.json.get("phone")
    
    if email is None or first_name is None or last_name is None or city is None or what_state is None is None or country is None or phone is None:
        return jsonify({"msg": "Some fields are missing in your request"}), 400
   
    customer = Customer.query.filter_by(id=get_jwt_identity()).first()
    if customer is None:
        return jsonify({"msg": "No customer found"}), 404
    
    customer.email=email 
    customer.first_name=first_name   
    customer.last_name=last_name 
    customer.city=city    
    customer.what_state=what_state    
    customer.country=country    
    customer.phone=phone
    db.session.commit()
    db.session.refresh(customer)
    
    response_body = {"msg": "Account succesfully edited!", "customer":customer.serialize()}
    return jsonify(response_body), 201

@api.route('/current-customer', methods=['GET'])
@jwt_required()
def get_current_customer():
    
    customer = Customer.query.get(get_jwt_identity())
    if customer is None:
        return jsonify({"msg": "No customer found"}), 404
    
    return jsonify(customer.serialize()), 200

@api.route('/customer/delete/<int:cust_id>', methods =['DELETE'])
def delete_customer(cust_id):
    customer = Customer.query.get(cust_id)
    if customer is None:
        return jsonify({"msg": "work order not found" }), 404
    
    # picture_public_ids = [image.image_url.split("/")[-1].split(".")[0] for image in work_order.images]

    # for public_id in picture_public_ids:
    #     delete_response = destroy(public_id)
    #     if delete_response.get("result") != "ok":
    #         print(f"Failed to delete picture with public ID: {public_id}")

    db.session.delete(customer)
    db.session.commit()
    return jsonify({"msg": "customer successfully deleted"}), 200


@api.route('/create-payment-intent', methods=['POST'])
@jwt_required()
def create_payment_intent():
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        
        data = request.get_json()
        customer_id = data.get('customer_id')
        customer_name = data.get('customer_name')
        mentor_id = data.get('mentor_id')
        mentor_name = data.get('mentor_name')
        amount = data.get('amount')  # Amount in cents
        
        # Validate data
        if not customer_id or not mentor_id or not amount:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create the payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",
            metadata={
                "customer_id": customer_id,
                "customer_name": customer_name,
                "mentor_id": mentor_id,
                "mentor_name": mentor_name
            }
        )
        
        return jsonify({
            'clientSecret': payment_intent.client_secret
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@api.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")  # You'll need to add this to your .env file
        
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return jsonify({"error": "Invalid signature"}), 400
    
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        
        # Extract the metadata we stored
        customer_id = payment_intent.metadata.get('customer_id')
        customer_name = payment_intent.metadata.get('customer_name')
        mentor_id = payment_intent.metadata.get('mentor_id')
        mentor_name = payment_intent.metadata.get('mentor_name')
        amount = payment_intent.amount
        
        # Log the payment (you could also save to a database if needed)
        current_app.logger.info(f"Payment succeeded: ${amount/100} from {customer_name} (ID: {customer_id}) to {mentor_name} (ID: {mentor_id})")
        
        # Here you could also send email notifications to the mentor and customer
        
    return jsonify({"status": "success"}), 200


@api.route('/track-booking', methods=['POST'])
@jwt_required()
def track_booking():
    try:
        user_id = get_jwt_identity()
        role = get_jwt()['role']
        data = request.get_json()
        
        # Required fields
        mentor_id = data.get('mentorId')
        paid_date_time = data.get('paidDateTime')
        client_email = data.get('clientEmail')
        amount = data.get('amount')
        status = data.get('status', 'paid')  # Default to 'paid'
        
        # Optional fields
        mentor_payout = data.get('mentorPayout')
        platform_fee = data.get('platformFee')
        
        # Validate data
        if not mentor_id or not paid_date_time or not amount:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Here you would add the booking to your database
        # This is just a placeholder - you'll need to create a Booking model
        # booking = Booking(
        #     mentor_id=mentor_id,
        #     customer_id=user_id if role == 'customer' else None,
        #     paid_date_time=paid_date_time,
        #     client_email=client_email,
        #     amount=amount,
        #     mentor_payout=mentor_payout,
        #     platform_fee=platform_fee,
        #     status=status
        # )
        # db.session.add(booking)
        # db.session.commit()
        
        # For now, just log it
        current_app.logger.info(f"Booking tracked: Mentor ID {mentor_id}, Date/Time: {paid_date_time}, Amount: ${amount}, Status: {status}")
        
        return jsonify({"success": True, "message": "Booking tracked successfully"}), 201
        
    except Exception as e:
        current_app.logger.error(f"Error tracking booking: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Calendly OAuth Configuration (should be in .env and loaded via os.getenv)
# CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
# CALENDLY_CLIENT_SECRET = os.getenv("CALENDLY_CLIENT_SECRET")
# CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI") # e.g., http://localhost:3001/api/calendly/oauth/callback or your production URI

@api.route('/calendly/oauth/initiate', methods=['GET'])
@mentor_required # Assuming you have a decorator to ensure mentor is logged in
def calendly_oauth_initiate():
    mentor_id = get_jwt_identity()
    mentor = Mentor.query.get(mentor_id)
    if not mentor:
        return jsonify({"msg": "Mentor not found"}), 404

    CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
    CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI")

    if not CALENDLY_CLIENT_ID or not CALENDLY_REDIRECT_URI:
        current_app.logger.error("Calendly OAuth environment variables not set.")
        return jsonify({"msg": "Calendly integration is not configured correctly."}), 500

    # Scopes: define what permissions your app needs.
    # For scheduling, you might need: 'default' or more specific ones like 'calendly_events.write'
    # Refer to Calendly API documentation for available scopes.
    # For simplicity, using 'default' often covers common use cases.
    # A more granular scope would be: "user_profile.read scheduling_links.read scheduled_events.read scheduled_events.write"
    # For creating events: event_types.read, scheduled_events.write, scheduling_links.read
    scopes = "event_types.read scheduled_events.write" # Example scopes for reading event types and creating events

    # Optional: use a state parameter for CSRF protection
    # state_param = secrets.token_urlsafe(16)
    # session['calendly_oauth_state'] = state_param # Store in session to verify in callback

    params = {
        'response_type': 'code',
        'client_id': CALENDLY_CLIENT_ID,
        'redirect_uri': CALENDLY_REDIRECT_URI,
        'scope': scopes,
        # 'state': state_param # Include if using state
    }
    authorization_url = f"https://auth.calendly.com/oauth/authorize?{urlencode(params)}"
    
    # Redirect the mentor to Calendly's authorization page
    return redirect(authorization_url, code=302)


@api.route('/calendly/oauth/callback', methods=['GET'])
# No jwt_required here initially as Calendly redirects without a JWT token.
# We'll need to associate the callback with the mentor, perhaps via the 'state' parameter or by having mentor log back in if state is lost.
# For simplicity, we'll assume the mentor is still identifiable or we re-authenticate if needed.
# A robust solution involves using the 'state' parameter to link back to the mentor's session.
def calendly_oauth_callback():
    authorization_code = request.args.get('code')
    # received_state = request.args.get('state') # Get state if used

    # # Verify state parameter to prevent CSRF (if used)
    # stored_state = session.pop('calendly_oauth_state', None)
    # if not stored_state or stored_state != received_state:
    #     current_app.logger.warning("Calendly OAuth state mismatch or missing.")
    #     # Redirect to an error page on the frontend
    #     return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-dashboard?calendly_error=state_mismatch", code=302)


    if not authorization_code:
        current_app.logger.error("Calendly OAuth callback missing authorization code.")
        # Redirect to an error page on the frontend
        return redirect(f"{os.getenv('FRONTEND_URL')}/mentor-dashboard?calendly_error=missing_code", code=302)

    CALENDLY_CLIENT_ID = os.getenv("CALENDLY_CLIENT_ID")
    CALENDLY_CLIENT_SECRET = os.getenv("CALENDLY_CLIENT_SECRET")
    CALENDLY_REDIRECT_URI = os.getenv("CALENDLY_REDIRECT_URI")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000") # Default for local dev

    if not CALENDLY_CLIENT_ID or not CALENDLY_CLIENT_SECRET or not CALENDLY_REDIRECT_URI:
        current_app.logger.error("Calendly OAuth environment variables for token exchange not set.")
        # Redirect to an error page on the frontend
        return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_error=config_error", code=302)

    token_url = "https://auth.calendly.com/oauth/token"
    payload = {
        'grant_type': 'authorization_code',
        'code': authorization_code,
        'redirect_uri': CALENDLY_REDIRECT_URI,
        'client_id': CALENDLY_CLIENT_ID,
        'client_secret': CALENDLY_CLIENT_SECRET
    }

    try:
        response = requests.post(token_url, data=payload)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        token_data = response.json()

        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        expires_in = token_data.get('expires_in') # Typically in seconds

        # Here, we need to identify the mentor.
        # This is where the 'state' parameter would be crucial to link back to the user session.
        # For this example, let's assume the mentor needs to be logged in,
        # and we can get their ID. This might require a slightly different flow or ensuring
        # the JWT token is somehow available or the mentor re-authenticates briefly.
        # A common pattern is to store the mentor_id in the session before redirecting to Calendly,
        # and retrieve it here. If using JWT in cookies, it might persist.
        # For now, we'll have to make this part more robust in a real app.
        # Let's assume we can get mentor_id. This is a placeholder for robust user identification.
        
        # >>> This part needs to be made robust: How to get mentor_id securely? <<<
        # One way: Use the state to pass a temporary token that can be used to retrieve mentor_id.
        # Another: After callback, show a page "Linking Calendly..." then require mentor to click a button that sends JWT.
        # For now, if you have a way to get mentor_id (e.g., if JWT is in secure cookie and mentor_required decorator could work after all), use it.
        # As a fallback, we might need to adjust the `@mentor_required` or how we identify the mentor.
        # For this simplified example, let's assume the mentor's JWT *is* somehow available,
        # perhaps through a secure, HttpOnly cookie that is sent with this callback request.
        # Or, the state parameter was used to store a temporary key to retrieve the mentor_id.

        # Attempt to get mentor identity. This might fail if JWT is not present.
        try:
            mentor_id = get_jwt_identity() # This would only work if JWT is sent with the callback
            # role = get_jwt().get('role')
            # if role != 'mentor':
            #     raise Exception("User is not a mentor")
        except Exception as e: # Catches if get_jwt_identity() fails (e.g. no token)
            current_app.logger.error(f"Could not identify mentor in Calendly callback: {e}. Mentor might need to re-login or state was lost.")
            return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_error=auth_failed_callback", code=302)


        mentor = Mentor.query.get(mentor_id)
        if not mentor:
            current_app.logger.error(f"Mentor with ID {mentor_id} not found during Calendly callback.")
            return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_error=user_not_found", code=302)

        mentor.calendly_access_token = access_token
        mentor.calendly_refresh_token = refresh_token
        if expires_in:
            mentor.calendly_token_expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))
        
        # It's also good practice to store the organization URI and user URI from Calendly if needed
        # mentor.calendly_user_uri = token_data.get('owner') 
        # mentor.calendly_organization_uri = token_data.get('organization')

        db.session.commit()
        current_app.logger.info(f"Successfully connected Calendly for mentor {mentor_id}")
        # Redirect to a success page on the frontend
        return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_success=true", code=302)

    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Calendly token exchange request failed: {e}")
        if e.response is not None:
            current_app.logger.error(f"Calendly error response: {e.response.text}")
        return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_error=token_exchange_failed", code=302)
    except Exception as e:
        current_app.logger.error(f"Error processing Calendly callback: {str(e)}")
        return redirect(f"{FRONTEND_URL}/mentor-dashboard?calendly_error=internal_error", code=302)

# ... (rest of your routes.py, including the new /finalize-booking endpoint to be added later)
# Remember to add:
# from api.models import Booking, BookingStatus (if not already there)
# And your @mentor_required decorator needs to be defined.