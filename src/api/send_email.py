import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_email(to_email, subject, html_content):
    """
    Sends an email using SendGrid.
    """
    message = Mail(
        from_email=os.environ.get('SENDGRID_FROM_EMAIL'),
        to_emails=to_email,
        subject=subject,
        html_content=html_content)
    try:
        sendgrid_client = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        response = sendgrid_client.send(message)
        print(response.status_code)
        print(response.body)
        print(response.headers)
        return True
    except Exception as e:
        print(e)
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