import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant, Constants, MeetingConsumer } from '@videosdk.live/react-sdk';

function ParticipantView({ participantId, viewMode = 'normal', isLocal = false }) {
    const { 
        webcamStream, 
        micStream, 
        webcamOn, 
        micOn, 
        displayName,
        screenShareStream,
        screenShareOn
    } = useParticipant(participantId);
    
    const videoRef = React.useRef(null);
    const screenShareRef = React.useRef(null);

    // Handle webcam stream
    useEffect(() => {
        if (webcamStream && videoRef.current) {
            const mediaStream = new MediaStream();
            mediaStream.addTrack(webcamStream.track);
            videoRef.current.srcObject = mediaStream;
            
            videoRef.current.play().catch(error => {
                console.error("Error playing video:", error);
            });
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [webcamStream]);

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

    // If this participant is sharing screen and we're in screen share mode
    if (screenShareOn && screenShareStream && viewMode === 'screenShare') {
        return (
            <div className="screen-share-view" style={{ 
                width: '100%',
                height: '100%',
                position: 'relative',
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
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
                    fontWeight: 'bold',
                    zIndex: 10
                }}>
                    🖥️ {displayName || 'Participant'} is sharing screen
                </div>
            </div>
        );
    }

    // Regular participant view (webcam)
    const getViewStyle = () => {
        switch (viewMode) {
            case 'pinned':
                return {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                };
            case 'sidebar':
                return {
                    width: '100%',
                    height: '150px',
                    position: 'relative',
                    backgroundColor: '#1a1a1a',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                };
            default:
                return {
                    width: '100%',
                    height: '200px',
                    position: 'relative',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                };
        }
    };

    return (
        <div className="participant-view" style={getViewStyle()}>
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
                    width: viewMode === 'sidebar' ? '60px' : '100px',
                    height: viewMode === 'sidebar' ? '60px' : '100px',
                    borderRadius: '50%',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: viewMode === 'sidebar' ? '24px' : '36px',
                    color: '#fff'
                }}>
                    {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
            )}
            
            {/* Participant info overlay */}
            <div style={{
                position: 'absolute',
                bottom: '5px',
                left: '5px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: viewMode === 'sidebar' ? '2px 6px' : '4px 8px',
                borderRadius: '4px',
                fontSize: viewMode === 'sidebar' ? '10px' : '12px',
                maxWidth: 'calc(100% - 10px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {displayName || 'Participant'} {isLocal && '(You)'}
                {!micOn && ' 🔇'}
            </div>
        </div>
    );
}

function MeetingView({ onMeetingLeave, meetingId, onTokenRefresh, userName, isModerator }) {
    const [joined, setJoined] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenShareError, setScreenShareError] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
    const [currentScreenSharer, setCurrentScreenSharer] = useState(null);
    
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
        localWebcamOn,
        localParticipantId
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
            setCurrentScreenSharer(null);
        },
        onParticipantJoined: (participant) => {
            console.log("Participant joined:", participant.displayName);
        },
        onParticipantLeft: (participant) => {
            console.log("Participant left:", participant.displayName);
            // If the screen sharer left, clear the current screen sharer
            if (currentScreenSharer === participant.id) {
                setCurrentScreenSharer(null);
            }
        }
    });

    // Monitor for screen sharing changes
    useEffect(() => {
        const screenSharingParticipants = [...participants.values()].filter(p => p.screenShareOn);
        
        if (screenSharingParticipants.length > 0) {
            const newScreenSharer = screenSharingParticipants[0].id;
            if (currentScreenSharer !== newScreenSharer) {
                setCurrentScreenSharer(newScreenSharer);
            }
        } else {
            setCurrentScreenSharer(null);
        }
    }, [participants, currentScreenSharer]);

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
                
                // If someone else is sharing, stop their share first
                if (currentScreenSharer && currentScreenSharer !== localParticipantId) {
                    console.log("Stopping other participant's screen share...");
                    // VideoSDK will handle stopping the other participant's share when we start ours
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
        if (localScreenShareOn) {
            setCurrentScreenSharer(localParticipantId);
        }
    }, [localScreenShareOn, localParticipantId]);

    if (!joined || joined === 'JOINING') {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3 className="mb-4">Ready to join the meeting?</h3>
                
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

    // Determine layout based on screen sharing and user role
    const getLayoutConfig = () => {
        const participantList = [...participants.values()];
        const isScreenShareActive = currentScreenSharer !== null;
        
        if (isScreenShareActive) {
            // Screen sharing layout
            const screenSharerParticipant = participantList.find(p => p.id === currentScreenSharer);
            const otherParticipants = participantList.filter(p => p.id !== currentScreenSharer);
            
            return {
                type: 'screenShare',
                pinnedParticipant: screenSharerParticipant,
                sidebarParticipants: otherParticipants
            };
        } else {
            // Regular layout - pin the opposite role
            const localParticipant = participantList.find(p => p.id === localParticipantId);
            const remoteParticipants = participantList.filter(p => p.id !== localParticipantId);
            
            // Pin the first remote participant (should be the opposite role)
            const pinnedParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : null;
            const sidebarParticipants = [localParticipant, ...remoteParticipants.slice(1)].filter(Boolean);
            
            return {
                type: 'regular',
                pinnedParticipant,
                sidebarParticipants
            };
        }
    };

    const layoutConfig = getLayoutConfig();

    return (
        <div className="container-fluid p-0" style={{ height: '100vh', overflow: 'hidden' }}>
            {/* Status Indicators */}
            {(tokenExpiryWarning || connectionStatus !== 'connected') && (
                <div className="position-fixed top-0 start-0 end-0 z-3" style={{ zIndex: 1050 }}>
                    <div className="container-fluid p-2">
                        {tokenExpiryWarning && (
                            <div className="alert alert-warning alert-dismissible fade show mb-1" role="alert">
                                <small>🔄 Refreshing connection token...</small>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-sm" 
                                    onClick={() => setTokenExpiryWarning(false)}
                                ></button>
                            </div>
                        )}
                        
                        {connectionStatus === 'error' && (
                            <div className="alert alert-danger mb-1" role="alert">
                                <small>⚠️ Connection issue detected. Attempting to reconnect...</small>
                            </div>
                        )}
                        
                        {connectionStatus === 'checking' && (
                            <div className="alert alert-info mb-1" role="alert">
                                <small>🔍 Checking connection status...</small>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Meeting Controls */}
            <div className="position-fixed bottom-0 start-0 end-0 bg-dark bg-opacity-75 p-2" style={{ zIndex: 1040 }}>
                <div className="d-flex justify-content-center align-items-center flex-wrap gap-2">
                    <button
                        className={`btn btn-sm ${localMicOn ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleMic()}
                        title="Toggle Microphone"
                    >
                        {localMicOn ? '🎤' : '🎤'}
                    </button>
                    <button
                        className={`btn btn-sm ${localWebcamOn ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleWebcam()}
                        title="Toggle Camera"
                    >
                        {localWebcamOn ? '📹' : '📹'}
                    </button>
                    <button
                        className={`btn btn-sm ${isScreenSharing ? 'btn-warning' : 'btn-info'}`}
                        onClick={handleScreenShare}
                        title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
                    >
                        {isScreenSharing ? '🛑' : '🖥️'}
                    </button>
                    <button
                        className="btn btn-sm btn-outline-light"
                        onClick={handleTokenRefresh}
                        title="Refresh Connection"
                    >
                        🔄
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
                        onClick={() => leave()}
                        title="Leave Meeting"
                    >
                        📞
                    </button>
                    
                    {/* Connection status */}
                    <span className={`badge ${
                        connectionStatus === 'connected' ? 'bg-success' : 
                        connectionStatus === 'connecting' ? 'bg-warning' : 'bg-danger'
                    }`}>
                        {connectionStatus === 'connected' ? '🟢' : 
                         connectionStatus === 'connecting' ? '🟡' : '🔴'}
                    </span>
                </div>
                
                {/* Screen share error */}
                {screenShareError && (
                    <div className="text-center mt-1">
                        <small className="text-warning">Screen Share Error: {screenShareError}</small>
                        <button 
                            className="btn btn-sm btn-link text-warning p-0 ms-2"
                            onClick={() => setScreenShareError(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Main Meeting Layout */}
            <div className="d-flex h-100">
                {/* Main Content Area - 80% */}
                <div className="flex-grow-1" style={{ width: '80%', height: '100%' }}>
                    {layoutConfig.pinnedParticipant ? (
                        layoutConfig.type === 'screenShare' ? (
                            <ParticipantView 
                                participantId={layoutConfig.pinnedParticipant.id} 
                                viewMode="screenShare"
                                isLocal={layoutConfig.pinnedParticipant.id === localParticipantId}
                            />
                        ) : (
                            <ParticipantView 
                                participantId={layoutConfig.pinnedParticipant.id} 
                                viewMode="pinned"
                                isLocal={layoutConfig.pinnedParticipant.id === localParticipantId}
                            />
                        )
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 bg-dark">
                            <div className="text-center text-light">
                                <div className="spinner-border mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p>Waiting for other participants to join...</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - 20% */}
                <div 
                    className="bg-dark p-2 d-flex flex-column"
                    style={{ 
                        width: '20%', 
                        height: '100%',
                        margin: 0,
                        padding: '8px',
                        borderLeft: '1px solid #333'
                    }}
                >
                    {layoutConfig.sidebarParticipants.map((participant, index) => (
                        <div key={participant.id} className="mb-2">
                            <ParticipantView 
                                participantId={participant.id} 
                                viewMode="sidebar"
                                isLocal={participant.id === localParticipantId}
                            />
                        </div>
                    ))}
                    
                    {/* Meeting info */}
                    <div className="mt-auto">
                        <div className="text-light small text-center">
                            <div className="mb-1">
                                <MeetingTimer />
                            </div>
                            <div className="text-muted">
                                {participants.size} participant{participants.size !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
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
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '100vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h3>Setting up meeting...</h3>
                    <p className="text-muted">Please wait while we prepare your video session.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-meeting-container" style={{ height: '100vh', overflow: 'hidden' }}>
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
                            userName={userName}
                            isModerator={isModerator}
                        />
                    )}
                </MeetingConsumer>
            </MeetingProvider>
        </div>
    );
};

export default VideoMeeting;