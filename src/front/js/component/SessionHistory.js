import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import RatingModal from '../component/RatingModal';

const SessionHistory = ({ userType }) => {
    const { store, actions } = useContext(Context);
    const [currentSessions, setCurrentSessions] = useState([]);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [sessionToRate, setSessionToRate] = useState(null);

    useEffect(() => {
        loadSessions();
    }, [userType]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            let result;
            if (userType === 'customer') {
                result = await actions.getCustomerSessions();
            } else {
                result = await actions.getMentorSessions();
            }

            if (result && result.success) {
                console.log('Loaded sessions successfully:', result);
                setCurrentSessions(result.currentSessions || []);
                setSessionHistory(result.sessionHistory || []);
                
                // Check if customer has sessions requiring rating
                if (userType === 'customer') {
                    const requiresRating = (result.currentSessions || []).find(
                        session => session.status === 'requires_rating'
                    );
                    if (requiresRating && !showRatingModal) {
                        setSessionToRate(requiresRating);
                        setShowRatingModal(true);
                    }
                }
            } else {
                console.error('Failed to load sessions - result:', result);
                setCurrentSessions([]);
                setSessionHistory([]);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            setCurrentSessions([]);
            setSessionHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingSubmit = async (ratingData) => {
        try {
            const result = await actions.submitRating(sessionToRate.id, ratingData);
            
            if (result.success) {
                setShowRatingModal(false);
                setSessionToRate(null);
                // Reload sessions to reflect the change
                await loadSessions();
                alert('Thank you for your rating!');
            } else {
                alert(result.message || 'Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Error submitting rating. Please try again.');
        }
    };

    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return 'Not scheduled';
        return new Date(dateTimeStr).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getBootstrapBadgeColor = (status) => {
        const statusColors = {
            'paid': 'bg-success',
            'confirmed': 'bg-success',
            'requires_rating': 'bg-warning',
            'completed': 'bg-primary'
        };
        return statusColors[status] || 'bg-secondary';
    };

    const getStatusText = (status) => {
        const statusTexts = {
            'paid': 'Scheduled',
            'confirmed': 'Confirmed',
            'requires_rating': 'Rate Session',
            'completed': 'Completed'
        };
        return statusTexts[status] || status;
    };

    const renderStars = (rating) => {
        if (!rating) return null;
        
        return (
            <span>
                {[...Array(5)].map((_, index) => (
                    <span key={index} className={index < rating ? 'text-warning' : 'text-muted'}>
                        ★
                    </span>
                ))}
                <span className="ms-1">({rating}/5)</span>
            </span>
        );
    };

    const SessionCard = ({ session, isHistory = false }) => {
        // Handle different field names between customer and mentor views
        const partnerName = userType === 'customer' ? session.mentor_name : session.customer_name;
        const sessionTime = session.session_start_time || session.scheduled_at;
        
        return (
            <div className="list-group-item list-group-item-action flex-column align-items-start mb-3">
                <div className="d-flex w-100 justify-content-between">
                    <h5 className="mb-1">Session with {partnerName}</h5>
                    <small>Status: <span className={`badge ${getBootstrapBadgeColor(session.status)}`}>{getStatusText(session.status)}</span></small>
                </div>
                
                <p className="mb-1">
                    <strong>Date & Time:</strong> {formatDateTime(sessionTime)}
                </p>
                
                {session.session_end_time && (
                    <p className="mb-1">
                        <strong>End Time:</strong> {formatDateTime(session.session_end_time)}
                    </p>
                )}
                
                <p className="mb-1">
                    <strong>Duration:</strong> {session.session_duration || 60} minutes
                </p>
                
                {session.timezone && (
                    <p className="mb-1">
                        <strong>Timezone:</strong> {session.timezone}
                    </p>
                )}
                
                {session.amount_paid && (
                    <p className="mb-1">
                        <strong>Amount Paid:</strong> ${session.amount_paid}
                    </p>
                )}

                {/* Meeting Link for current sessions */}
                {!isHistory && session.meeting_url && (
                    <p className="mb-1">
                        <strong>Meeting Link: </strong>
                        <a href={session.meeting_url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="btn btn-primary btn-sm">
                            Join Video Meeting
                        </a>
                    </p>
                )}
                
                {/* Create Meeting button if no meeting URL exists */}
                {!isHistory && session.status === 'confirmed' && !session.meeting_url && (
                    <p className="mb-1">
                        <button
                            onClick={async () => {
                                const result = await actions.createMeetingForBooking(session.id);
                                if (result.success) {
                                    // Refresh sessions to get the new meeting URL
                                    await loadSessions();
                                } else {
                                    alert('Failed to create meeting room. Please try again.');
                                }
                            }}
                            className="btn btn-primary btn-sm"
                        >
                            Create Meeting Room
                        </button>
                    </p>
                )}

                {/* Rating display for completed sessions */}
                {isHistory && session.customer_rating && (
                    <div className="mb-1">
                        <strong>Customer Rating:</strong> {renderStars(session.customer_rating)}
                        {userType === 'mentor' && (
                            <div className="text-muted small">
                                This session was rated by your student
                            </div>
                        )}
                    </div>
                )}

                {/* No rating message for mentors when there's no rating */}
                {isHistory && userType === 'mentor' && !session.customer_rating && (
                    <div className="mb-1">
                        <strong>Customer Rating:</strong> <span className="text-muted">Not rated yet</span>
                    </div>
                )}

                {/* Action buttons */}
                {session.status === 'requires_rating' && userType === 'customer' && (
                    <button
                        onClick={() => {
                            setSessionToRate(session);
                            setShowRatingModal(true);
                        }}
                        className="btn btn-warning btn-sm me-2"
                    >
                        Rate Session
                    </button>
                )}
                
                {isHistory && userType === 'customer' && (
                    <button className="btn btn-secondary btn-sm me-2">
                        Book Again
                    </button>
                )}

                {/* Additional notes for context */}
                {session.invitee_notes && (
                    <p className="mb-1">
                        <strong>Notes:</strong> {session.invitee_notes}
                    </p>
                )}
                
                <small>Booking ID: {session.id}</small>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <div className="text-muted">Loading sessions...</div>
            </div>
        );
    }

    return (
        <div className="mb-5">
            {/* Current Sessions */}
            <div className="mb-5">
                <h2 className="mb-4">Current Sessions</h2>
                {currentSessions.length === 0 ? (
                    <div className="alert alert-info">
                        <p className="mb-0">No current sessions</p>
                    </div>
                ) : (
                    <div className="list-group">
                        {currentSessions.map(session => (
                            <SessionCard key={session.id} session={session} isHistory={false} />
                        ))}
                    </div>
                )}
            </div>

            {/* Session History */}
            <div className="mb-5">
                <h2 className="mb-4">Session History</h2>
                {sessionHistory.length === 0 ? (
                    <div className="alert alert-info">
                        <p className="mb-0">No completed sessions yet</p>
                    </div>
                ) : (
                    <div className="list-group">
                        {sessionHistory.map(session => (
                            <SessionCard key={session.id} session={session} isHistory={true} />
                        ))}
                    </div>
                )}
            </div>

            {/* Rating Modal */}
            {showRatingModal && sessionToRate && (
                <RatingModal
                    booking={sessionToRate}
                    onSubmit={handleRatingSubmit}
                    onClose={() => {
                        setShowRatingModal(false);
                        setSessionToRate(null);
                    }}
                />
            )}
        </div>
    );
};

export default SessionHistory;