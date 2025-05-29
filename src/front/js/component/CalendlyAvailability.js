// CalendlyAvailability.js - Simplified version with direct auth and payment
import React, { useState, useEffect, useContext, useRef } from 'react';
import { InlineWidget, useCalendlyEventListener } from 'react-calendly';
import { Context } from "../store/appContext";
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerLogin } from '../auth/CustomerLogin';
import { CustomerSignup } from '../auth/CustomerSignup';
import { PaymentForm } from './PaymentForm';

const CalendlyAvailability = ({ mentorId, mentor }) => {
  const { store, actions } = useContext(Context);
  const { theid } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(mentor);

  // States for our booking flow
  const [showCalendly, setShowCalendly] = useState(true);
  const [selectedTimeData, setSelectedTimeData] = useState(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState('login');

  // Calendar container reference
  const calendlyContainerRef = useRef(null);

  useEffect(() => {
    // If mentor object is directly passed, use it
    if (mentor) {
      setCurrentMentor(mentor);
      return;
    }

    // Otherwise, get mentor ID from props or params
    const targetMentorId = mentorId || theid;

    // Find mentor in store if available
    if (store.mentors.length > 0) {
      const foundMentor = store.mentors.find(m => m.id.toString() === targetMentorId?.toString());
      if (foundMentor) {
        setCurrentMentor(foundMentor);
      }
    } else if (targetMentorId) {
      // If not in store, fetch it
      actions.getMentorById(targetMentorId).then(data => {
        if (data) setCurrentMentor(data);
      });
    }
  }, [mentor, mentorId, theid, store.mentors, actions]);

  // Check if we have a valid Calendly URL
  const calendlyUrl = currentMentor?.calendly_url;
  const isValidUrl = calendlyUrl &&
    typeof calendlyUrl === 'string' &&
    calendlyUrl.trim() !== '' &&
    calendlyUrl.includes('calendly.com');

  // Widget styling - ensure full visibility
  const styles = {
    height: '700px',
    minWidth: '320px',
    position: 'relative',
  };

  // Optional prefill with mentor's info if available
  const prefill = {
    email: "",
    name: ""
  };

  // UTM parameters for tracking
  const utm = {
    utmSource: "mentor_platform",
    utmMedium: "scheduling_page",
    utmCampaign: "mentorship_booking"
  };

  // Use the Calendly event listener for intercepting the date/time selection
  useCalendlyEventListener({
    onDateAndTimeSelected: (e) => {
      console.log("Calendly onDateAndTimeSelected raw event data (e.data):", JSON.parse(JSON.stringify(e.data)));
      console.log("Calendly onDateAndTimeSelected PAYLOAD (e.data.payload):", JSON.parse(JSON.stringify(e.data.payload)));
      // Store the selected time data
      setSelectedTimeData(e.data.payload);
      // Hide Calendly and check authentication
      setShowCalendly(false);

      // Check if user is authenticated
      if (store.token && store.currentUserData) {
        // User is logged in, show payment form
        setShowPaymentForm(true);
      } else {
        // User is not logged in, show auth form
        setShowAuthForm(true);
      }
    }
  });

  // Loading state management
  useEffect(() => {
    if (isValidUrl) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [isValidUrl, calendlyUrl]);

  const handleCalendlyLoad = () => {
    setIsLoading(false);
  };

  const handleCalendlyError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Auth form handlers
  const handleLoginSuccess = () => {
    setShowAuthForm(false);
    setShowPaymentForm(true);
  };

  const handleSwitchTab = (tab) => {
    setActiveAuthTab(tab);
  };

  // Payment handlers
  const handlePaymentSuccess = (paymentIntent) => {
    // Record the successful payment
    if (currentMentor && selectedTimeData) {
      // Get current date/time in EST/EDT timezone
      const now = new Date();
      // Format the date as ISO string
      const currentDateTime = now.toISOString();

      const bookingData = {
        mentorId: currentMentor.id,
        paidDateTime: currentDateTime, // Use current time instead of Calendly time
        clientEmail: store.currentUserData?.user_data?.email || selectedTimeData.email || '',
        amount: parseFloat(currentMentor.price || 0),
        mentorPayout: parseFloat(currentMentor.price || 0) * 0.9,
        platformFee: parseFloat(currentMentor.price || 0) * 0.1,
        status: 'paid'
      };

      console.log("Sending booking data:", bookingData);

      actions.trackMentorBooking(bookingData)
        .then(success => {
          if (success) {
            console.log("Booking successfully tracked by backend");
            // Navigate to the booking details form page
            // Pass necessary data via route state
            console.log("CalendlyAvailability: selectedTimeData BEFORE navigate:", selectedTimeData);
            navigate('/booking-details', {
              state: {
                mentorId: currentMentor.id,
                calendlyEventData: selectedTimeData, // This contains event URI, start/end times etc.
                paymentIntentData: paymentIntent, // Pass paymentIntent if needed for further processing
                mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`
              }
            });
          } else {
            console.warn("Failed to track booking with backend, but payment was successful. Consider how to handle this.");
            // Still navigate, but maybe with a warning or different state?
            // For now, proceeding to booking details form, but this needs robust error handling.
            alert("Payment was successful, but there was an issue tracking the booking on our server. Please contact support if your booking doesn't appear.")
            console.log("CalendlyAvailability: selectedTimeData BEFORE navigate (on tracking failure):", selectedTimeData);
            navigate('/booking-details', {
              state: {
                mentorId: currentMentor.id,
                calendlyEventData: selectedTimeData,
                paymentIntentData: paymentIntent,
                mentorName: `${currentMentor.first_name} ${currentMentor.last_name}`,
                trackingError: true
              }
            });
          }
        })
        .catch(error => {
          console.error("Error tracking booking with backend:", error);
          // Critical error - payment made but backend tracking failed.
          // Advise user and maybe don't proceed or proceed with caution
          alert("Payment was successful, but a critical error occurred while tracking your booking. Please contact support immediately.")
          // Potentially navigate to an error page or dashboard with a message
        });
    } else {
      console.error("handlePaymentSuccess called without currentMentor or selectedTimeData");
      // This case should ideally not happen if UI flow is correct
      alert("An unexpected error occurred after payment. Please contact support.");
    }

    // DO NOT Reset the booking flow here anymore
    // setShowPaymentForm(false);
    // setShowCalendly(true);

    // DO NOT Show success message here anymore
    // alert("Your session has been booked successfully!");
  };

  const handleCancel = () => {
    // Reset the booking flow
    setShowAuthForm(false);
    setShowPaymentForm(false);
    setShowCalendly(true);
  };

  // Render the appropriate booking step
  const renderBookingStep = () => {
    if (showCalendly) {
      // Step 1: Calendly booking
      return (
        <>
          {isLoading && (
            <div className="d-flex justify-content-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading Calendly...</span>
              </div>
            </div>
          )}

          <div style={{ opacity: isLoading ? 0.3 : 1 }}>
            <InlineWidget
              url={calendlyUrl}
              styles={styles}
              prefill={prefill}
              utm={utm}
              onLoad={handleCalendlyLoad}
              onError={handleCalendlyError}
            />
          </div>
        </>
      );
    } else if (showAuthForm) {
      // Step 2: Authentication form
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Authentication Required</h4>

            {/* Auth tabs */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeAuthTab === 'login' ? 'active' : ''}`}
                  onClick={() => handleSwitchTab('login')}
                >
                  Login
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeAuthTab === 'signup' ? 'active' : ''}`}
                  onClick={() => handleSwitchTab('signup')}
                >
                  Sign Up
                </button>
              </li>
            </ul>

            {/* Auth form */}
            <div className="auth-form-container">
              {activeAuthTab === 'login' ? (
                <CustomerLogin
                  onSuccess={handleLoginSuccess}
                  switchToSignUp={() => handleSwitchTab('signup')}
                  onForgotPs={() => { }}
                />
              ) : (
                <CustomerSignup
                  switchToLogin={() => handleSwitchTab('login')}
                />
              )}
            </div>

            <div className="text-center mt-3">
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                Back to Calendar
              </button>
            </div>
          </div>
        </div>
      );
    } else if (showPaymentForm) {
      // Step 3: Payment form
      return (
        <div className="card border-0 shadow p-4">
          <div className="card-body">
            <h4 className="text-center mb-4">Complete Your Booking</h4>

            <PaymentForm
              mentor={currentMentor}
              paidDateTime={selectedTimeData?.date}
              onSuccess={handlePaymentSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      );
    }

    // Fallback
    return <div>Something went wrong. Please try again.</div>;
  };

  return (
    <div className="calendly-container" ref={calendlyContainerRef}>
      {!currentMentor && (
        <div className="alert alert-info">
          Loading mentor information...
        </div>
      )}

      {currentMentor && !isValidUrl && (
        <div className="alert alert-warning">
          <p><strong>No scheduling link available</strong></p>
          <p>This mentor hasn't set up their availability calendar yet. Please contact them directly to arrange a session.</p>
          {currentMentor.email && (
            <p><strong>Contact:</strong> {currentMentor.email}</p>
          )}
        </div>
      )}

      {isValidUrl && renderBookingStep()}

      {hasError && (
        <div className="alert alert-danger mt-3">
          <p><strong>Error loading calendar</strong></p>
          <p>There was a problem loading the scheduling calendar. Please try again later or contact the mentor directly.</p>
        </div>
      )}
    </div>
  );
};

export default CalendlyAvailability;