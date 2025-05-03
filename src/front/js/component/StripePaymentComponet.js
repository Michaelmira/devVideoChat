import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';
import '../../styles/StripePayment.css';

// Initialize Stripe with your public key from env variables
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Payment Form Component
const CheckoutForm = ({ customerId, customerName, mentorId, mentorName, amount, onPaymentSuccess, onPaymentError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  // Get the payment intent client secret when the component mounts
  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        // Get the token from local storage
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('You must be logged in to make a payment');
          return;
        }

        const response = await axios.post(
          '/api/create-payment-intent',
          {
            customer_id: customerId,
            customer_name: customerName,
            mentor_id: mentorId,
            mentor_name: mentorName,
            amount: amount * 100 // Convert to cents for Stripe
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setClientSecret(response.data.clientSecret);
      } catch (err) {
        setError(err.message || 'An error occurred while setting up the payment');
        if (onPaymentError) onPaymentError(err);
      }
    };

    fetchClientSecret();
  }, [customerId, mentorId, amount, customerName, mentorName]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const cardElement = elements.getElement(CardElement);
    
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName
          }
        }
      });

      if (error) {
        setError(error.message);
        if (onPaymentError) onPaymentError(error);
      } else if (paymentIntent.status === 'succeeded') {
        if (onPaymentSuccess) onPaymentSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
      if (onPaymentError) onPaymentError(err);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    style: {
      base: {
        color: '#32325d',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-group">
        <div className="payment-details">
          <h4>Payment Details</h4>
          <p>Customer: {customerName}</p>
          <p>Mentor: {mentorName}</p>
          <p className="price">Amount: ${amount.toFixed(2)}</p>
        </div>
        
        <div className="card-element-container">
          <CardElement options={cardStyle} />
        </div>
        
        {error && (
          <div className="payment-error">
            <p>{error}</p>
          </div>
        )}
        
        <button 
          disabled={!stripe || loading} 
          className={`payment-button ${loading ? 'loading' : ''}`}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </form>
  );
};

// Main Payment Component
export const StripePaymentComponent = ({ 
  customerId, 
  customerName, 
  mentorId, 
  mentorName, 
  amount, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  return (
    <div className="stripe-payment-container">
      <Elements stripe={stripePromise}>
        <CheckoutForm 
          customerId={customerId}
          customerName={customerName}
          mentorId={mentorId}
          mentorName={mentorName}
          amount={amount} 
          onPaymentSuccess={onPaymentSuccess}
          onPaymentError={onPaymentError}
        />
      </Elements>
    </div>
  );
};

