import React from 'react';
import { StripePaymentComponent } from '../component/StripePaymentComponent';

export const StripePaymentExample = () => {
  // This data would typically come from your application state or props
  const customerId = 123;
  const customerName = "John Doe";
  const mentorId = 456;
  const mentorName = "Jane Smith";
  const amount = 1; // $1.00

  const handlePaymentSuccess = (paymentIntent) => {
    console.log('Payment succeeded:', paymentIntent);
    alert('Payment successful! Thank you for your payment.');
    // Here you might update UI state, redirect, or perform additional actions
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    // Handle the error appropriately in your UI
  };

  return (
    <div>
      <h2>Payment for Mentoring Session</h2>
      <StripePaymentComponent
        customerId={customerId}
        customerName={customerName}
        mentorId={mentorId}
        mentorName={mentorName}
        amount={amount}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
};

