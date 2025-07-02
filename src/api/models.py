from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.ext.mutable import MutableList, MutableDict
from sqlalchemy.types import ARRAY, JSON
from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, Text
from enum import Enum as PyEnum
from sqlalchemy.orm import relationship

import datetime


db = SQLAlchemy()

# Renamed Customer to User, added subscription fields
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    phone = db.Column(db.String(30), nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(256), unique=False, nullable=False)
    is_active = db.Column(db.Boolean(), unique=False, default=True)
    last_active = db.Column(db.DateTime(timezone=True), unique=False)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    about_me = db.Column(db.String(2500), unique=False)
    is_verified = db.Column(db.Boolean(), default=False, nullable=False)
    verification_code = db.Column(db.String(6), nullable=True)

    # Add subscription fields
    subscription_status = db.Column(db.String(50), default='free')  # free, premium
    stripe_customer_id = db.Column(db.String(255))
    subscription_id = db.Column(db.String(255))
    current_period_end = db.Column(DateTime(timezone=True))

    profile_photo = db.relationship("UserImage", back_populates="user", uselist=False)

    def __repr__(self):
        return f'<User {self.email}>'

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
            "is_verified": self.is_verified,
            "subscription_status": self.subscription_status,
            "current_period_end": self.current_period_end.isoformat() if self.current_period_end else None,
        }
    
class UserImage(db.Model):
    """Profile face image to be uploaded by the user"""
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True)
    user = db.relationship("User", back_populates="profile_photo", uselist=False)

    def __init__(self, public_id, image_url, user_id):
        self.public_id = public_id
        self.image_url = image_url.strip()
        self.user_id = user_id

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
        }

# New VideoSession Model
class VideoSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, ForeignKey('user.id'), nullable=False)
    meeting_id = db.Column(db.String(255), unique=True, nullable=False)
    session_url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    expires_at = db.Column(DateTime(timezone=True), nullable=False)  # +6 hours
    max_duration_minutes = db.Column(db.Integer, default=50)  # 50 or 360
    started_at = db.Column(DateTime(timezone=True))
    status = db.Column(db.String(20), default='active')  # active, expired, ended
    
    # VideoSDK fields
    meeting_token = db.Column(db.Text, nullable=True)
    recording_url = db.Column(db.String(500), nullable=True)
    
    creator = relationship("User", backref=db.backref("video_sessions", lazy=True))

    def __repr__(self):
        return f'<VideoSession {self.meeting_id} - Creator: {self.creator_id} Status: {self.status}>'

    def serialize(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "session_url": self.session_url,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "max_duration_minutes": self.max_duration_minutes,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "status": self.status,
            "creator_name": f"{self.creator.first_name} {self.creator.last_name}" if self.creator else "Unknown",
            "has_recording": bool(self.recording_url)
        }

# Keep these models for backward compatibility during migration
# TODO: Remove these after migration is complete
class Customer(db.Model):
    __tablename__ = 'customer_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(30), unique=False, nullable=False)
    last_name = db.Column(db.String(30), unique=False, nullable=False)
    phone = db.Column(db.String(30), nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password = db.Column(db.String(256), unique=False, nullable=False)
    is_active = db.Column(db.Boolean(), unique=False,)
    last_active = db.Column(db.DateTime(timezone=True), unique=False)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    about_me = db.Column(db.String(2500), unique=False)
    is_verified = db.Column(db.Boolean(), default=False, nullable=False)
    verification_code = db.Column(db.String(6), nullable=True)

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
            "about_me": self.about_me,
            "is_verified": self.is_verified,
        }

# TODO: Remove these models after migration
class CustomerImage(db.Model):
    __tablename__ = 'customer_image_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer_deprecated.id"), nullable=False, unique=True)

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
        }

# TODO: Remove all these Mentor-related models after migration
class Mentor(db.Model):
    __tablename__ = 'mentor_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
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
    price = db.Column(db.Numeric(10,2), nullable=True)
    date_joined = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    google_oauth_credentials = db.Column(db.Text, nullable=True)
    is_verified = db.Column(db.Boolean(), default=False, nullable=False)
    verification_code = db.Column(db.String(6), nullable=True)
    linkedin_url = db.Column(db.String(500), nullable=True)
    github_url = db.Column(db.String(500), nullable=True)
    stripe_account_id = db.Column(db.String(255), unique=True, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_active": self.last_active,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "nick_name": self.nick_name,
            "phone": self.phone,
            "city": self.city,
            "what_state": self.what_state,
            "country": self.country,
            "years_exp": self.years_exp,
            "skills": [skill for skill in self.skills] if self.skills is not None else [],
            "about_me": self.about_me,
            "price": str(self.price),
            "linkedin_url": self.linkedin_url,
            "github_url": self.github_url
        }

# Deprecated models - keeping for migration compatibility
class MentorImage(db.Model):
    __tablename__ = 'mentor_image_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor_deprecated.id"), nullable=False, unique=True)
    position_x = db.Column(db.Float, nullable=True)
    position_y = db.Column(db.Float, nullable=True)
    scale = db.Column(db.Float, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "scale": self.scale
        }
    
class PortfolioPhoto(db.Model):
    __tablename__ = 'portfolio_photo_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(500), nullable=False, unique=True)
    image_url = db.Column(db.String(500), nullable=False, unique=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("mentor_deprecated.id"), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "image_url": self.image_url
        }

# Deprecated calendar models
class MentorAvailability(db.Model):
    __tablename__ = 'mentor_availability_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor_deprecated.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    timezone = db.Column(db.String(50), default='America/Los_Angeles', nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def serialize(self):
        return {
            "id": self.id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "timezone": self.timezone,
            "is_active": self.is_active
        }

class MentorUnavailability(db.Model):
    __tablename__ = 'mentor_unavailability_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor_deprecated.id'), nullable=False)
    start_datetime = db.Column(DateTime(timezone=True), nullable=False)
    end_datetime = db.Column(DateTime(timezone=True), nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    
    def serialize(self):
        return {
            "id": self.id,
            "start_datetime": self.start_datetime.isoformat(),
            "end_datetime": self.end_datetime.isoformat(),
            "reason": self.reason
        }

class CalendarSettings(db.Model):
    __tablename__ = 'calendar_settings_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey('mentor_deprecated.id'), nullable=False, unique=True)
    session_duration = db.Column(db.Integer, default=60)
    buffer_time = db.Column(db.Integer, default=15)
    advance_booking_days = db.Column(db.Integer, default=30)
    minimum_notice_hours = db.Column(db.Integer, default=24)
    timezone = db.Column(db.String(50), default='America/New_York')
    
    def serialize(self):
        return {
            "session_duration": self.session_duration,
            "buffer_time": self.buffer_time,
            "advance_booking_days": self.advance_booking_days,
            "minimum_notice_hours": self.minimum_notice_hours,
            "timezone": self.timezone
        }

class BookingStatus(PyEnum):
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    CONFIRMED = "confirmed"
    CANCELLED_BY_CUSTOMER = "cancelled_by_customer"
    CANCELLED_BY_MENTOR = "cancelled_by_mentor"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    REQUIRES_RATING = "requires_rating" 

class Booking(db.Model):
    __tablename__ = 'booking_deprecated'
    id = db.Column(db.Integer, primary_key=True)
    mentor_id = db.Column(db.Integer, ForeignKey('mentor_deprecated.id'), nullable=False)
    customer_id = db.Column(db.Integer, ForeignKey('customer_deprecated.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = db.Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    paid_at = db.Column(DateTime(timezone=True), nullable=True)
    scheduled_at = db.Column(DateTime(timezone=True), nullable=True)

    # Session fields
    session_start_time = db.Column(DateTime(timezone=True), nullable=True)
    session_end_time = db.Column(DateTime(timezone=True), nullable=True)
    session_duration = db.Column(db.Integer, nullable=True)
    timezone = db.Column(db.String(50), default='America/Los_Angeles')

    invitee_name = db.Column(db.String(255), nullable=True)
    invitee_email = db.Column(db.String(255), nullable=True)
    invitee_notes = db.Column(db.Text, nullable=True)

    # Stripe specific fields
    stripe_payment_intent_id = db.Column(db.String(255), unique=True, nullable=True)
    amount_paid = db.Column(Numeric(10,2), nullable=True)
    currency = db.Column(db.String(10), nullable=True, default='usd')
    
    # Financials
    platform_fee = db.Column(Numeric(10,2), nullable=True)
    mentor_payout_amount = db.Column(Numeric(10,2), nullable=True)
    
    status = db.Column(Enum(BookingStatus), default=BookingStatus.PENDING_PAYMENT, nullable=False)
    google_meet_link = db.Column(db.String(255), nullable=True)

    # Meeting fields
    meeting_id = db.Column(db.String(100), nullable=True)
    meeting_url = db.Column(db.String(500), nullable=True)
    meeting_token = db.Column(db.Text, nullable=True)
    recording_url = db.Column(db.String(500), nullable=True)

    # Rating system fields 
    customer_rating = db.Column(db.Integer, nullable=True)
    customer_notes = db.Column(db.Text, nullable=True)
    mentor_notes = db.Column(db.Text, nullable=True)
    rating_submitted_at = db.Column(DateTime(timezone=True), nullable=True)

    flagged_by_customer = db.Column(db.Boolean, default=False, nullable=False)
    flagged_by_mentor = db.Column(db.Boolean, default=False, nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "mentor_id": self.mentor_id,
            "customer_id": self.customer_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "status": self.status.value,
        }
        