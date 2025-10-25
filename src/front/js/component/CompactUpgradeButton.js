import React from "react";

export const CompactUpgradeButton = ({ onClick }) => {
    return (
        <div
            className="pb-4 d-flex flex-column align-items-center text-center"
        >
            <div className="mt-4" >
                <h5 className="mb-2 text-white">Upgrade to Premium</h5>
                <p className="text-white mb-3">
                    Unlock 6-hour sessions for just <strong>$3/month</strong>
                </p>
            </div>

            <div className="upgrade-benefits mb-3">
                <div className="benefit-item text-white">
                    <i className="fas fa-clock me-2"></i>
                    <span>6-hour sessions (vs 50 minutes)</span>
                </div>
                <div className="benefit-item text-white">
                    <i className="fas fa-video text-success me-2"></i>
                    <span>1 active link at a time</span>
                </div>
                {/* <div className="benefit-item text-white">
                    <i className="fas fa-record-vinyl text-info me-2"></i>
                    <span>Recording capability</span>
                </div> */}
            </div>

            <button
                className="btn mb-4 text-white w-50"
                style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease", minHeight: "60px", fontWeight: "bold" }}
                onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                    e.currentTarget.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)"
                }}
                onClick={onClick}
            >
                <i className="fas fa-arrow-up me-2"></i>
                Upgrade Now
            </button>
        </div>
    );
}; 