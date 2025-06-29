import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import { useNavigate } from 'react-router-dom';

const SessionHistory = ({ userType }) => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();
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

    // NEW: Handle booking again with the same mentor
    const handleBookAgain = (session) => {
        // Navigate to mentor details page using the mentor's ID from the session
        // We need to extract the mentor ID - it should be available in the session data
        const mentorId = session.mentor_id || session.mentorId;
        if (mentorId) {
            navigate(`/mentor-details/${mentorId}`);
        } else {
            // Fallback: try to find mentor in store by name
            const mentor = store.mentors.find(m => 
                `${m.first_name} ${m.last_name}` === session.mentor_name
            );
            if (mentor) {
                navigate(`/mentor-details/${mentor.id}`);
            } else {
                alert('Unable to find mentor details. Please browse mentors manually.');
            }
        }
    };
    const handleFlagSession = async (session) => {
        try {
            const result = await actions.flagSession(session.id);
            if (result.success) {
                await loadSessions(); // Refresh to show updated flag status
            } else {
                alert(result.message || 'Failed to flag session');
            }
        } catch (error) {
            console.error('Error flagging session:', error);
            alert('Error flagging session. Please try again.');
        }
    };
    const handleFinishSession = async (session) => {
        try {
            if (userType === 'customer') {
                // For customers: Change status to requires_rating and open rating modal immediately
                const result = await actions.finishSession(session.id);
                if (result.success) {
                    // Update the session object with new status for the modal
                    const updatedSession = { ...session, status: 'requires_rating' };
                    setSessionToRate(updatedSession);
                    setShowRatingModal(true);
                    // Don't reload sessions yet - wait until after rating is submitted
                } else {
                    alert(result.message || 'Failed to finish session');
                }
            } else {
                // For mentors: Change status to requires_rating (customer will rate later)
                const result = await actions.finishSession(session.id);
                if (result.success) {
                    await loadSessions(); // Refresh the session list
                    alert('Session marked as completed! The customer will be prompted to rate the session.');
                } else {
                    alert(result.message || 'Failed to finish session');
                }
            }
        } catch (error) {
            console.error('Error finishing session:', error);
            alert('Error finishing session. Please try again.');
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
                           className="btn btn-primary btn-sm me-2">
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
                            className="btn btn-primary btn-sm me-2"
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
                <div className="mt-2">
                    {/* Finish Session button for current confirmed sessions */}
                    {!isHistory && session.status === 'confirmed' && (
                        <button
                            onClick={() => handleFinishSession(session)}
                            className="btn btn-success btn-sm me-2"
                        >
                            {userType === 'customer' ? 'Finish & Rate Session' : 'Mark Session Complete'}
                        </button>
                    )}

                    {/* Rate Session button for requires_rating status */}
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
                    
                    {/* Book Again button for completed sessions */}
                    {isHistory && userType === 'customer' && (
                        <button 
                            onClick={() => handleBookAgain(session)}
                            className="btn btn-secondary btn-sm me-2"
                        >
                            Book Again
                        </button>
                    )}

                    {/* Flag for Review button */}
                    {(() => {
                        const isFlagged = userType === 'customer' ? session.flagged_by_customer : session.flagged_by_mentor;
                        return (
                            <button
                                onClick={() => handleFlagSession(session)}
                                className={`btn btn-sm ${isFlagged ? 'btn-danger' : 'btn-outline-warning'}`}
                            >
                                {isFlagged ? 'Flagged ✓' : 'Flag for Review'}
                            </button>
                        );
                    })()}
                </div>

                {/* Show support email if flagged BY CURRENT USER */}
                {(() => {
                    const isFlaggedByCurrentUser = userType === 'customer' ? session.flagged_by_customer : session.flagged_by_mentor;
                    return isFlaggedByCurrentUser && (
                        <div className="mt-2 p-3 bg-warning bg-opacity-10 border border-warning rounded">
                            <div className="d-flex align-items-center mb-2">
                                <i className="fas fa-flag text-warning me-2"></i>
                                <strong className="text-warning">Booking Flagged for Review</strong>
                            </div>
                            <p className="mb-2 small">
                                Your booking number is: <strong>{session.id}</strong>
                            </p>
                            <p className="mb-2 small">
                                Please contact platform at{' '}
                                <a 
                                    href={`mailto:${process.env.REACT_APP_GMAIL || 'devmentorllc@gmail.com'}?subject=${store.currentUserData?.user_data?.first_name || ''} ${store.currentUserData?.user_data?.last_name || ''} - Booking ${session.id}&body=Hi DevMentor Platform,%0D%0A%0D%0ABooking Number: ${session.id}%0D%0ASession with: ${partnerName}%0D%0A%0D%0AProblem Description:%0D%0A[Please describe your issue here]%0D%0A%0D%0AThank you`}
                                    className="fw-bold text-decoration-none"
                                >
                                    {process.env.REACT_APP_GMAIL || 'devmentorllc@gmail.com'}
                                </a>
                                {' '}and explain your problem.
                            </p>
                            <div className="small text-muted">
                                <strong>Important:</strong> Please include your full name and booking number in the email subject
                            </div>
                        </div>
                    );
                })()}

                {/* Additional notes for context */}
                {session.invitee_notes && (
                    <p className="mb-1 mt-2">
                        <strong>Notes:</strong> {session.invitee_notes}
                    </p>
                )}
                
                <small className="text-muted">Booking ID: {session.id}</small>
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

            {/* Simple Bootstrap Rating Modal */}
            {showRatingModal && sessionToRate && (
                <div className="modal fade show" style={{display: 'block'}} tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Rate Your Session</h5>
                                <button type="button" className="close" onClick={() => setShowRatingModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>How was your session with {sessionToRate.mentor_name || sessionToRate.customer_name}?</p>
                                
                                {/* Star Rating */}
                                <div className="form-group">
                                    <label>Rating:</label>
                                    <div>
                                        {[1,2,3,4,5].map(star => (
                                            <span 
                                                key={star}
                                                style={{fontSize: '24px', cursor: 'pointer', color: star <= (sessionToRate.tempRating || 0) ? '#ffc107' : '#ddd'}}
                                                onClick={() => {
                                                    setSessionToRate({...sessionToRate, tempRating: star});
                                                }}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="form-group">
                                    <label>Notes (optional):</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="3"
                                        value={sessionToRate.tempNotes || ''}
                                        onChange={(e) => setSessionToRate({...sessionToRate, tempNotes: e.target.value})}
                                        placeholder="Share your thoughts about the session..."
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowRatingModal(false)}>
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (sessionToRate.tempRating) {
                                            handleRatingSubmit({
                                                rating: sessionToRate.tempRating,
                                                customer_notes: sessionToRate.tempNotes || ''
                                            });
                                        } else {
                                            alert('Please select a rating');
                                        }
                                    }}
                                >
                                    Submit Rating
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal backdrop */}
            {showRatingModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default SessionHistory;