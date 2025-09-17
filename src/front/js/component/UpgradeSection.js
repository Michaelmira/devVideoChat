import React from "react";
import { CompactUpgradeButton } from "./CompactUpgradeButton";
import { ExpandedPaymentCard } from "./ExpandedPaymentCard";
import "../../styles/upgrade-card.css";

export const UpgradeSection = ({ expanded, onStartUpgrade, onPaymentSuccess, onCancel }) => {
    return (
        <div
            className="card mb-4"
            style={!expanded ? { backgroundColor: "#18181B" } : { backgroundColor: "transparent"}}
        >
            {expanded ? (
                <ExpandedPaymentCard
                    onSuccess={onPaymentSuccess}
                    onCancel={onCancel}
                />
            ) : (
                <CompactUpgradeButton onClick={onStartUpgrade} />
            )}
        </div>
    );
}; 