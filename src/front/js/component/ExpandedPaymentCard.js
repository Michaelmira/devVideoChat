import React, { useState, useEffect } from "react";
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';

// Initialize Stripe
console.log('🔍 DEBUG - Stripe Public Key:', process.env.REACT_APP_STRIPE_PUBLIC_KEY);
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const PaymentForm = ({ onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = sessionStorage.getItem('token');
            
            // Step 1: Create payment intent (not subscription yet)
            const response = await fetch(`${process.env.BACKEND_URL}/api/create-subscription`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Backend error:', errorData);
                console.error('❌ Response status:', response.status);
                throw new Error(errorData.msg || 'Failed to create payment intent');
            }

            const paymentData = await response.json();
            const clientSecret = paymentData.client_secret;

            // Step 2: Confirm payment with Stripe
            const cardElement = elements.getElement(CardElement);

            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                }
            });

            if (error) {
                setError(error.message);
            } else if (paymentIntent.status === 'succeeded') {
                // Step 3: Create actual subscription after payment succeeds
                const confirmResponse = await fetch(`${process.env.BACKEND_URL}/api/confirm-subscription`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        payment_intent_id: paymentIntent.id
                    })
                });

                if (!confirmResponse.ok) {
                    const errorData = await confirmResponse.json();
                    throw new Error(errorData.msg || 'Failed to confirm subscription');
                }

                const subscriptionData = await confirmResponse.json();
                console.log('✅ Subscription created successfully:', subscriptionData);
                
                // Payment and subscription both succeeded
                onSuccess(paymentIntent);
            }

        } catch (err) {
            setError(err.message || 'Network error. Please try again.');
        }

        setLoading(false);
    };

    const cardStyle = {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    };

    return (
        <form 
            onSubmit={handleSubmit} className="payment-form p-4" 
            style={{ 
                backgroundColor: "#18181B",
                border: "none",
                borderRadius: "12px",
                backgroundColor: "#18181B",
            }}
        >
            <div className="payment-header d-flex justify-content-center w-100">
                <h4 className="text-white">Complete Your Upgrade</h4>
            </div>

            <div className="upgrade-badges mb-4">
                <span className="badge ms-2" style={{ backgroundColor: "#C03728" }}>
                    <i className="fas fa-clock me-1"></i>
                    6-hour sessions
                </span>
                <span className="badge ms-2" style={{ backgroundColor: "#C03728" }}>
                    <i className="fas fa-dollar-sign me-1"></i>
                    Only $3/month
                </span>
            </div>

            <div className="card-element-container mb-3">
                <CardElement options={cardStyle} />
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            <div className="">
                <button 
                    type="submit" 
                    disabled={!stripe || loading}
                    className="btn btn-primary btn-lg w-100"
                    style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease", minHeight: "60px", fontWeight: "bold" }}
                    onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                        e.currentTarget.style.transform = "translateY(-1px)"
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)"
                    }}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Processing...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-credit-card me-2"></i>
                            Pay $3.00/month
                        </>
                    )}
                </button>

                <button
                    type="button"
                    className="btn btn-outline-secondary mt-2 w-100"
                    style={{ backgroundColor: "transparent", border: "2px solid #EC4432", minHeight: "60px", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                    onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = "0 0 5px 1px #EC4432";
                    e.currentTarget.style.transform = "translateY(-1px)"
                    }}
                    onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)"
                    }}
                    onClick={onCancel}
                >
                    <i className="fas fa-times me-2"></i>
                    Cancel
                </button>
            </div>

            <div className="payment-footer text-center mt-3">
                <small className="text-muted">
                    <i className="fas fa-lock me-1"></i>
                    Secure payment powered by Stripe
                </small>
            </div>
        </form>
    );
};

export const ExpandedPaymentCard = ({ onSuccess, onCancel }) => {
    return (
        <div className="expanded-payment-wrapper">
            <Elements stripe={stripePromise}>
                <PaymentForm onSuccess={onSuccess} onCancel={onCancel} />
            </Elements>
        </div>
    );
}; 