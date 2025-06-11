// PaymentForm.js
import React, { useContext } from 'react';
import { Context } from "../store/appContext";
import { StripePaymentComponent } from "./StripePaymentComponent";

export const PaymentForm = ({ mentor, paidDateTime, sessionDuration, onSuccess, onCancel }) => {
  const { store } = useContext(Context);

  // Get the current user data
  const userData = store.currentUserData?.user_data || {};

  // Function to handle successful payment
  const handlePaymentSuccess = (paymentIntent) => {
    console.log("Payment successful:", paymentIntent);

    // Call the parent success handler
    if (onSuccess) {
      onSuccess(paymentIntent);
    }
  };

  // Function to handle payment errors
  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
    // You might want to show an error message
    alert(`Payment error: ${error.message || 'Unknown error'}`);
  };

  // Get the amount from mentor data
  const sessionAmount = parseFloat(mentor?.price || 0);

  // Format the date/time properly
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not scheduled';
    
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  // Debug output
  console.log("Payment form data:", {
    customer: {
      id: userData.id,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`,
      email: userData.email
    },
    mentor: {
      id: mentor.id,
      name: `${mentor.first_name} ${mentor.last_name}`,
      price: sessionAmount
    },
    session: {
      dateTime: paidDateTime,
      duration: sessionDuration || mentor.session_duration || 60
    }
  });

  return (
    <div className="payment-form-container">
      <div className="session-details mb-4">
        <h4 className="text-center mb-3">Session Details</h4>
        <p><strong>Mentor:</strong> {mentor.first_name} {mentor.last_name}</p>
        <p><strong>Date/Time:</strong> {formatDateTime(paidDateTime)}</p>
        <p><strong>Session Duration:</strong> {sessionDuration || mentor.session_duration || 60} minutes</p>
        <p><strong>Amount:</strong> ${sessionAmount.toFixed(2)}</p>
      </div>

      <div className="stripe-payment-wrapper">
        <StripePaymentComponent
          customerId={userData.id?.toString()}
          customerName={`${userData.first_name || ''} ${userData.last_name || ''}`}
          mentorId={mentor.id.toString()}
          mentorName={`${mentor.first_name} ${mentor.last_name}`}
          amount={sessionAmount}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      </div>

      <div className="text-center mt-3">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};