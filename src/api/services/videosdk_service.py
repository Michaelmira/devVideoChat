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
        
    def generate_token(self, permissions=None):
        """Generate a token for VideoSDK"""
        try:
            api_key = os.getenv('VIDEOSDK_API_KEY')
            secret_key = os.getenv('VIDEOSDK_SECRET_KEY')
            
            if not api_key or not secret_key:
                raise ValueError("VideoSDK API key or secret key not found in environment variables")

            # If no permissions specified, give full permissions
            if permissions is None:
                permissions = ['allow_join', 'allow_mod', 'allow_record']

            # Create payload with necessary permissions
            payload = {
                'apikey': api_key,
                'permissions': permissions,
                'version': 2,
                'roles': ['crawler'],  # Only use crawler role for V2 API
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=24)  # Token valid for 24 hours
            }

            # Generate JWT token
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            # If token is bytes, decode it
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                
            return token

        except Exception as e:
            print(f"Error generating VideoSDK token: {str(e)}")
            raise
    
    def create_meeting(self, booking_id, mentor_name, customer_name, start_time, duration_minutes=60):
        """Create a meeting room for a booking"""
        try:
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
                "webhookUrl": f"{os.getenv('BACKEND_URL')}/api/videosdk/webhook" if os.getenv('BACKEND_URL') else None,
                "permissions": {
                    "askToJoin": False,
                    "toggleRecording": True,
                    "toggleLivestream": False,
                    "drawOnWhiteboard": True,
                    "toggleWhiteboard": True,
                    "toggleParticipantMic": True,
                    "toggleParticipantWebcam": True,
                    "toggleParticipantScreenShare": True,
                    "toggleParticipantMode": True,
                    "toggleHls": False,
                    "toggleSimulcast": True,
                    "canPin": True,
                    "canRemoveOtherParticipant": True
                },
                "participantCanToggleSelfWebcam": True,
                "participantCanToggleSelfMic": True,
                "participantCanLeave": True,
                "chatEnabled": True,
                "screenShareEnabled": True,
                "pollEnabled": True,
                "whiteboardEnabled": True,
                "participantCanToggleRecording": False,
                "participantCanToggleLivestream": False,
                "participantCanEndMeeting": False,
                "audioEnabled": True,
                "videoEnabled": True,
                "hdMeetingEnabled": True,
                "notify": {
                    "participantJoined": True,
                    "participantLeft": True,
                    "recordingStarted": True,
                    "recordingStopped": True
                }
            }
            
            # Remove None values from meeting_data
            meeting_data = {k: v for k, v in meeting_data.items() if v is not None}
            
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
                print(f"Failed to create meeting. Status: {response.status_code}, Response: {response.text}")
                return {
                    "success": False,
                    "error": response.json() if response.text else {"message": "Unknown error"}
                }
        except Exception as e:
            print(f"Exception in create_meeting: {str(e)}")
            return {
                "success": False,
                "error": str(e)
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