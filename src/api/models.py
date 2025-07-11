from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.orm.attributes import flag_modified
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
    
    # NEW: Store multiple recordings as JSON array
    recordings = db.Column(db.JSON, nullable=True, default=list)
    
    # DEPRECATED: Keep for backward compatibility during migration
    recording_url = db.Column(db.String(500), nullable=True)
    recording_id = db.Column(db.String(255), nullable=True)  # VideoSDK recording ID
    recording_status = db.Column(db.String(50), default='none')  # none, starting, active, stopping, completed, failed

    creator = relationship("User", backref=db.backref("video_sessions", lazy=True))

    def __repr__(self):
        return f'<VideoSession {self.meeting_id} - Creator: {self.creator_id} Status: {self.status}>'

    # Helper methods for managing recordings
    def add_recording(self, recording_data):
        """Add a new recording to the session"""
        if self.recordings is None:
            self.recordings = []
        
        recording_number = len(self.recordings) + 1
        
        # Generate a proper name for the recording
        if recording_number == 1:
            recording_name = f"Meeting Session #{self.id}"
        else:
            recording_name = f"Meeting Session #{self.id} Recording #{recording_number}"
        
        recording = {
            "id": recording_number,  # Simple incrementing ID
            "name": recording_name,  # Human-readable name
            "recording_id": recording_data.get("recording_id"),
            "recording_url": recording_data.get("recording_url"),
            "recording_status": recording_data.get("recording_status", "starting"),
            "created_at": datetime.datetime.utcnow().isoformat(),
            "started_at": recording_data.get("started_at"),
            "completed_at": recording_data.get("completed_at"),
            "duration_seconds": recording_data.get("duration_seconds"),
            "quality": recording_data.get("quality", "high")
        }
        
        self.recordings.append(recording)
        
        # Mark the JSON column as modified for SQLAlchemy to detect changes
        flag_modified(self, 'recordings')
        
        print(f"🔍 DEBUG add_recording: Added recording {recording['id']} ({recording_name}) to session {self.id}")
        print(f"🔍 DEBUG add_recording: Total recordings now: {len(self.recordings)}")
        return recording

    def update_recording(self, recording_id, update_data):
        """Update an existing recording"""
        if self.recordings is None or len(self.recordings) == 0:
            print(f"🔍 DEBUG update_recording: No recordings array for session {self.id}")
            return None
            
        print(f"🔍 DEBUG update_recording: Looking for recording_id '{recording_id}' in {len(self.recordings)} recordings")
        for i, recording in enumerate(self.recordings):
            print(f"🔍 DEBUG update_recording: Checking recording {i}: {recording.get('recording_id')}")
            if recording.get("recording_id") == recording_id:
                # Update the recording with new data
                recording.update(update_data)
                self.recordings[i] = recording
                
                # Mark the JSON column as modified for SQLAlchemy to detect changes
                flag_modified(self, 'recordings')
                
                print(f"🔍 DEBUG update_recording: Updated recording {recording_id}")
                return recording
        print(f"🔍 DEBUG update_recording: Recording {recording_id} not found!")
        return None

    def get_recording(self, recording_id):
        """Get a specific recording by recording_id"""
        if self.recordings is None or len(self.recordings) == 0:
            return None
        
        for recording in self.recordings:
            if recording.get("recording_id") == recording_id:
                return recording
        return None

    def get_latest_recording(self):
        """Get the most recent recording"""
        if self.recordings is None or len(self.recordings) == 0:
            return None
        return max(self.recordings, key=lambda x: x.get("created_at", ""))

    def get_active_recordings(self):
        """Get all currently active recordings"""
        if self.recordings is None or len(self.recordings) == 0:
            return []
        return [r for r in self.recordings if r.get("recording_status") in ["starting", "active"]]

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
            "recordings": self.recordings or [],
            "total_recordings": len(self.recordings) if self.recordings else 0,
            "has_recordings": bool(self.recordings and len(self.recordings) > 0),
            # Backward compatibility
            "has_recording": bool(self.recording_url),
            "recording_status": self.recording_status,
            "recording_id": self.recording_id
        }



        