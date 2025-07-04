import React from "react";
import { CompactUpgradeButton } from "./CompactUpgradeButton";
import { ExpandedPaymentCard } from "./ExpandedPaymentCard";
import "../../styles/upgrade-card.css";

export const UpgradeSection = ({ expanded, onStartUpgrade, onPaymentSuccess, onCancel }) => {
    return (
        <div className={`upgrade-card ${expanded ? 'expanded' : 'compact'}`}>
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