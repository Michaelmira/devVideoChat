"""Add meeting fields to booking table

Revision ID: add_meeting_fields
Revises: custom_calendar_system
Create Date: 2024-03-19 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_meeting_fields'
down_revision = 'custom_calendar_system'
branch_labels = None
depends_on = None

def upgrade():
    # Add new meeting-related columns to booking table
    op.add_column('booking', sa.Column('meeting_id', sa.String(100), nullable=True))
    op.add_column('booking', sa.Column('meeting_url', sa.String(500), nullable=True))
    op.add_column('booking', sa.Column('meeting_token', sa.Text(), nullable=True))
    op.add_column('booking', sa.Column('recording_url', sa.String(500), nullable=True))

def downgrade():
    # Remove meeting-related columns from booking table
    op.drop_column('booking', 'recording_url')
    op.drop_column('booking', 'meeting_token')
    op.drop_column('booking', 'meeting_url')
    op.drop_column('booking', 'meeting_id') 