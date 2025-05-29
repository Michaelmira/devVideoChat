import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export const BookingConfirmedPage = () => {
    const location = useLocation();
    const { bookingDetails } = location.state || {};

    if (!bookingDetails) {
        return (
            <div className="container mt-5 text-center">
                <div className="alert alert-warning py-4">
                    <h2 className="alert-heading">Booking Confirmation Missing</h2>
                    <p className="mb-0">We couldn't retrieve your booking details. This might be due to a navigation error.</p>
                    <p>Please check your dashboard for your bookings, or contact support if you believe this is an error.</p>
                </div>
                <Link to="/dashboard/customer" className="btn btn-info mt-3 me-2">View My Bookings</Link>
                <Link to="/" className="btn btn-secondary mt-3">Go to Homepage</Link>
            </div>
        );
    }

    return (
        <div className="container my-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-7">
                    <div className="card shadow-lg border-success">
                        <div className="card-header bg-success text-white text-center py-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" className="bi bi-check-circle-fill mb-2" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                            </svg>
                            <h2 className="h3 mb-0">Booking Confirmed!</h2>
                        </div>
                        <div className="card-body p-4">
                            <p className="lead text-center mb-4">Your session with <strong>{bookingDetails.mentorName || 'your mentor'}</strong> has been successfully scheduled.</p>

                            <div className="alert alert-info">
                                <h5 className="alert-heading">Session Details:</h5>
                                <ul className="list-unstyled mb-0">
                                    <li><strong>Mentor:</strong> {bookingDetails.mentorName || 'N/A'}</li>
                                    <li><strong>Scheduled For:</strong> {bookingDetails.time || 'N/A'}</li>
                                    <li><strong>Your Name:</strong> {bookingDetails.inviteeName || 'N/A'}</li>
                                    <li><strong>Your Email:</strong> {bookingDetails.inviteeEmail || 'N/A'}</li>
                                    {bookingDetails.notes &&
                                        <li><strong>Notes Provided:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{bookingDetails.notes}</span></li>
                                    }
                                </ul>
                            </div>

                            <p className="mt-4 text-muted">
                                You should receive a calendar invitation and confirmation email shortly.
                                If this event was booked directly via your mentor's Calendly, please check for an email from Calendly.
                                If you don't receive it within an hour, please check your spam folder or contact support.
                            </p>

                            <div className="text-center mt-4 pt-3 border-top">
                                <Link to="/dashboard/customer" className="btn btn-primary btn-lg me-2 mb-2">View My Bookings</Link>
                                <Link to="/mentors" className="btn btn-outline-secondary btn-lg mb-2">Find Another Mentor</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 