# src/api/send_email.py
import smtplib
from email.message import EmailMessage
import os
from datetime import datetime
import pytz

# Import the calendar utilities
from api.calendar_utils import generate_google_calendar_url, get_calendar_urls


def send_email(to_email, subject, html_content):
    """
    Sends an email using Gmail's SMTP server.
    """
    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 465  # SSL PORT
    MAIL_USERNAME = os.getenv("GMAIL")
    MAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("ERROR: Gmail credentials (GMAIL, GMAIL_PASSWORD) not found in .env file.")
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = MAIL_USERNAME
    msg["To"] = to_email
    msg.add_alternative(html_content, subtype='html')

    try:
        print(f"Attempting to send email from {MAIL_USERNAME} to {to_email}...")
        with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT) as server:
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        print("Email sent successfully!")
        return True
    except smtplib.SMTPException as e:
        print(f"ERROR: Failed to send email using smtplib: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while sending email: {e}")
        return False


def send_verification_email_code(to_email, code):
    """
    Sends a verification email with a 6-digit code.
    """
    subject = "devMentor - Your Verification Code"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to devMentor!</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">{code}</p>
        <p>Please use this code to complete your registration.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br>
        <p>Best,</p>
        <p>The devMentor Team</p>
    </div>
    """
    return send_email(to_email, subject, html_content)


def send_booking_confirmation_email(customer_email, customer_name, mentor_name, booking_details):
    """
    Send optimized booking confirmation email with Google Calendar integration
    """
    # Extract booking details
    booking_id = booking_details.get('id')
    session_start_time = booking_details.get('session_start_time')
    session_end_time = booking_details.get('session_end_time')
    amount_paid = booking_details.get('amount_paid', 0)
    meeting_url = booking_details.get('meeting_url', '')
    mentor_email = booking_details.get('mentor_email', '')
    session_duration = booking_details.get('session_duration', 60)
    
    # Format dates for display
    if isinstance(session_start_time, str):
        start_dt = datetime.fromisoformat(session_start_time.replace('Z', '+00:00'))
    else:
        start_dt = session_start_time
    
    if isinstance(session_end_time, str):
        end_dt = datetime.fromisoformat(session_end_time.replace('Z', '+00:00'))
    else:
        end_dt = session_end_time
    
    # Format for display in user's local time (you may want to adjust timezone based on customer preference)
    formatted_date = start_dt.strftime('%A, %B %d, %Y')
    formatted_start_time = start_dt.strftime('%I:%M %p')
    formatted_end_time = end_dt.strftime('%I:%M %p')
    
    # Generate calendar URLs using the new utility
    event_title = f"DevMentor Session with {mentor_name}"
    event_description = f"""
Your mentoring session with {mentor_name} is confirmed!

Session Details:
- Booking Reference: #{booking_id}
- Duration: {session_duration} minutes
- Amount Paid: ${amount_paid:.2f}

Meeting Link: {meeting_url if meeting_url else 'Will be provided before the session'}

Questions? Contact {mentor_email}

DevMentor Platform
    """.strip()
    
    # Get all calendar URLs
    calendar_urls = get_calendar_urls(
        event_title=event_title,
        start_time=session_start_time,
        end_time=session_end_time,
        description=event_description,
        location=meeting_url if meeting_url else "Online"
    )
    
    # Primary Google Calendar URL
    google_calendar_url = calendar_urls['google']
    outlook_calendar_url = calendar_urls['outlook']
    
    # Email subject
    subject = f"🎉 Booking Confirmed - Session with {mentor_name}"
    
    # Create optimized HTML email template
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8f9fa;
                line-height: 1.6;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }}
            .checkmark {{
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
            }}
            .session-card {{
                background: #f8f9fa;
                border-left: 4px solid #28a745;
                padding: 25px;
                margin: 25px 0;
                border-radius: 8px;
            }}
            .session-title {{
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                font-weight: 600;
                color: #666;
            }}
            .detail-value {{
                color: #333;
                font-weight: 500;
            }}
            .calendar-buttons {{
                text-align: center;
                margin: 25px 0;
            }}
            .calendar-button {{
                display: inline-block;
                padding: 12px 24px;
                margin: 5px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                color: white;
            }}
            .google-calendar {{
                background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);
            }}
            .outlook-calendar {{
                background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
                box-shadow: 0 4px 15px rgba(0, 120, 212, 0.3);
            }}
            .calendar-button:hover {{
                transform: translateY(-2px);
                text-decoration: none;
                color: white;
            }}
            .google-calendar:hover {{
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }}
            .outlook-calendar:hover {{
                box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4);
            }}
            .meeting-section {{
                background: #e8f5e8;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
            }}
            .meeting-url {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                font-family: monospace;
                word-break: break-all;
                margin: 10px 0;
                color: #0066cc;
                text-decoration: none;
                display: block;
            }}
            .next-steps {{
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 25px 0;
            }}
            .next-steps h3 {{
                color: #856404;
                margin-top: 0;
            }}
            .next-steps ul {{
                color: #856404;
                margin: 0;
                padding-left: 20px;
            }}
            .footer {{
                background: #f8f9fa;
                padding: 30px;
                text-align: center;
                color: #666;
                border-top: 1px solid #e9ecef;
            }}
            .booking-ref {{
                background: #e3f2fd;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                margin: 20px 0;
                font-family: monospace;
                font-weight: bold;
                color: #1976d2;
            }}
            @media (max-width: 600px) {{
                .container {{
                    margin: 0;
                    border-radius: 0;
                }}
                .content, .header, .footer {{
                    padding: 20px;
                }}
                .detail-row {{
                    flex-direction: column;
                    align-items: flex-start;
                }}
                .detail-value {{
                    margin-top: 5px;
                }}
                .calendar-button {{
                    display: block;
                    margin: 10px auto;
                    width: 80%;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="checkmark">✓</div>
                <h1>Booking Confirmed!</h1>
                <p style="margin: 0; opacity: 0.9;">Your session is successfully scheduled</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hi {customer_name},
                </div>
                
                <p>Great news! Your mentoring session with <strong>{mentor_name}</strong> has been successfully confirmed and paid for.</p>
                
                <div class="session-card">
                    <div class="session-title">📅 Session Details</div>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">{formatted_date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">{formatted_start_time} - {formatted_end_time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Duration:</span>
                        <span class="detail-value">{session_duration} minutes</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Mentor:</span>
                        <span class="detail-value">{mentor_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount Paid:</span>
                        <span class="detail-value">${amount_paid:.2f}</span>
                    </div>
                </div>
                
                <div class="booking-ref">
                    Booking Reference: #{booking_id}
                </div>
                
                <div class="calendar-buttons">
                    <p style="margin-bottom: 15px; color: #666; font-weight: 600;">Add to your calendar:</p>
                    <a href="{google_calendar_url}" class="calendar-button google-calendar" target="_blank">
                        📅 Google Calendar
                    </a>
                    <a href="{outlook_calendar_url}" class="calendar-button outlook-calendar" target="_blank">
                        📅 Outlook Calendar
                    </a>
                </div>
                
                {f'''
                <div class="meeting-section">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Link</h3>
                    <p>Join your session using the link below:</p>
                    <a href="{meeting_url}" class="meeting-url" target="_blank">{meeting_url}</a>
                </div>
                ''' if meeting_url else '''
                <div class="meeting-section">
                    <h3 style="margin-top: 0; color: #28a745;">🎥 Meeting Link</h3>
                    <p>Your mentor will provide the meeting link before the session starts.</p>
                </div>
                '''}
                
                <div class="next-steps">
                    <h3>📋 What's Next?</h3>
                    <ul>
                        <li>Add this session to your calendar using the buttons above</li>
                        <li>Prepare any specific questions or topics you'd like to discuss</li>
                        <li>Test your camera and microphone before the session</li>
                        <li>Join the meeting 5 minutes early to ensure everything works</li>
                        {f'<li>Contact your mentor at {mentor_email} if you have any questions</li>' if mentor_email else ''}
                    </ul>
                </div>
                
                <p style="margin-top: 30px; color: #666;">
                    Looking forward to your productive session! If you need to reschedule or have any questions, 
                    please contact us as soon as possible.
                </p>
                
                <p style="color: #666;">
                    Best regards,<br>
                    <strong>The DevMentor Team</strong>
                </p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; font-size: 14px;">
                    This email was sent to {customer_email}<br>
                    © 2025 DevMentor. All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(customer_email, subject, html_content)