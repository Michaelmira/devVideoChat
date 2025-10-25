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
            <div className="card mb-4" style={{ backgroundColor: "#18181B" }}>
                <div className="card-header text-white" style={{ backgroundColor: '#EC4432' }}>
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
                                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#EC4432' }}></i>
                                </div>
                                <div>
                                    <h6 className="mb-1" style={{ color: '#EC4432' }}>
                                        <strong>Premium Active!</strong>
                                    </h6>
                                    <p className="text-white mb-0">
                                        You're all set with premium features
                                    </p>
                                </div>
                            </div>

                            <div className="premium-features">
                                <h6 className="mb-2 text-white">Your Premium Benefits:</h6>
                                <ul className="list-unstyled mb-3">
                                    <li className="mb-2">
                                        <i className="fas fa-clock me-2" style={{ color: '#EC4432' }}></i>
                                        <strong>6-hour sessions</strong> - Extended meeting duration
                                    </li>
                                    <li className="mb-2">
                                        <i className="fas fa-video me-2" style={{ color: '#EC4432' }}></i>
                                        <strong>1 active link limit</strong> - Focused productivity
                                    </li>
                                    {/* <li className="mb-2">
                                        <i className="fas fa-record-vinyl me-2" style={{ color: '#EC4432' }}></i>
                                        <strong>Recording capability</strong> - Save your meetings
                                    </li> */}
                                    <li>
                                        <i className="fas fa-headset me-2" style={{ color: '#EC4432' }}></i>
                                        <strong>Priority support</strong> - Get help faster
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="col-md-4 text-center">
                            <div className="premium-price-display mb-3">
                                <div className="display-6" style={{ color: '#EC4432' }}>$3</div>
                                <small className="text-white">per month</small>
                            </div>
                            <div className="premium-details">
                                <p className="mb-2">
                                    <small className="text-white">
                                        <i className="fas fa-calendar-alt me-1"></i>
                                        Next billing: {formatDate(user?.current_period_end)}
                                    </small>
                                </p>
                                <p className="mb-0">
                                    <small className="text-white">
                                        <i className="fas fa-shield-alt me-1"></i>
                                        Cancel anytime
                                    </small>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="premium-actions mt-3 pt-3 border-top" style={{ backgroundColor: "#18181B" }}>
                        <div className="row">
                            <div className="col-md-6">
                                <button
                                    className="btn btn-sm w-100"
                                    style={{ backgroundColor: "#EC4432", color: "#fff", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                    onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                    e.currentTarget.style.transform = "translateY(-1px)"
                                    }}
                                    onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "translateY(0)"
                                    }}
                                >
                                    <i className="fas fa-cog me-2"></i>
                                    Manage Subscription
                                </button>
                            </div>
                            <div className="col-md-6">
                                <button 
                                    className="btn btn-outline-secondary btn-sm w-100"
                                    style={{ backgroundColor: "transparent", color: "#fff", border: "2px solid #EC4432", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                    onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = "0 0 5px 1px #EC4432";
                                    e.currentTarget.style.transform = "translateY(-1px)"
                                    }}
                                    onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.transform = "translateY(0)"
                                    }}
                                >
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