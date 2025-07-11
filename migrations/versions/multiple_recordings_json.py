"""Add recordings JSON column to VideoSession

Revision ID: multiple_recordings_json
Revises: abc123def456
Create Date: 2025-01-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON
import json
from datetime import datetime

# revision identifiers
revision = 'multiple_recordings_json'
down_revision = 'abc123def456_transform_to_video_chat_app'
branch_labels = None
depends_on = None

def upgrade():
    # Add the new recordings JSON column
    op.add_column('video_session', sa.Column('recordings', JSON, nullable=True))
    
    # Migrate existing recording data to the new JSON format
    connection = op.get_bind()
    
    # Get all sessions with existing recordings
    sessions = connection.execute(
        "SELECT id, recording_id, recording_url, recording_status FROM video_session WHERE recording_url IS NOT NULL"
    ).fetchall()
    
    print(f"Migrating {len(sessions)} existing recordings to JSON format...")
    
    for session in sessions:
        # Create a recording object from existing data
        recording_data = {
            "id": 1,  # First recording for this session
            "recording_id": session.recording_id,
            "recording_url": session.recording_url,
            "recording_status": session.recording_status,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": datetime.utcnow().isoformat() if session.recording_status == "completed" else None,
            "duration_seconds": None,
            "quality": "high"
        }
        
        # Store as JSON array
        recordings_json = json.dumps([recording_data])
        
        # Update the session with the new recordings JSON
        connection.execute(
            "UPDATE video_session SET recordings = %s WHERE id = %s",
            (recordings_json, session.id)
        )
    
    print("Migration completed successfully!")

def downgrade():
    # Remove the recordings column
    op.drop_column('video_session', 'recordings') 