import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MeetingProvider, useMeeting, useParticipant, Constants, MeetingConsumer } from '@videosdk.live/react-sdk';

function ParticipantView({ participantId, viewMode = 'normal', isLocal = false }) {
    const micRef = React.useRef(null);
    const { 
        webcamStream, 
        micStream, 
        webcamOn, 
        micOn, 
        displayName,
        screenShareStream,
        screenShareOn,
        isPresenter
    } = useParticipant(participantId);
    
    const videoRef = React.useRef(null);
    const screenShareRef = React.useRef(null);

    // Check if this participant is screen sharing
    const isScreenSharing = screenShareOn || !!screenShareStream || isPresenter;

    // DEBUG: Log participant state changes
    useEffect(() => {
        console.log(`🎥 ParticipantView [${participantId}] State Update:`, {
            participantId,
            displayName,
            viewMode,
            isLocal,
            webcamOn,
            micOn,
            screenShareOn,
            isPresenter,
            isScreenSharing,
            hasWebcamStream: !!webcamStream,
            hasScreenShareStream: !!screenShareStream
        });
    }, [participantId, displayName, viewMode, isLocal, webcamOn, micOn, screenShareOn, isPresenter, isScreenSharing, webcamStream, screenShareStream]);

    // Handle audio stream for remote participants
    useEffect(() => {
        if (!isLocal && micStream && micRef.current) {
            console.log(`🎤 Setting up audio for remote participant ${participantId}`);
            const mediaStream = new MediaStream();
            mediaStream.addTrack(micStream.track);
            micRef.current.srcObject = mediaStream;
            micRef.current.play().catch(error => {
                console.error(`❌ Error playing audio for ${participantId}:`, error);
            });
        }
    }, [micStream, participantId, isLocal]);

    // Handle webcam stream
    useEffect(() => {
        if (webcamStream && videoRef.current && !isScreenSharing) {
            console.log(`🎥 ParticipantView [${participantId}] Setting up webcam stream`);
            const mediaStream = new MediaStream();
            mediaStream.addTrack(webcamStream.track);
            videoRef.current.srcObject = mediaStream;
            
            videoRef.current.play().catch(error => {
                console.error(`❌ ParticipantView [${participantId}] Error playing webcam video:`, error);
            });
        } else if (videoRef.current && !webcamStream) {
            console.log(`🎥 ParticipantView [${participantId}] Clearing webcam stream`);
            videoRef.current.srcObject = null;
        }
    }, [webcamStream, participantId, isScreenSharing]);

    // Handle screen share stream
    useEffect(() => {
        if (screenShareStream && screenShareRef.current) {
            console.log(`🖥️ ParticipantView [${participantId}] Setting up screen share stream`);
            const mediaStream = new MediaStream();
            mediaStream.addTrack(screenShareStream.track);
            screenShareRef.current.srcObject = mediaStream;
            
            screenShareRef.current.play().catch(error => {
                console.error(`❌ ParticipantView [${participantId}] Error playing screen share video:`, error);
            });
        } else if (screenShareRef.current && !screenShareStream) {
            console.log(`🖥️ ParticipantView [${participantId}] Clearing screen share stream`);
            screenShareRef.current.srcObject = null;
        }
    }, [screenShareStream, participantId]);

    // Screen share view
    if ((viewMode === 'screenShare' || viewMode === 'pinned') && isScreenSharing && screenShareStream) {
        console.log(`🖥️ ParticipantView [${participantId}] Rendering SCREEN SHARE mode`);
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
                
                {/* Audio element for remote participants */}
                {!isLocal && (
                    <audio
                        ref={micRef}
                        autoPlay
                        playsInline
                        style={{ display: 'none' }}
                    />
                )}
            </div>
        );
    }

    // Regular participant view
    const getViewStyle = () => {
        const style = {};
        switch (viewMode) {
            case 'pinned':
                style.width = '100%';
                style.height = '100%';
                style.position = 'relative';
                style.backgroundColor = '#1a1a1a';
                style.display = 'flex';
                style.alignItems = 'center';
                style.justifyContent = 'center';
                break;
            case 'sidebar':
                style.width = '100%';
                style.height = '120px';
                style.position = 'relative';
                style.backgroundColor = '#1a1a1a';
                style.marginBottom = '4px';
                style.display = 'flex';
                style.alignItems = 'center';
                style.justifyContent = 'center';
                style.borderRadius = '4px';
                style.overflow = 'hidden';
                break;
            default:
                style.width = '100%';
                style.height = '200px';
                style.position = 'relative';
                style.backgroundColor = '#1a1a1a';
                style.borderRadius = '8px';
                style.overflow = 'hidden';
                style.display = 'flex';
                style.alignItems = 'center';
                style.justifyContent = 'center';
                break;
        }
        return style;
    };

    console.log(`🎥 ParticipantView [${participantId}] Rendering in ${viewMode.toUpperCase()} mode`);

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
                    width: viewMode === 'sidebar' ? '50px' : '100px',
                    height: viewMode === 'sidebar' ? '50px' : '100px',
                    borderRadius: '50%',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: viewMode === 'sidebar' ? '20px' : '36px',
                    color: '#fff'
                }}>
                    {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
            )}
            
            {/* Participant info overlay */}
            <div style={{
                position: 'absolute',
                bottom: '3px',
                left: '3px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: viewMode === 'sidebar' ? '1px 4px' : '3px 6px',
                borderRadius: '3px',
                fontSize: viewMode === 'sidebar' ? '9px' : '11px',
                maxWidth: 'calc(100% - 6px)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {displayName || 'Participant'} {isLocal && '(You)'}
                {!micOn && ' 🔇'}
            </div>
            
            {/* Audio element for remote participants */}
            {!isLocal && (
                <audio
                    ref={micRef}
                    autoPlay
                    playsInline
                    style={{ display: 'none' }}
                />
            )}
        </div>
    );
}

function MeetingView({ onMeetingLeave, meetingId, onTokenRefresh, userName, isModerator }) {
    const [joined, setJoined] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
    const [screenShareError, setScreenShareError] = useState(null);
    
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
        localParticipant,
        presenterId
    } = useMeeting({
        onMeetingJoined: () => {
            console.log("🎉 MEETING JOINED successfully");
            setJoined('JOINED');
            setConnectionStatus('connected');
            startTokenRefreshTimer();
            startConnectionMonitoring();
        },
        onMeetingLeft: () => {
            console.log("👋 MEETING LEFT");
            clearIntervals();
            onMeetingLeave();
        },
        onPresenterChanged: (_presenterId) => {
            console.log("🖥️ PRESENTER CHANGED:", _presenterId);
        },
        onError: (error) => {
            console.error("❌ MEETING ERROR:", error);
            setConnectionStatus('error');
            
            if (error.message && error.message.includes('token')) {
                console.log("🔑 Token-related error detected, refreshing...");
                setTokenExpiryWarning(true);
                handleTokenRefresh();
            }
        },
        onParticipantJoined: (participant) => {
            console.log("👥 PARTICIPANT JOINED:", participant.displayName || participant.id);
        },
        onParticipantLeft: (participant) => {
            console.log("👥 PARTICIPANT LEFT:", participant.displayName || participant.id);
        }
    });

    // Clear all intervals
    const clearIntervals = useCallback(() => {
        console.log("🧹 Cleaning up intervals");
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
        console.log("⏰ Starting token refresh timer (3 hours)");
        tokenRefreshInterval.current = setInterval(() => {
            console.log("🔑 Proactive token refresh triggered");
            handleTokenRefresh();
        }, 3 * 60 * 60 * 1000); // 3 hours
    }, []);

    // Monitor connection status
    const startConnectionMonitoring = useCallback(() => {
        console.log("📡 Starting connection monitoring (30 seconds)");
        connectionCheckInterval.current = setInterval(() => {
            const participantCount = participants.size;
            console.log("📡 Connection check:", {
                participantCount,
                connectionStatus
            });
        }, 30000); // Check every 30 seconds
    }, [participants, connectionStatus]);

    // Handle token refresh
    const handleTokenRefresh = useCallback(async () => {
        try {
            console.log("🔑 Starting token refresh...");
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
                    console.log("✅ Token refreshed successfully");
                    setTokenExpiryWarning(false);
                    
                    if (onTokenRefresh) {
                        onTokenRefresh(data.token);
                    }
                }
            }
        } catch (error) {
            console.error("❌ Error during token refresh:", error);
        }
    }, [meetingId, onTokenRefresh]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log("🧹 Component unmounting, cleaning up");
            clearIntervals();
        };
    }, [clearIntervals]);

    const joinMeeting = () => {
        console.log("🚀 Attempting to join meeting...");
        setJoined('JOINING');
        setConnectionStatus('connecting');
        join();
    };

    // Handle screen share
    const handleScreenShare = async () => {
        console.log("🖥️ SCREEN SHARE BUTTON CLICKED");
        
        try {
            setScreenShareError(null);
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screen sharing is not supported in this browser');
            }
            
            console.log("🔄 Calling toggleScreenShare()...");
            await toggleScreenShare();
            console.log("✅ toggleScreenShare() completed");
            
        } catch (error) {
            console.error("❌ SCREEN SHARE ERROR:", error);
            setScreenShareError(error.message || 'Failed to toggle screen share');
        }
    };

    // Check if someone else is presenting
    const isSomeoneElsePresenting = presenterId && localParticipant && presenterId !== localParticipant.id;
    const isLocalPresenting = presenterId && localParticipant && presenterId === localParticipant.id;

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

    // Determine layout based on screen sharing
    const getLayoutConfig = () => {
        const participantArray = [...participants.values()];
        const isScreenShareActive = !!presenterId;
        
        console.log("🎨 LAYOUT CALCULATION:", {
            isScreenShareActive,
            presenterId: presenterId,
            participantCount: participantArray.length
        });
        
        if (isScreenShareActive) {
            // Find the presenter
            let presenter = participantArray.find(p => p.id === presenterId);
            
            // If presenter is local participant
            if (!presenter && localParticipant && localParticipant.id === presenterId) {
                presenter = localParticipant;
            }
            
            // Create sidebar list including all participants
            const sidebarParticipants = [...participantArray];
            
            // Add local participant if not in the list
            if (localParticipant && !participantArray.find(p => p.id === localParticipant.id)) {
                sidebarParticipants.unshift({
                    ...localParticipant,
                    displayName: userName + " (You)"
                });
            }
            
            return {
                type: 'screenShare',
                pinnedParticipant: presenter,
                sidebarParticipants: sidebarParticipants
            };
        } else {
            // Regular layout
            const pinnedParticipant = participantArray[0];
            const sidebarParticipants = [];
            
            // Add local participant to sidebar
            if (localParticipant) {
                sidebarParticipants.push({
                    ...localParticipant,
                    displayName: userName + " (You)"
                });
            }
            
            // Add other participants
            sidebarParticipants.push(...participantArray.slice(1));
            
            return {
                type: 'regular',
                pinnedParticipant,
                sidebarParticipants
            };
        }
    };

    const layoutConfig = getLayoutConfig();
    console.log("🎨 Final layout config:", layoutConfig);

    return (
        <div className="container-fluid p-0" style={{ height: '100vh', overflow: 'hidden' }}>
            {/* Status Indicators */}
            {(tokenExpiryWarning || connectionStatus !== 'connected' || screenShareError) && (
                <div className="position-fixed top-0 start-0 end-0" style={{ zIndex: 1050 }}>
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

                        {screenShareError && (
                            <div className="alert alert-warning alert-dismissible fade show mb-1" role="alert">
                                <small>🖥️ {screenShareError}</small>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-sm" 
                                    onClick={() => setScreenShareError(null)}
                                ></button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Meeting Controls */}
            <div className="position-fixed bottom-0 start-0 end-0 bg-dark bg-opacity-90 p-3" style={{ zIndex: 1040 }}>
                <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
                    <button
                        className={`btn ${localMicOn ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleMic()}
                        title="Toggle Microphone"
                    >
                        {localMicOn ? '🎤 On' : '🎤 Off'}
                    </button>
                    <button
                        className={`btn ${localWebcamOn ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggleWebcam()}
                        title="Toggle Camera"
                    >
                        {localWebcamOn ? '📹 On' : '📹 Off'}
                    </button>
                    <button
                        className={`btn ${isLocalPresenting ? 'btn-warning' : isSomeoneElsePresenting ? 'btn-secondary' : 'btn-info'}`}
                        onClick={handleScreenShare}
                        disabled={isSomeoneElsePresenting}
                        title={
                            isLocalPresenting ? 'Stop Screen Sharing' : 
                            isSomeoneElsePresenting ? 'Someone else is presenting' : 
                            'Start Screen Sharing'
                        }
                    >
                        {isLocalPresenting ? (
                            '🛑 Stop Share'
                        ) : isSomeoneElsePresenting ? (
                            '🔒 Presentation in Progress'
                        ) : (
                            '🖥️ Share Screen'
                        )}
                    </button>
                    <button
                        className="btn btn-outline-light"
                        onClick={() => handleTokenRefresh()}
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
                    
                    {/* Connection status */}
                    <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${
                            connectionStatus === 'connected' ? 'bg-success' : 
                            connectionStatus === 'connecting' ? 'bg-warning' : 'bg-danger'
                        }`}>
                            {connectionStatus === 'connected' ? '🟢' : 
                             connectionStatus === 'connecting' ? '🟡' : '🔴'}
                        </span>
                        
                        {presenterId && (
                            <span className="badge bg-info">
                                🖥️ Screen Active
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Meeting Layout */}
            <div className="d-flex h-100">
                {/* Main Content Area - 80% */}
                <div className="flex-grow-1" style={{ width: '80%', height: '100%' }}>
                    {layoutConfig.pinnedParticipant ? (
                        <ParticipantView 
                            participantId={layoutConfig.pinnedParticipant.id} 
                            viewMode={layoutConfig.type === 'screenShare' ? 'screenShare' : 'pinned'}
                            isLocal={localParticipant && layoutConfig.pinnedParticipant.id === localParticipant.id}
                        />
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 bg-dark">
                            <div className="text-center text-light">
                                <div className="spinner-border mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p>Waiting for other participants to join...</p>
                                <small className="text-muted">Meeting ID: {meetingId}</small>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - 20% */}
                <div 
                    className="bg-dark d-flex flex-column"
                    style={{ 
                        width: '20%', 
                        height: '100%',
                        padding: '8px',
                        borderLeft: '1px solid #333'
                    }}
                >
                    <div className="flex-grow-1">
                        {layoutConfig.sidebarParticipants && layoutConfig.sidebarParticipants.map((participant, index) => (
                            <div key={participant.id || index} className="mb-1">
                                <ParticipantView 
                                    participantId={participant.id} 
                                    viewMode="sidebar"
                                    isLocal={localParticipant && participant.id === localParticipant.id}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* Meeting info at bottom */}
                    <div className="mt-2 pt-2 border-top border-secondary">
                        <div className="text-light small text-center">
                            <div className="mb-1">
                                <MeetingTimer />
                            </div>
                            <div className="text-muted" style={{ fontSize: '10px' }}>
                                {participants.size + (localParticipant ? 1 : 0)} participant{participants.size !== 0 ? 's' : ''}
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
        console.log("🚀 VideoMeeting Props:", {
            meetingId,
            userName,
            isModerator,
            hasToken: !!token
        });
    }, [meetingId, token, userName, isModerator]);

    useEffect(() => {
        console.log("⚙️ Setting up meeting config");
        
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
        console.log("👋 VideoMeeting: Meeting ended");
        setMeetingEnded(true);
    };

    const handleTokenRefresh = (newToken) => {
        console.log("🔑 VideoMeeting: Updating meeting token");
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
        console.log("⏳ VideoMeeting: Waiting for config:", {
            hasMeetingId: !!meetingId,
            hasCurrentToken: !!currentToken,
            hasMeetingConfig: !!meetingConfig
        });
        
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

    console.log("🎬 VideoMeeting: Rendering MeetingProvider with:", {
        meetingConfig,
        hasToken: !!currentToken
    });

    return (
        <div className="video-meeting-container" style={{ height: '100vh', overflow: 'hidden' }}>
            <MeetingProvider
                config={meetingConfig}
                token={currentToken}
                reinitialiseMeetingOnConfigChange={true}
                joinWithoutUserInteraction={false}
            >
                <MeetingConsumer>
                    {() => {
                        console.log("🎬 MeetingConsumer: Rendering MeetingView");
                        return (
                            <MeetingView 
                                onMeetingLeave={onMeetingLeave} 
                                meetingId={meetingId}
                                on                    }}
                </MeetingConsumer>
            </MeetingProvider>
        </div>
    );
};

export default VideoMeeting;