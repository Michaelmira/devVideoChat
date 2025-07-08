import React from "react";
import "../../styles/upgrade-card.css";

export const PremiumStatusSection = ({ user }) => {
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="premium-status-card">
            <div className="card border-success mb-4">
                <div className="card-header bg-success text-white">
                    <h5 className="mb-0">
                        <i className="fas fa-crown me-2"></i>
                        Premium Member
                    </h5>
                </div>
                <div className="card-body">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            <div className="d-flex align-items-center mb-3">
                                <div className="premium-status-icon me-3">
                                    <i className="fas fa-check-circle text-success" style={{ fontSize: '2rem' }}></i>
                                </div>
                                <div>
                                    <h6 className="mb-1 text-success">
                                        <strong>Premium Active!</strong>
                                    </h6>
                                    <p className="text-muted mb-0">
                                        You're all set with premium features
                                    </p>
                                </div>
                            </div>

                            <div className="premium-features">
                                <h6 className="mb-2">Your Premium Benefits:</h6>
                                <ul className="list-unstyled mb-3">
                                    <li className="mb-2">
                                        <i className="fas fa-clock text-success me-2"></i>
                                        <strong>6-hour sessions</strong> - Extended meeting duration
                                    </li>
                                    <li className="mb-2">
                                        <i className="fas fa-video text-success me-2"></i>
                                        <strong>1 active link limit</strong> - Focused productivity
                                    </li>
                                    <li className="mb-2">
                                        <i className="fas fa-record-vinyl text-success me-2"></i>
                                        <strong>Recording capability</strong> - Save your meetings
                                    </li>
                                    <li>
                                        <i className="fas fa-headset text-success me-2"></i>
                                        <strong>Priority support</strong> - Get help faster
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="col-md-4 text-center">
                            <div className="premium-price-display mb-3">
                                <div className="display-6 text-success">$3</div>
                                <small className="text-muted">per month</small>
                            </div>
                            <div className="premium-details">
                                <p className="mb-2">
                                    <small className="text-muted">
                                        <i className="fas fa-calendar-alt me-1"></i>
                                        Next billing: {formatDate(user?.current_period_end)}
                                    </small>
                                </p>
                                <p className="mb-0">
                                    <small className="text-muted">
                                        <i className="fas fa-shield-alt me-1"></i>
                                        Cancel anytime
                                    </small>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="premium-actions mt-3 pt-3 border-top">
                        <div className="row">
                            <div className="col-md-6">
                                <button className="btn btn-outline-success btn-sm w-100">
                                    <i className="fas fa-cog me-2"></i>
                                    Manage Subscription
                                </button>
                            </div>
                            <div className="col-md-6">
                                <button className="btn btn-outline-secondary btn-sm w-100">
                                    <i className="fas fa-receipt me-2"></i>
                                    View Billing
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 