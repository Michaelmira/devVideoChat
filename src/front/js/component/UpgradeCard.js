import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export const UpgradeCard = () => {
    const navigate = useNavigate();
    const [upgrading, setUpgrading] = useState(false);

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/create-subscription`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                // Redirect to Stripe Checkout or handle subscription creation
                if (data.client_secret) {
                    // You would integrate with Stripe Elements here
                    // For now, we'll just navigate to a subscription page
                    navigate('/subscription', { state: { clientSecret: data.client_secret } });
                }
            } else {
                const errorData = await response.json();
                alert(`❌ ${errorData.msg || 'Failed to start upgrade process'}`);
            }
        } catch (error) {
            console.error('Error starting upgrade:', error);
            alert('❌ Network error. Please try again.');
        } finally {
            setUpgrading(false);
        }
    };

    return (
        <div className="card border-primary mb-4">
            <div className="card-header bg-primary text-white">
                <h5 className="mb-0">
                    <i className="fas fa-star me-2"></i>
                    Upgrade to Premium
                </h5>
            </div>
            <div className="card-body">
                <div className="row align-items-center">
                    <div className="col-md-8">
                        <h6 className="card-title">Get 6-Hour Video Sessions</h6>
                        <p className="card-text mb-2">
                            Upgrade to Premium for just <strong>$3/month</strong> and unlock:
                        </p>
                        <ul className="list-unstyled mb-3">
                            <li>✅ <strong>6-hour sessions</strong> (vs 50 minutes)</li>
                            <li>✅ <strong>Recording capability</strong></li>
                            <li>✅ <strong>Priority support</strong></li>
                            <li>✅ <strong>HD video quality</strong></li>
                        </ul>
                        <small className="text-muted">
                            Cancel anytime • No setup fees • Instant activation
                        </small>
                    </div>
                    <div className="col-md-4 text-center">
                        <div className="mb-3">
                            <div className="display-6 text-primary">$3</div>
                            <small className="text-muted">per month</small>
                        </div>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleUpgrade}
                            disabled={upgrading}
                        >
                            {upgrading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-crown me-2"></i>
                                    Upgrade Now
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <div className="card-footer bg-light">
                <div className="row text-center">
                    <div className="col-4">
                        <div className="text-success">
                            <i className="fas fa-clock fs-4"></i>
                            <div className="small">50min → 6hrs</div>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="text-info">
                            <i className="fas fa-video fs-4"></i>
                            <div className="small">HD Quality</div>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="text-warning">
                            <i className="fas fa-headset fs-4"></i>
                            <div className="small">Priority Support</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 