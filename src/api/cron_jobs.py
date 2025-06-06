import os
from datetime import datetime, timedelta
from flask import Flask
from .models import db, Booking, Mentor, Customer, BookingStatus
from .email_utils import send_email

def send_reminders():
    """
    Sends booking reminders to customers and mentors.
    - Sends a 24-hour reminder.
    - Sends a 1-hour reminder.
    """
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    db.init_app(app)

    with app.app_context():
        now = datetime.utcnow()
        
        # --- 24-Hour Reminders ---
        twenty_four_hours_later = now + timedelta(hours=24)
        upcoming_bookings_24h = Booking.query.filter(
            Booking.calendly_event_start_time.between(now, twenty_four_hours_later),
            Booking.status == BookingStatus.CONFIRMED,
            Booking.reminder_sent_at == None
        ).all()

        for booking in upcoming_bookings_24h:
            send_reminder_email(booking, "24-Hour Reminder")
            booking.reminder_sent_at = now
            db.session.commit()

        # --- 1-Hour Reminders ---
        one_hour_later = now + timedelta(hours=1)
        upcoming_bookings_1h = Booking.query.filter(
            Booking.calendly_event_start_time.between(now, one_hour_later),
            Booking.status == BookingStatus.CONFIRMED,
            # This condition can be adjusted, e.g., to allow 1-hour reminder even if 24h was sent
            # For simplicity, we assume one reminder is enough. Or add another field for 1-hour reminder.
            # Let's stick with one reminder for now.
        ).all()

        for booking in upcoming_bookings_1h:
            # Check if a reminder has already been sent recently to avoid spam
            if booking.reminder_sent_at and (now - booking.reminder_sent_at) < timedelta(hours=23):
                continue
            send_reminder_email(booking, "1-Hour Reminder")
            booking.reminder_sent_at = now # Update timestamp
            db.session.commit()

def send_reminder_email(booking, reminder_type):
    """Helper function to construct and send a reminder email."""
    mentor = booking.mentor
    customer = booking.customer
    
    subject = f"Reminder: Your Mentorship Session in {reminder_type.split('-')[0]} Hours"
    
    # Send to customer
    customer_body = f"""
    <p>Hi {customer.first_name},</p>
    <p>This is a {reminder_type.lower()} for your upcoming mentorship session with {mentor.first_name} {mentor.last_name}.</p>
    <p><strong>Time:</strong> {booking.calendly_event_start_time.strftime('%A, %B %d, %Y at %I:%M %p UTC')}</p>
    <p><strong>Meeting Link:</strong> <a href="{booking.google_meet_link}">{booking.google_meet_link}</a></p>
    """
    send_email(customer.email, subject, customer_body)

    # Send to mentor
    mentor_body = f"""
    <p>Hi {mentor.first_name},</p>
    <p>This is a {reminder_type.lower()} for your upcoming session with {customer.first_name} {customer.last_name}.</p>
    <p><strong>Time:</strong> {booking.calendly_event_start_time.strftime('%A, %B %d, %Y at %I:%M %p UTC')}</p>
    <p><strong>Meeting Link:</strong> <a href="{booking.google_meet_link}">{booking.google_meet_link}</a></p>
    """
    send_email(mentor.email, subject, mentor_body)
    
    print(f"Sent {reminder_type} for booking {booking.id}")

if __name__ == "__main__":
    send_reminders() 