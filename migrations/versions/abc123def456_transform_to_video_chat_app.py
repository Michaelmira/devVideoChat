"""Transform devMentor to simple video chat app

Revision ID: 001_transform
Revises: 
Create Date: 2025-01-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create new User table (simplified from Customer)
    op.create_table('user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=30), nullable=False),
        sa.Column('last_name', sa.String(length=30), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password', sa.String(length=256), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('last_active', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_joined', sa.DateTime(timezone=True), nullable=True),
        sa.Column('about_me', sa.String(length=2500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('verification_code', sa.String(length=6), nullable=True),
        # New subscription fields
        sa.Column('subscription_status', sa.String(length=50), nullable=True, default='free'),
        sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
        sa.Column('subscription_id', sa.String(length=255), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)
    op.create_index(op.f('ix_user_phone'), 'user', ['phone'], unique=False)

    # Create UserImage table (simplified from CustomerImage)
    op.create_table('user_image',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('public_id', sa.String(length=500), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('public_id'),
        sa.UniqueConstraint('image_url'),
        sa.UniqueConstraint('user_id')
    )

    # Create VideoSession table (new core feature)
    op.create_table('video_session',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('meeting_id', sa.String(length=255), nullable=False),
        sa.Column('session_url', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('max_duration_minutes', sa.Integer(), nullable=True, default=50),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, default='active'),
        sa.Column('meeting_token', sa.Text(), nullable=True),
        sa.Column('recording_url', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meeting_id')
    )

    # Rename existing tables to deprecated versions for backward compatibility
    # This allows the migration to run without losing existing data
    
    # Check if tables exist before renaming
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    
    if 'customer' in existing_tables:
        op.rename_table('customer', 'customer_deprecated')
    
    if 'customer_image' in existing_tables:
        op.rename_table('customer_image', 'customer_image_deprecated')
        
    if 'mentor' in existing_tables:
        op.rename_table('mentor', 'mentor_deprecated')
    
    if 'mentor_image' in existing_tables:
        op.rename_table('mentor_image', 'mentor_image_deprecated')
    
    if 'portfolio_photo' in existing_tables:
        op.rename_table('portfolio_photo', 'portfolio_photo_deprecated')
        
    if 'mentor_availability' in existing_tables:
        op.rename_table('mentor_availability', 'mentor_availability_deprecated')
    
    if 'mentor_unavailability' in existing_tables:
        op.rename_table('mentor_unavailability', 'mentor_unavailability_deprecated')
    
    if 'calendar_settings' in existing_tables:
        op.rename_table('calendar_settings', 'calendar_settings_deprecated')
    
    if 'booking' in existing_tables:
        op.rename_table('booking', 'booking_deprecated')

    # Migrate existing customer data to new user table
    connection = op.get_bind()
    
    # Check if customer_deprecated table exists and has data
    try:
        result = connection.execute(sa.text("SELECT COUNT(*) FROM customer_deprecated"))
        customer_count = result.scalar()
        
        if customer_count > 0:
            # Copy customer data to user table
            connection.execute(sa.text("""
                INSERT INTO "user" (
                    id, first_name, last_name, phone, email, password, 
                    is_active, last_active, date_joined, about_me, 
                    is_verified, verification_code, subscription_status
                )
                SELECT 
                    id, first_name, last_name, phone, email, password,
                    is_active, last_active, date_joined, about_me,
                    is_verified, verification_code, 'free'
                FROM customer_deprecated
            """))
            
            print(f"✅ Migrated {customer_count} customers to users")
            
    except Exception as e:
        print(f"⚠️  Customer migration skipped: {e}")

    # Migrate existing mentor data to user table (combine both customer and mentor users)
    try:
        result = connection.execute(sa.text("SELECT COUNT(*) FROM mentor_deprecated"))
        mentor_count = result.scalar()
        
        if mentor_count > 0:
            # Get the max ID from user table to avoid conflicts
            max_user_id_result = connection.execute(sa.text("SELECT COALESCE(MAX(id), 0) FROM \"user\""))
            max_user_id = max_user_id_result.scalar()
            
            # Copy mentor data to user table with offset IDs
            connection.execute(sa.text(f"""
                INSERT INTO "user" (
                    id, first_name, last_name, phone, email, password, 
                    is_active, last_active, date_joined, about_me, 
                    is_verified, verification_code, subscription_status
                )
                SELECT 
                    id + {max_user_id}, first_name, last_name, phone, email, password,
                    is_active, last_active, date_joined, about_me,
                    is_verified, verification_code, 'free'
                FROM mentor_deprecated
            """))
            
            print(f"✅ Migrated {mentor_count} mentors to users")
            
    except Exception as e:
        print(f"⚠️  Mentor migration skipped: {e}")


def downgrade():
    # Drop new tables
    op.drop_table('video_session')
    op.drop_table('user_image')
    op.drop_index(op.f('ix_user_phone'), table_name='user')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_table('user')
    
    # Restore original table names
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    
    if 'customer_deprecated' in existing_tables:
        op.rename_table('customer_deprecated', 'customer')
    
    if 'customer_image_deprecated' in existing_tables:
        op.rename_table('customer_image_deprecated', 'customer_image')
        
    if 'mentor_deprecated' in existing_tables:
        op.rename_table('mentor_deprecated', 'mentor')
    
    if 'mentor_image_deprecated' in existing_tables:
        op.rename_table('mentor_image_deprecated', 'mentor_image')
    
    if 'portfolio_photo_deprecated' in existing_tables:
        op.rename_table('portfolio_photo_deprecated', 'portfolio_photo')
        
    if 'mentor_availability_deprecated' in existing_tables:
        op.rename_table('mentor_availability_deprecated', 'mentor_availability')
    
    if 'mentor_unavailability_deprecated' in existing_tables:
        op.rename_table('mentor_unavailability_deprecated', 'mentor_unavailability')
    
    if 'calendar_settings_deprecated' in existing_tables:
        op.rename_table('calendar_settings_deprecated', 'calendar_settings')
    
    if 'booking_deprecated' in existing_tables:
        op.rename_table('booking_deprecated', 'booking') 