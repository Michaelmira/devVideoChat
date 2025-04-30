from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.ext.mutable import MutableList, MutableDict
from sqlalchemy.types import ARRAY, JSON
from sqlalchemy import DateTime, Enum
from enum import Enum as PyEnum

import datetime


db = SQLAlchemy()

    
class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    phone = db.Column(db.String(30), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(256), unique=False, nullable=False)
    is_active = db.Column(db.Boolean(), unique=False,)
    last_active = db.Column(db.DateTime(timezone=True), unique=False)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    about_me = db.Column(db.String(2500), unique=False)

    profile_photo = db.relationship("CustomerImage", back_populates="customer", uselist=False)
    # sessions = db.relationship("Session", back_populates="customer", lazy="dynamic")

    def __repr__(self):
        return f'<Customer {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "is_active": self.is_active,
            "last_active": self.last_active,
            "date_joined": self.date_joined,
            "profile_photo": self.profile_photo.serialize() if self.profile_photo else None,
            "about_me": self.about_me,
            # "sessions": [session.id for session in self.sessions]
        }
    
class CustomerImage(db.Model):
    """Profile face image to be uploaded by the customer """

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"), nullable=False, unique=True)
    customer = db.relationship("Customer", back_populates="profile_photo", uselist=False)

    def __init__(self, public_id, image_url, customer_id):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.customer_id = customer_id

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
        }
    
class Mentor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    calendly_url = db.Column(db.String(500), nullable=True)
    





    is_active = db.Column(db.Boolean, default=True)
    last_active = db.Column(DateTime(timezone=True), unique=False)
    password = db.Column(db.String(256), unique=False, nullable=False)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    nick_name = db.Column(db.String(30), unique=False)
    phone = db.Column(db.String(30), nullable=False, index=True)
    city = db.Column(db.String(30), unique=False, nullable=False)
    what_state = db.Column(db.String(30), unique=False, nullable=False)
    country = db.Column(db.String(30), unique=False, nullable=False)
    about_me = db.Column(db.String(2500), unique=False)
    years_exp = db.Column(db.String(30), unique=False)
    skills = db.Column(MutableList.as_mutable(ARRAY(db.String(255))), default=list)
    days = db.Column(MutableList.as_mutable(ARRAY(db.String(255))), default=list) ## Days Avaiable 
    price = db.Column(db.Numeric(10,2), nullable=True)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    google_oauth_credentials = db.Column(db.Text, nullable=True)
    # confirmed_sessions = db.relationship("Session", back_populates="mentor")
    

    profile_photo = db.relationship("MentorImage", back_populates="mentor", uselist=False)   ######
    portfolio_photos = db.relationship("PortfolioPhoto", back_populates="mentor")   ######

    stripe_account_id = db.Column(db.String(255), unique=True, nullable=True)

    def __repr__(self):
        return f'<Mentor {self.email}>'

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "last_active": self.last_active,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "nick_name": self.nick_name,
            "phone": self.phone,
            "city": self.city,
            "what_state": self.what_state,
            "country": self.country,
            "years_exp": self.years_exp,
            "skills": [skill for skill in self.skills],
            # "confirmed_sessions": [session.serialize() for session in self.confirmed_sessions] if self.confirmed_sessions else [],
            "days": [day for day in self.days],
            "calendly_url": self.calendly_url,
            "profile_photo": self.profile_photo.serialize() if self.profile_photo else None,
            "portfolio_photos": [portfolio_photo.serialize() for portfolio_photo in self.portfolio_photos],
            "about_me": self.about_me,
            "price": str(self.price)
        }

class MentorImage(db.Model):
    """Profile face image to be uploaded by the mentor for profile """

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor.id"), nullable=False, unique=True)
    mentor = db.relationship("Mentor", back_populates="profile_photo", uselist=False)
    position_x = db.Column(db.Float, nullable=True)
    position_y = db.Column(db.Float, nullable=True)
    scale = db.Column(db.Float, nullable=True)

    def __init__(self, public_id, image_url, mentor_id, position_x, position_y, scale):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.mentor_id = mentor_id
        self.position_x = position_x
        self.position_y = position_y
        self.scale = scale

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "scale": self.scale
        }
    
class PortfolioPhoto(db.Model):
    """Portfolio Images to be uploaded by the mentor for profile """

    # __table_args__ = (
    #     db.UniqueConstraint("user_username", name="unique_user_image"),
    # )
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor.id"), nullable=False)
    mentor = db.relationship("Mentor", back_populates="portfolio_photos")

    def __init__(self, public_id, image_url, mentor_id):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.mentor_id = mentor_id

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
    }