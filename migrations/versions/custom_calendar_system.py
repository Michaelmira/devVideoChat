"""Custom calendar system migration

Revision ID: custom_calendar_system
Revises: # Leave this empty, it will be filled by Alembic
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'custom_calendar_system'
down_revision = None  # This will be filled by Alembic
branch_labels = None
depends_on = None

def upgrade():
    # Create new tables
    op.create_table(
        'mentor_availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='America/Los_Angeles'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['mentor_id'], ['mentor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'mentor_unavailability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('start_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['mentor_id'], ['mentor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'calendar_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('session_duration', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('buffer_time', sa.Integer(), nullable=False, server_default='15'),
        sa.Column('advance_booking_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('minimum_notice_hours', sa.Integer(), nullable=False, server_default='24'),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='America/Los_Angeles'),
        sa.ForeignKeyConstraint(['mentor_id'], ['mentor.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mentor_id')
    )

    # Add new columns to booking table
    op.add_column('booking', sa.Column('session_duration', sa.Integer(), nullable=True))
    op.add_column('booking', sa.Column('timezone', sa.String(50), nullable=True, server_default='America/Los_Angeles'))

    # Rename calendly_event_start_time to session_start_time
    op.alter_column('booking', 'calendly_event_start_time',
                    new_column_name='session_start_time',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)

    # Rename calendly_event_end_time to session_end_time
    op.alter_column('booking', 'calendly_event_end_time',
                    new_column_name='session_end_time',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)

    # Drop Calendly-specific columns from booking table
    op.drop_column('booking', 'calendly_event_uri')
    op.drop_column('booking', 'calendly_invitee_uri')

    # Drop Calendly-specific columns from mentor table
    op.drop_column('mentor', 'calendly_url')
    op.drop_column('mentor', 'calendly_access_token')
    op.drop_column('mentor', 'calendly_refresh_token')
    op.drop_column('mentor', 'calendly_token_expires_at')

def downgrade():
    # Add back Calendly-specific columns to mentor table
    op.add_column('mentor', sa.Column('calendly_url', sa.String(500), nullable=True))
    op.add_column('mentor', sa.Column('calendly_access_token', sa.Text(), nullable=True))
    op.add_column('mentor', sa.Column('calendly_refresh_token', sa.Text(), nullable=True))
    op.add_column('mentor', sa.Column('calendly_token_expires_at', sa.DateTime(timezone=True), nullable=True))

    # Add back Calendly-specific columns to booking table
    op.add_column('booking', sa.Column('calendly_event_uri', sa.String(255), nullable=True))
    op.add_column('booking', sa.Column('calendly_invitee_uri', sa.String(255), nullable=True))

    # Rename session_start_time back to calendly_event_start_time
    op.alter_column('booking', 'session_start_time',
                    new_column_name='calendly_event_start_time',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)

    # Rename session_end_time back to calendly_event_end_time
    op.alter_column('booking', 'session_end_time',
                    new_column_name='calendly_event_end_time',
                    existing_type=sa.DateTime(timezone=True),
                    nullable=True)

    # Drop new columns from booking table
    op.drop_column('booking', 'session_duration')
    op.drop_column('booking', 'timezone')

    # Drop new tables
    op.drop_table('calendar_settings')
    op.drop_table('mentor_unavailability')
    op.drop_table('mentor_availability') 