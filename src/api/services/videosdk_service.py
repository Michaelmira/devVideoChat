import os
import requests
import jwt
from datetime import datetime, timedelta
import json

class VideoSDKService:
    def __init__(self):
        self.api_key = os.getenv('VIDEOSDK_API_KEY')
        self.secret_key = os.getenv('VIDEOSDK_SECRET_KEY')
        self.api_endpoint = os.getenv('VIDEOSDK_API_ENDPOINT', 'https://api.videosdk.live/v2')
        
    def generate_token(self, permissions=["allow_join", "allow_mod"]):
        """Generate JWT token for VideoSDK"""
        payload = {
            "apikey": self.api_key,
            "permissions": permissions,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(payload, self.secret_key, algorithm="HS256")
        return token
    
    def create_meeting(self, booking_id, mentor_name, customer_name, start_time, duration_minutes=60):
        """Create a meeting room for a booking"""
        token = self.generate_token()
        
        headers = {
            "Authorization": token,
            "Content-Type": "application/json"
        }
        
        # Custom meeting ID based on booking
        custom_id = f"booking_{booking_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        meeting_data = {
            "customRoomId": custom_id,
            "description": f"Mentoring session: {mentor_name} with {customer_name}",
            "autoStartRecording": os.getenv('VIDEOSDK_RECORDING_ENABLED', 'true').lower() == 'true',
            "webhookUrl": f"{os.getenv('BACKEND_URL')}/api/videosdk/webhook",
            "permissions": {
                "canToggleRecording": True,
                "canToggleLivestream": False,
                "canToggleParticipantMic": True,
                "canToggleParticipantWebcam": True,
                "canToggleParticipantScreenshare": True,
                "canToggleWhiteboard": True,
                "canToggleVirtualBackground": True,
                "canRemoveParticipant": True,
                "canDrawOnWhiteboard": True,
                "canToggleMeetingLock": True
            },
            "participantCanToggleSelfMic": True,
            "participantCanToggleSelfWebcam": True,
            "participantCanToggleSelfScreenshare": True,
            "participantCanLeave": True
        }
        
        response = requests.post(
            f"{self.api_endpoint}/rooms",
            headers=headers,
            json=meeting_data
        )
        
        if response.status_code == 200:
            data = response.json()
            # Use our frontend meeting route
            meeting_url = f"{os.getenv('FRONTEND_URL')}/video-meeting/{data.get('roomId')}"
            return {
                "success": True,
                "meeting_id": data.get("roomId"),
                "custom_id": custom_id,
                "token": token,
                "meeting_url": meeting_url
            }
        else:
            return {
                "success": False,
                "error": response.json()
            }
    
    def get_meeting_details(self, meeting_id):
        """Get details of a specific meeting"""
        token = self.generate_token()
        headers = {"Authorization": token}
        
        response = requests.get(
            f"{self.api_endpoint}/rooms/{meeting_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        else:
            return {"success": False, "error": response.json()}
    
    def end_meeting(self, meeting_id):
        """End an active meeting"""
        token = self.generate_token()
        headers = {"Authorization": token}
        
        response = requests.post(
            f"{self.api_endpoint}/rooms/{meeting_id}/end",
            headers=headers
        )
        
        return response.status_code == 200