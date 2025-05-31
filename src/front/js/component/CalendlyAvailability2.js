// CalendlyAvailability.js - Simplified version with direct auth and payment
import React, { useState, useEffect, useContext, useRef } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { Context } from "../store/appContext";
import { useLocation, useNavigate } from 'react-router-dom';
import { CustomerLogin } from '../auth/CustomerLogin';
import { CustomerSignup } from '../auth/CustomerSignup';
import { PaymentForm } from './PaymentForm';

const CalendlyAvailability2 = () => {
    const { store, actions } = useContext(Context);
    const location = useLocation();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentMentor, setCurrentMentor] = useState(null);
    const [paymentIntentData, setPaymentIntentData] = useState(null);
    const [originalBookingId, setOriginalBookingId] = useState(null);

    const calendlyContainerRef = useRef(null);

    useEffect(() => {
        // Mentor data should be passed in location.state from the previous step
        if (location.state?.mentor) {
            setCurrentMentor(location.state.mentor);
        } else if (location.state?.mentorId) {
            // If only mentorId is passed, fetch the mentor details
            actions.getMentorById(location.state.mentorId).then(data => {
                if (data) setCurrentMentor(data);
                else setHasError(true); // Mentor not found
            });
        } else {
            console.error("CalendlyAvailability2: Mentor data not provided in location state.");
            setHasError(true); // Critical error, mentor data missing
        }

        if (location.state?.paymentIntentData) {
            setPaymentIntentData(location.state.paymentIntentData);
        }
        if (location.state?.bookingId) { // Assuming bookingId is passed from handlePaymentSuccess
            setOriginalBookingId(location.state.bookingId);
        }

    }, [location.state, actions]);

    const calendlyUrl = currentMentor?.calendly_url;
    const isValidUrl = calendlyUrl && typeof calendlyUrl === 'string' && calendlyUrl.trim() !== '' && calendlyUrl.includes('calendly.com');

    const styles = {
        height: '700px',
        minWidth: '320px',
        position: 'relative',
    };

    // User is already logged in, prefill their details
    const prefill = {
        email: store.currentUserData?.user_data?.email || "",
        name: store.currentUserData?.user_data?.name || // Use full name if available
            ((store.currentUserData?.user_data?.first_name || "") + " " + (store.currentUserData?.user_data?.last_name || "")).trim() || "",
        // You might be able to pre-fill the date if you captured an *approximate* one earlier,
        // but it might be better to let the user re-select freely.
        // date: location.state?.initialSelectedDate // Example, if you passed it
    };

    const utm = {
        utmSource: "mentor_platform_finalize",
        utmMedium: "scheduling_page_step2",
        utmCampaign: "mentorship_booking_final"
    };

    useCalendlyEventListener({
        onEventScheduled: async (e) => {
            console.log("--- CALENDLY EVENT SCHEDULED (CalendlyAvailability2) ---", e.data.payload);
            const scheduledEventDetails = e.data.payload?.event;
            const inviteeDetails = e.data.payload?.invitee;

            if (currentMentor && scheduledEventDetails?.uri && inviteeDetails?.uri) {
                const finalEventDataForBackend = {
                    calendly_event_uri: scheduledEventDetails.uri,
                    calendly_invitee_uri: inviteeDetails.uri,
                    // Any other details your backend might want at this stage
                };

                let bookingUpdateAttempted = false;
                let bookingUpdateSuccess = false;

                if (originalBookingId) {
                    bookingUpdateAttempted = true;
                    try {
                        console.log("TODO: Call backend to update booking ID:", originalBookingId, "with data:", finalEventDataForBackend);
                        // const backendResponse = await actions.updateBookingWithCalendlyDetails(originalBookingId, finalEventDataForBackend);
                        // bookingUpdateSuccess = backendResponse.success; 
                        bookingUpdateSuccess = true; // Placeholder for actual API call result
                    } catch (apiError) {
                        console.error("Error updating booking on backend:", apiError);
                        // bookingUpdateSuccess remains false
                    }
                }

                // Navigate to confirmation regardless of backend update for now, but pass relevant info
                console.log("Event successfully scheduled with Calendly. Navigating to confirmation.");

                const bookingConfirmedState = {
                    mentorId: currentMentor.id,
                    bookingId: originalBookingId, // Will be null if not available initially
                    calendlyEventData: {
                        uri: scheduledEventDetails.uri,
                        start_time: scheduledEventDetails.start_time || null,
                        end_time: scheduledEventDetails.end_time || null,
                        name: scheduledEventDetails.name || "Meeting with " + currentMentor.first_name,
                        location: scheduledEventDetails.location?.location || "Video Call"
                    },
                    paymentIntentData: paymentIntentData,
                    mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`,
                    isFinalConfirmation: true,
                    requiresManualLinking: !originalBookingId || (bookingUpdateAttempted && !bookingUpdateSuccess)
                };

                if (!originalBookingId) {
                    alert("Your event is scheduled with Calendly. We couldn't automatically link it to your initial payment record. Please save your Calendly confirmation and contact support if needed.");
                } else if (bookingUpdateAttempted && !bookingUpdateSuccess) {
                    alert("Your event is scheduled with Calendly, but we had trouble updating our records automatically. Please contact support if this booking doesn't appear in your account shortly.");
                }

                navigate('/booking-confirmed', { state: bookingConfirmedState });

            } else {
                console.error("Calendly onEventScheduled error: Missing crucial details.", e.data.payload);
                alert("Your event may be scheduled with Calendly, but we had an issue processing the details. Please check your email for Calendly's confirmation and contact support if needed.");
            }
        },
        // Optional: Listen to other events for UX if needed
        onDateAndTimeSelected: (e) => {
            console.log("Date and Time selected in CalendlyAvailability2 (informational):", e);
        },
        onPageHeightResize: (e) => { /* console.log('height resized', e.data.payload) */ }
    });

    useEffect(() => {
        if (isValidUrl) {
            setIsLoading(true); // Show loader initially
            const timer = setTimeout(() => setIsLoading(false), 1500);
            return () => clearTimeout(timer);
        } else if (currentMentor) { // currentMentor is loaded but URL is invalid
            setIsLoading(false);
            setHasError(true);
        }
        // If currentMentor is null initially, it will be caught by the loading in return
    }, [isValidUrl, currentMentor]);

    const handleCancelFinalStep = () => {
        console.log("User cancelled final Calendly selection step.");
        navigate('/dashboard'); // Navigate to dashboard or a relevant page
        alert("You have cancelled the final booking step. Your payment was processed. Please contact support if you wish to reschedule or need assistance.");
    };

    if (!currentMentor && !hasError) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
                <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
            </div>
        );
    }

    return (
        <div className="container mt-4 mb-5">
            <div className="row justify-content-center">
                <div className="col-md-10 col-lg-8">
                    <div className="card shadow-sm">
                        <div className="card-header bg-success text-white">
                            <h4 className="mb-0 text-center">Confirm Your Booking Time</h4>
                        </div>
                        <div className="card-body p-4">
                            {hasError && !currentMentor && (
                                <div className="alert alert-danger">Could not load mentor details. Please try again or contact support.</div>
                            )}
                            {currentMentor && !isValidUrl && (
                                <div className="alert alert-warning">
                                    <p><strong>Scheduling Not Available</strong></p>
                                    <p>The scheduling calendar for {currentMentor.first_name} {currentMentor.last_name} is currently unavailable. Please contact support.</p>
                                </div>
                            )}
                            {currentMentor && isValidUrl && (
                                <>
                                    <p className="text-center mb-3">
                                        Please select your preferred date and time for your session with <strong>{currentMentor.first_name} {currentMentor.last_name}</strong>.
                                    </p>
                                    <p className="text-center text-muted small mb-4">Your payment is confirmed. This final step reserves your slot directly in the mentor's calendar.</p>

                                    {isLoading && (
                                        <div className="d-flex justify-content-center my-5">
                                            <div className="spinner-border text-success" style={{ width: "3rem", height: "3rem" }} role="status">
                                                <span className="visually-hidden">Loading Calendar...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease-in-out', minHeight: isLoading ? '700px' : 'auto' }} ref={calendlyContainerRef}>
                                        {!isLoading && (
                                            <InlineWidget
                                                url={calendlyUrl}
                                                styles={styles}
                                                prefill={prefill}
                                                utm={utm}
                                                pageSettings={{
                                                    hideEventTypeDetails: false,
                                                    hideLandingPageDetails: true, // Hides Calendly's own branding/footer if possible
                                                    backgroundColor: 'ffffff',
                                                    primaryColor: '00a2ff',
                                                    textColor: '4d5055'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="text-center mt-4">
                                        <button className="btn btn-outline-secondary" onClick={handleCancelFinalStep}>
                                            Cancel and Go to Dashboard
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendlyAvailability2; 