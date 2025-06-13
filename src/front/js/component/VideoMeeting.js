import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant, Constants, MeetingConsumer } from '@videosdk.live/react-sdk';

function ParticipantView({ participantId }) {
    const { 
        webcamStream, 
        micStream, 
        webcamOn, 
        micOn, 
        isLocal, 
        displayName,
        screenShareStream,
        screenShareOn,
        mode
    } = useParticipant(participantId);
    
    const videoRef = React.useRef(null);
    const screenShareRef = React.useRef(null);

    // Handle webcam stream
    useEffect(() => {
        if (webcamStream && videoRef.current && !screenShareOn) {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(webcamStream.track);
            videoRef.current.srcObject = mediaStream;
            
            videoRef.current.play().catch(error => {
                console.error("Error playing video:", error);
            });
        } else if (videoRef.current && !screenShareOn) {
            videoRef.current.srcObject = null;
        }
    }, [webcamStream, screenShareOn]);

    // Handle screen share stream
    useEffect(() => {
        if (screenShareStream && screenShareRef.current) {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(screenShareStream.track);
            screenShareRef.current.srcObject = mediaStream;
            
            screenShareRef.current.play().catch(error => {
                console.error("Error playing screen share:", error);
            });
        } else if (screenShareRef.current) {
            screenShareRef.current.srcObject = null;
        }
    }, [screenShareStream]);

    // If this participant is sharing screen, show screen share prominently
    if (screenShareOn && screenShareStream) {
        return (
            <div className="participant-view screen-share-view" style={{ 
                position: 'relative',
                backgroundColor: '#000',
                borderRadius: '8px',
                overflow: 'hidden',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Screen share video - main view */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <video
                        ref={screenShareRef}
                        autoPlay
                        playsInline
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            backgroundColor: '#000'
                        }}
                    />
                    
                    {/* Screen share indicator */}
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: 'rgba(255, 0, 0, 0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                    }}>
                        🖥️ Screen Sharing
                    </div>
                </div>

                {/* Small webcam view in corner */}
                {webcamOn && webcamStream && (
                    <div style={{
                        position: 'absolute',
                        bottom: '15px',
                        right: '15px',
                        width: '150px',
                        height: '100px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '2px solid #fff',
                        backgroundColor: '#1a1a1a'
                    }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted={isLocal}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    </div>
                )}

                {/* Participant name and status */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    {displayName || 'Participant'} {isLocal && '(You)'}
                    {!micOn && ' 🔇'}
                </div>
            </div>
        );
    }

    // Regular participant view (no screen sharing)
    return (
        <div className="participant-view" style={{ 
            position: 'relative',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            overflow: 'hidden',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {webcamOn ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            ) : (
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    color: '#fff'
                }}>
                    {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
            )}
            
            <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
            }}>
                {displayName || 'Participant'} {isLocal && '(You)'}
                {!micOn && ' 🔇'}
            </div>
        </div>
    );
}

function MeetingView({ onMeetingLeave, meetingId, onTokenRefresh }) {
    const [joined, setJoined] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenShareError, setScreenShareError] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
    
    // Refs for intervals
    const tokenRefreshInterval = useRef(null);
    const connectionCheckInterval = useRef(null);
    
    const { 
        join, 
        leave, 
        toggleMic, 
        toggleWebcam, 
        toggleScreenShare,
        participants, 
        localScreenShareOn,
        localMicOn,
        localWebcamOn
    } = useMeeting({
        onMeetingJoined: () => {
            console.log("Meeting joined successfully");
            setJoined('JOINED');
            setConnectionStatus('connected');
            startTokenRefreshTimer();
            startConnectionMonitoring();
        },
        onMeetingLeft: () => {
            console.log("Meeting left");
            clearIntervals();
            onMeetingLeave();
        },
        onError: (error) => {
            console.error("Meeting error:", error);
            setConnectionStatus('error');
            
            // Handle specific error types
            if (error.message && error.message.includes('token')) {
                setTokenExpiryWarning(true);
                handleTokenRefresh();
            } else {
                alert(`Meeting Error: ${error.message || 'Unknown error occurred'}`);
            }
        },
        onScreenShareStarted: () => {
            console.log("Screen share started");
            setIsScreenSharing(true);
            setScreenShareError(null);
        },
        onScreenShareStopped: () => {
            console.log("Screen share stopped");
            setIsScreenSharing(false);
        },
        onParticipantJoined: (participant) => {
            console.log("Participant joined:", participant.displayName);
        },
        onParticipantLeft: (participant) => {
            console.log("Participant left:", participant.displayName);
        }
    });

    // Clear all intervals
    const clearIntervals = useCallback(() => {
        if (tokenRefreshInterval.current) {
            clearInterval(tokenRefreshInterval.current);
            tokenRefreshInterval.current = null;
        }
        if (connectionCheckInterval.current) {
            clearInterval(connectionCheckInterval.current);
            connectionCheckInterval.current = null;
        }
    }, []);

    // Start token refresh timer (refresh every 3 hours)
    const startTokenRefreshTimer = useCallback(() => {
        tokenRefreshInterval.current = setInterval(() => {
            console.log("Refreshing token proactively...");
            handleTokenRefresh();
        }, 3 * 60 * 60 * 1000); // 3 hours
    }, []);

    // Monitor connection status
    const startConnectionMonitoring = useCallback(() => {
        connectionCheckInterval.current = setInterval(() => {
            // Check if we still have participants (including ourselves)
            if (participants.size === 0) {
                console.warn("No participants detected, checking connection...");
                setConnectionStatus('checking');
            } else {
                setConnectionStatus('connected');
            }
        }, 30000); // Check every 30 seconds
    }, [participants]);

    // Handle token refresh
    const handleTokenRefresh = useCallback(async () => {
        try {
            setTokenExpiryWarning(true);
            
            const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/refresh-token/${meetingId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (sessionStorage.getItem('token') || '')
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log("Token refreshed successfully");
                    setTokenExpiryWarning(false);
                    
                    // Notify parent component about token refresh
                    if (onTokenRefresh) {
                        onTokenRefresh(data.token);
                    }
                } else {
                    console.error("Failed to refresh token:", data.msg);
                }
            } else {
                console.error("Token refresh request failed");
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
        }
    }, [meetingId, onTokenRefresh]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearIntervals();
        };
    }, [clearIntervals]);

    const joinMeeting = () => {
        setJoined('JOINING');
        setConnectionStatus('connecting');
        join();
    };

    const handleScreenShare = async () => {
        try {
            setScreenShareError(null);
            
            if (!isScreenSharing) {
                // Check if browser supports screen sharing
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    throw new Error('Screen sharing is not supported in this browser');
                }
                
                console.log("Starting screen share...");
                await toggleScreenShare();
            } else {
                console.log("Stopping screen share...");
                await toggleScreenShare();
            }
        } catch (error) {
            console.error("Screen share error:", error);
            setScreenShareError(error.message || 'Failed to toggle screen share');
            setIsScreenSharing(false);
        }
    };

    // Sync local screen share state with VideoSDK state
    useEffect(() => {
        setIsScreenSharing(localScreenShareOn);
    }, [localScreenShareOn]);

    if (!joined || joined === 'JOINING') {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3 className="mb-4">Ready to join the meeting?</h3>
                
                {/* Connection status indicator */}
                {connectionStatus === 'connecting' && (
                    <div className="alert alert-info mb-3">
                        <div className="d-flex align-items-center">
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                            Connecting to meeting...
                        </div>
                    </div>
                )}
                
                <button 
                    className="btn btn-primary btn-lg"
                    onClick={joinMeeting}
                    disabled={joined === 'JOINING'}
                >
                    {joined === 'JOINING' ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Joining...
                        </>
                    ) : (
                        'Join Meeting'
                    )}
                </button>
            </div>
        );
    }

    // Check if anyone is screen sharing
    const screenSharingParticipants = [...participants.values()].filter(p => p.screenShareOn);
    const hasScreenShare = screenSharingParticipants.length > 0;

    return (
        <div className="container-fluid p-3">
            {/* Status Indicators */}
            {(tokenExpiryWarning || connectionStatus !== 'connected') && (
                <div className="row mb-2">
                    <div className="col-12">
                        {tokenExpiryWarning && (
                            <div className="alert alert-warning alert-dismissible fade show" role="alert">
                                <small>🔄 Refreshing connection token...</small>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setTokenExpiryWarning(false)}
                                ></button>
                            </div>
                        )}
                        
                        {connectionStatus === 'error' && (
                            <div className="alert alert-danger" role="alert">
                                <small>⚠️ Connection issue detected. Attempting to reconnect...</small>
                            </div>
                        )}
                        
                        {connectionStatus === 'checking' && (
                            <div className="alert alert-info" role="alert">
                                <small>🔍 Checking connection status...</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Meeting Controls */}
            <div className="row mb-3">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                        <div className="d-flex align-items-center">
                            <h4 className="mb-0 me-3">Meeting ID: {meetingId}</h4>
                            
                            {/* Connection status indicator */}
                            <span className={`badge ${
                                connectionStatus === 'connected' ? 'bg-success' : 
                                connectionStatus === 'connecting' ? 'bg-warning' : 'bg-danger'
                            }`}>
                                {connectionStatus === 'connected' ? '🟢 Connected' : 
                                 connectionStatus === 'connecting' ? '🟡 Connecting' : '🔴 Connection Issue'}
                            </span>
                        </div>
                        
                        <div className="d-flex flex-wrap gap-2 mt-2 mt-md-0">
                            <button
                                className={`btn ${localMicOn ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => toggleMic()}
                                title="Toggle Microphone"
                            >
                                {localMicOn ? '🎤 Mic On' : '🎤 Mic Off'}
                            </button>
                            <button
                                className={`btn ${localWebcamOn ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => toggleWebcam()}
                                title="Toggle Camera"
                            >
                                {localWebcamOn ? '📹 Cam On' : '📹 Cam Off'}
                            </button>
                            <button
                                className={`btn ${isScreenSharing ? 'btn-warning' : 'btn-info'}`}
                                onClick={handleScreenShare}
                                title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
                                disabled={screenShareError !== null}
                            >
                                {isScreenSharing ? (
                                    <>🛑 Stop Sharing</>
                                ) : (
                                    <>🖥️ Share Screen</>
                                )}
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={handleTokenRefresh}
                                title="Refresh Connection"
                            >
                                🔄 Refresh
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => leave()}
                                title="Leave Meeting"
                            >
                                📞 Leave
                            </button>
                        </div>
                    </div>
                    
                    {/* Screen share error display */}
                    {screenShareError && (
                        <div className="alert alert-warning mt-2 mb-0" role="alert">
                            <small>Screen Share Error: {screenShareError}</small>
                            <button 
                                className="btn btn-sm btn-outline-warning ms-2"
                                onClick={() => setScreenShareError(null)}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Meeting Statistics */}
            <div className="row mb-3">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center small text-muted">
                        <span>Participants: {participants.size}</span>
                        <span>Screen Sharing: {hasScreenShare ? 'Active' : 'Inactive'}</span>
                        <span>Duration: <MeetingTimer /></span>
                    </div>
                </div>
            </div>

            {/* Screen Share Layout */}
            {hasScreenShare ? (
                <div className="row">
                    {/* Screen sharing participant(s) - full width */}
                    <div className="col-12 mb-3">
                        <div className="row">
                            {screenSharingParticipants.map((participant) => (
                                <div key={participant.id} className="col-12 mb-3">
                                    <ParticipantView participantId={participant.id} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Other participants - smaller grid */}
                    {[...participants.keys()]
                        .filter(id => !screenSharingParticipants.find(p => p.id === id))
                        .length > 0 && (
                        <div className="col-12">
                            <h6 className="mb-3">Other Participants:</h6>
                            <div className="row">
                                {[...participants.keys()]
                                    .filter(id => !screenSharingParticipants.find(p => p.id === id))
                                    .map((participantId) => (
                                    <div key={participantId} className="col-md-4 col-lg-3 mb-3">
                                        <ParticipantView participantId={participantId} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Regular Grid Layout - No Screen Sharing */
                <div className="row">
                    {[...participants.keys()].map((participantId) => (
                        <div key={participantId} className="col-md-6 col-lg-4 mb-3">
                            <ParticipantView participantId={participantId} />
                        </div>
                    ))}
                </div>
            )}

            {/* No participants message */}
            {participants.size === 0 && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Waiting for other participants to join...</p>
                    <small className="text-muted">
                        If this persists, try refreshing your connection using the 🔄 Refresh button above.
                    </small>
                </div>
            )}

            {/* Meeting Tips */}
            {!hasScreenShare && participants.size > 0 && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card bg-light">
                            <div className="card-body">
                                <h6 className="card-title">💡 Meeting Tips:</h6>
                                <div className="row">
                                    <div className="col-md-6">
                                        <ul className="mb-0 small text-muted">
                                            <li>Click "🖥️ Share Screen" to share your screen</li>
                                            <li>Use "🔄 Refresh" if you experience connection issues</li>
                                            <li>Your camera will appear in a corner when screen sharing</li>
                                        </ul>
                                    </div>
                                    <div className="col-md-6">
                                        <ul className="mb-0 small text-muted">
                                            <li>Meeting tokens auto-refresh every 3 hours</li>
                                            <li>Connection status is shown in the top-right</li>
                                            <li>All participants can see screen sharing</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Meeting Timer Component
function MeetingTimer() {
    const [duration, setDuration] = useState(0);
    
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setDuration(elapsed);
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);
    
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return <span>{formatTime(duration)}</span>;
}

const VideoMeeting = ({ meetingId, token, userName, isModerator }) => {
    const [meetingEnded, setMeetingEnded] = useState(false);
    const [currentToken, setCurrentToken] = useState(token);
    const [meetingConfig, setMeetingConfig] = useState(null);

    useEffect(() => {
        // Initialize meeting configuration
        setMeetingConfig({
            meetingId,
            micEnabled: true,
            webcamEnabled: true,
            name: userName || "Participant",
            mode: Constants.modes.CONFERENCE,
            multiStream: true,
        });
    }, [meetingId, userName]);

    const onMeetingLeave = () => {
        setMeetingEnded(true);
    };

    const handleTokenRefresh = (newToken) => {
        console.log("Updating meeting token");
        setCurrentToken(newToken);
    };

    if (meetingEnded) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <div className="text-center">
                    <h3 className="mb-3">Meeting Ended</h3>
                    <p className="text-muted mb-4">Thank you for participating in the session!</p>
                    
                    <div className="d-flex gap-2 justify-content-center">
                        <button 
                            className="btn btn-primary"
                            onClick={() => window.location.href = '/customer-dashboard'}
                        >
                            Customer Dashboard
                        </button>
                        <button 
                            className="btn btn-secondary"
                            onClick={() => window.location.href = '/mentor-dashboard'}
                        >
                            Mentor Dashboard
                        </button>
                    </div>
                    
                    <div className="mt-3">
                        <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => window.location.reload()}
                        >
                            Rejoin Meeting
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!meetingId || !currentToken || !meetingConfig) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h3>Setting up meeting...</h3>
                    <p className="text-muted">Please wait while we prepare your video session.</p>
                    
                    {(!meetingId || !currentToken) && (
                        <div className="alert alert-warning mt-3">
                            <small>Missing meeting configuration. Please try refreshing the page.</small>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="video-meeting-container">
            <MeetingProvider
                config={meetingConfig}
                token={currentToken}
                reinitialiseMeetingOnConfigChange={true}
                joinWithoutUserInteraction={false}
            >
                <MeetingConsumer>
                    {() => (
                        <MeetingView 
                            onMeetingLeave={onMeetingLeave} 
                            meetingId={meetingId}
                            onTokenRefresh={handleTokenRefresh}
                        />
                    )}
                </MeetingConsumer>
            </MeetingProvider>
        </div>
    );
};

export default VideoMeeting;