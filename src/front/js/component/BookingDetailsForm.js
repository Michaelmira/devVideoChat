import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from "../store/appContext";

export const BookingDetailsForm = ({ mentorId, calendlyEventData, paymentIntentData, mentorName }) => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Pre-fill form data if user is logged in
        if (store.currentUserData?.user_data) {
            setFormData(prevData => ({
                ...prevData,
                name: `${store.currentUserData.user_data.first_name || ''} ${store.currentUserData.user_data.last_name || ''}`.trim(),
                email: store.currentUserData.user_data.email || ''
            }));
        } else if (calendlyEventData?.invitee?.email) {
            // If not logged in, but Calendly has an email (e.g. from prefill in previous step)
            setFormData(prevData => ({
                ...prevData,
                email: calendlyEventData.invitee.email
            }));
        }
    }, [store.currentUserData, calendlyEventData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const finalBookingData = {
            mentorId,
            mentorName,
            inviteeName: formData.name,
            inviteeEmail: formData.email,
            notes: formData.notes,
            // Calendly specific data needed for API call or redirection
            calendlyScheduledEventUri: calendlyEventData?.event?.uri, // URI of the selected event slot from onDateAndTimeSelected
            calendlyInviteeUri: calendlyEventData?.invitee?.uri, // Invitee URI if available
            eventStartTime: calendlyEventData?.event?.start_time,
            eventEndTime: calendlyEventData?.event?.end_time,
            paymentIntentId: paymentIntentData?.id, // From Stripe
            clientSecret: paymentIntentData?.client_secret, // From Stripe, if needed for confirmation
            // Any other relevant data from paymentIntentData or calendlyEventData
        };

        console.log("Final Booking Data to be processed:", finalBookingData);

        // AT THIS POINT: We need to decide how to interact with Calendly.
        // Option A: Redirect to a pre-filled Calendly link for the *mentor's specific event type*.
        // This is simpler if the mentor provides an event type link.
        // Example: `https://calendly.com/YOUR_MENTOR/EVENT_TYPE_SLUG?name=...&email=...&a1=...` (a1 for custom answer)

        // Option B: Make a backend API call to create the event using Calendly API.
        // This requires the mentor to have connected their Calendly account (e.g., via OAuth or by providing an API key).
        // This is the most robust solution for full integration.

        // For now, we will simulate a successful booking and navigate to confirmation.
        // In a real scenario, this block would contain the logic for Option A or B.

        try {
            // SIMULATED: Replace with actual backend call or Calendly redirect logic
            // const response = await actions.finalizeAndScheduleBooking(finalBookingData);
            // if(response.success){
            //    navigate('/booking-confirmed', { state: { bookingDetails: response.data } });
            // } else {
            //    setError(response.message || 'Failed to schedule the event.');
            // }

            // Simulate a slight delay for API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // For demonstration, we pass most of the collected data to the confirmation page.
            // In a real app, the confirmation page would likely fetch this from the backend or use less data.
            navigate('/booking-confirmed', {
                state: {
                    bookingDetails: {
                        ...finalBookingData,
                        // Reformat time for display
                        time: new Date(finalBookingData.eventStartTime).toLocaleString(),
                        mentorName: mentorName || 'Your Mentor'
                    }
                }
            });

        } catch (err) {
            console.error("Error during booking submission:", err);
            setError("An unexpected error occurred while scheduling. Please try again or contact support.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!calendlyEventData || !calendlyEventData.event) {
        return <div className="alert alert-warning">Missing Calendly event data. Cannot proceed.</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="p-3 border rounded bg-light">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="mb-3">
                <label htmlFor="name" className="form-label">Full Name <span className="text-danger">*</span></label>
                <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-describedby="nameHelp"
                />
                <div id="nameHelp" className="form-text">As you'd like it to appear on the calendar invite.</div>
            </div>

            <div className="mb-3">
                <label htmlFor="email" className="form-label">Email Address <span className="text-danger">*</span></label>
                <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-describedby="emailHelp"
                />
                <div id="emailHelp" className="form-text">The email address where your booking confirmation will be sent.</div>
            </div>

            <div className="mb-3">
                <label htmlFor="notes" className="form-label">
                    Please share anything that will help your mentor prepare for the meeting (optional)
                </label>
                <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    rows="4"
                    value={formData.notes}
                    onChange={handleChange}
                    aria-describedby="notesHelp"
                ></textarea>
                <div id="notesHelp" className="form-text">E.g., specific questions, topics you'd like to cover, or links to your work.</div>
            </div>

            <hr className="my-4" />

            <div className="mb-3">
                <h5>Confirm Details:</h5>
                <p className="mb-1"><strong>Mentor:</strong> {mentorName || 'N/A'}</p>
                <p className="mb-1"><strong>Time:</strong> {new Date(calendlyEventData.event.start_time).toLocaleString()} - {new Date(calendlyEventData.event.end_time).toLocaleString()}</p>
                {/* Add any other important details from calendlyEventData or paymentIntentData if needed */}
            </div>

            <button type="submit" className="btn btn-success w-100 btn-lg" disabled={isLoading || !formData.name || !formData.email}>
                {isLoading ?
                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Scheduling...</> :
                    'Confirm & Schedule Event'}
            </button>
        </form>
    );
}; 