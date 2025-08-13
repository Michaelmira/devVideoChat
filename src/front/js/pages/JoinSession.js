import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export const JoinSession = () => {
    const { meetingId } = useParams();
    const navigate = useNavigate();
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [guestName, setGuestName] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        // Load session status
        loadSessionStatus();

        // Set up interval to refresh session status
        const interval = setInterval(loadSessionStatus, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [meetingId]);

    const loadSessionStatus = async () => {
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/session-status/${meetingId}`);

            if (response.ok) {
                const data = await response.json();
                setSessionData(data);
                setError('');
            } else {
                const errorData = await response.json();
                setError(errorData.msg || 'Session not found');
            }
        } catch (error) {
            console.error('Error loading session status:', error);
            setError('Failed to load session information');
        } finally {
            setLoading(false);
        }
    };

    const joinAsGuest = async () => {
        if (!guestName.trim()) {
            alert('Please enter your name to join');
            return;
        }

        setJoining(true);
        try {
            const response = await fetch(`${process.env.BACKEND_URL}/api/join/${meetingId}`);

            if (response.ok) {
                const data = await response.json();

                // Store guest info and token
                sessionStorage.setItem('guest_name', guestName);
                sessionStorage.setItem('guest_token', data.guest_token);
                sessionStorage.setItem('meeting_data', JSON.stringify(data));

                // Navigate to video meeting
                navigate(`/video-meeting/${meetingId}`);
            } else {
                const errorData = await response.json();
                setError(errorData.msg || 'Failed to join session');
            }
        } catch (error) {
            console.error('Error joining session:', error);
            setError('Network error. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div 
                className="container-fluid" 
                style={{
                width: "100vw",
                background: `
                    radial-gradient(circle at 22% 20%, rgba(255, 0, 0, 0.8), transparent 26%),
                    
                    black
                    `,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                }}
            >
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-body text-center py-5">
                                <div className="spinner-border text-primary mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <h5>Loading session...</h5>
                                <p className="text-muted">Please wait while we check the session</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div 
                className="container-fluid" 
                style={{
                width: "100vw",
                background: `
                    radial-gradient(circle at 22% 20%, rgba(255, 0, 0, 0.8), transparent 26%),
                    
                    black
                    `,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                }}
            >
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card border-danger">
                            <div className="card-body text-center py-5">
                                <div className="mb-3" style={{ fontSize: '4rem' }}>❌</div>
                                <h4 className="text-danger mb-3">Session Not Available</h4>
                                <p className="text-white mb-4">{error}</p>
                                <div className="d-grid gap-2">
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                        onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                        e.currentTarget.style.transform = "translateY(-1px)"
                                        }}
                                        onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.transform = "translateY(0)"
                                        }}
                                        onClick={() => navigate('/')}
                                    >
                                        Go to Home Page
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                        onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                        e.currentTarget.style.transform = "translateY(-1px)"
                                        }}
                                        onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.transform = "translateY(0)"
                                        }}
                                        onClick={loadSessionStatus}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isExpired = sessionData?.status !== 'active' || sessionData?.time_remaining_minutes <= 0;

    return (
        <div 
            className="container-fluid" 
            style={{
            width: "100vw",
            background: `
				radial-gradient(circle at 22% 20%, rgba(255, 0, 0, 0.8), transparent 26%),
				
				black
				`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            }}
        >
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card shadow-lg mt-5" style={{ backgroundColor: "#18181B" }}>
                        <div className="card-header text-white text-center" style={{ backgroundColor: "#EC4432" }}>
                            <h4 className="mb-0">
                                <i className="fas fa-video me-2"></i>
                                Join Video Chat
                            </h4>
                        </div>
                        <div className="card-body">
                            {isExpired ? (
                                <div className="text-center py-4">
                                    <div className="mb-3" style={{ fontSize: '4rem' }}>⏰</div>
                                    <h5 className="mb-3" style={{ color: "#EC4432" }}>Session Expired</h5>
                                    <p className="text-white">This video chat session has expired or ended.</p>
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                        onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                        e.currentTarget.style.transform = "translateY(-1px)"
                                        }}
                                        onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.transform = "translateY(0)"
                                        }}
                                        onClick={() => navigate('/')}
                                    >
                                        Create Your Own Session
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center text-white mb-4">
                                        <h5>Ready to join!</h5>
                                        <p className="text-white">
                                            Hosted by <strong>{sessionData?.creator_name}</strong>
                                        </p>
                                    </div>

                                    {/* Session Info */}
                                    <div className="row text-center mb-4">
                                        <div className="col-6">
                                            <div className="badge mb-2 fs-6" style={{ backgroundColor: "#EC4432" }}>
                                                ⏰ {sessionData?.time_remaining_minutes}m left
                                            </div>
                                            <div className="small text-white">Time Remaining</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="badge mb-2 fs-6" style={{ backgroundColor: "#C03728" }}>
                                                📹 {sessionData?.max_duration_minutes}min max
                                            </div>
                                            <div className="small text-white">Session Duration</div>
                                        </div>
                                    </div>

                                    {/* Join Form */}
                                    <div className="mb-4">
                                        <label htmlFor="guestName" className="form-label text-danger">
                                            Your Name <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control form-control-lg"
                                            id="guestName"
                                            placeholder="Enter your name"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && joinAsGuest()}
                                            maxLength={50}
                                        />
                                        <div className="form-text">
                                            This is how other participants will see you
                                        </div>
                                    </div>

                                    <div className="d-grid">
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                            onMouseEnter={e => {
                                            e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                            e.currentTarget.style.transform = "translateY(-1px)"
                                            }}
                                            onMouseLeave={e => {
                                            e.currentTarget.style.boxShadow = "none";
                                            e.currentTarget.style.transform = "translateY(0)"
                                            }}
                                            onClick={joinAsGuest}
                                            disabled={joining || !guestName.trim()}
                                        >
                                            {joining ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Joining...
                                                </>
                                            ) : (
                                                <>
                                                    🎥 Join Video Chat
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Features */}
                                    <div className="mt-4">
                                        <h6 className="text-white mb-3">What you'll get:</h6>
                                        <div className="row text-center">
                                            <div className="col-4">
                                                <i className="fas fa-video fs-4" style={{ color: "#EC4432"}}></i>
                                                <div className="small text-white mt-1">HD Video</div>
                                            </div>
                                            <div className="col-4">
                                                <i className="fas fa-microphone fs-4" style={{ color: "#EC4432"}}></i>
                                                <div className="small text-white mt-1">Clear Audio</div>
                                            </div>
                                            <div className="col-4">
                                                <i className="fas fa-desktop fs-4" style={{ color: "#EC4432"}}></i>
                                                <div className="small text-white mt-1">Screen Share</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="card-footer text-center">
                            <small className="text-white">
                                No account required • Secure connection • Free to join
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 