import React from "react";

export const CompactUpgradeButton = ({ onClick }) => {
    return (
        <div className="upgrade-content">
            <div className="upgrade-header">
                <h5 className="mb-2">Upgrade to Premium</h5>
                <p className="text-muted mb-3">
                    Unlock 6-hour sessions for just <strong>$3/month</strong>
                </p>
            </div>

            <div className="upgrade-benefits mb-3">
                <div className="benefit-item">
                    <i className="fas fa-clock text-primary me-2"></i>
                    <span>6-hour sessions (vs 50 minutes)</span>
                </div>
                <div className="benefit-item">
                    <i className="fas fa-video text-success me-2"></i>
                    <span>1 active link at a time</span>
                </div>
                <div className="benefit-item">
                    <i className="fas fa-record-vinyl text-info me-2"></i>
                    <span>Recording capability</span>
                </div>
            </div>

            <button
                className="btn btn-upgrade w-100"
                onClick={onClick}
            >
                <i className="fas fa-arrow-up me-2"></i>
                Upgrade Now
            </button>
        </div>
    );
}; 