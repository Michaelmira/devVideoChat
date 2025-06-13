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
            hasWebcamStream: !!webcamStream,
            hasScreenShareStream: !!screenShareStream
        });
    }, [participantId, displayName, viewMode, isLocal, webcamOn, micOn, screenShareOn, webcamStream, screenShareStream]);

    // Handle webcam stream
    useEffect(() => {
        console.log(`🎥 ParticipantView [${participantId}] Webcam Stream Update:`, {
            hasWebcamStream: !!webcamStream,
            hasVideoRef: !!videoRef.current,
            screenShareOn
        });

        if (webcamStream && videoRef.current) {
            console.log(`🎥 ParticipantView [${participantId}] Setting up webcam stream`);
            const mediaStream = new MediaStream();
            mediaStream.addTrack(webcamStream.track);
            videoRef.current.srcObject = mediaStream;
            
            videoRef.current.play().then(() => {
                console.log(`✅ ParticipantView [${participantId}] Webcam video playing successfully`);
            }).catch(error => {
                console.error(`❌ ParticipantView [${participantId}] Error playing webcam video:`, error);
            });
        } else if (videoRef.current) {
            console.log(`🎥 ParticipantView [${participantId}] Clearing webcam stream`);
            videoRef.current.srcObject = null;
        }
    }, [webcamStream, participantId, screenShareOn]);

    // Handle screen share stream
    useEffect(() => {
        console.log(`🖥️ ParticipantView [${participantId}] Screen Share Stream Update:`, {
            hasScreenShareStream: !!screenShareStream,
            hasScreenShareRef: !!screenShareRef.current,
            screenShareOn
        });

        if (screenShareStream && screenShareRef.current) {
            console.log(`🖥️ ParticipantView [${participantId}] Setting up screen share stream`);
            const mediaStream = new MediaStream();
            mediaStream.addTrack(screenShareStream.track);
            screenShareRef.current.srcObject = mediaStream;
            
            screenShareRef.current.play().then(() => {
                console.log(`✅ ParticipantView [${participantId}] Screen share video playing successfully`);
            }).catch(error => {
                console.error(`❌ ParticipantView [${participantId}] Error playing screen share video:`, error);
            });
        } else if (screenShareRef.current) {
            console.log(`🖥️ ParticipantView [${participantId}] Clearing screen share stream`);
            screenShareRef.current.srcObject = null;
        }
    }, [screenShareStream, participantId]);

    // Screen share view for the pinned area
    if (viewMode === 'screenShare' && screenShareOn && screenShareStream) {
        console.log(`🖥️ ParticipantView [${participantId}] Rendering in SCREEN SHARE mode`);
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

    // Regular participant view (webcam only)
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
    const [screenShareInProgress, setScreenShareInProgress] = useState(false);
    const [localParticipantIdState, setLocalParticipantIdState] = useState(null);
    
    // Refs for intervals
    const tokenRefreshInterval = useRef(null);
    const connectionCheckInterval = useRef(null);
    const screenShareTimeoutRef = useRef(null);
    
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
            console.log("🎉 MEETING JOINED successfully");
            console.log("📊 Meeting State:", {
                localParticipantId,
                userName,
                isModerator
            });
            setJoined('JOINED');
            setConnectionStatus('connected');
            
            // FIXED: Store local participant ID in state when meeting is joined
            if (localParticipantId) {
                setLocalParticipantIdState(localParticipantId);
                console.log("✅ Local participant ID set:", localParticipantId);
            }
            
            startTokenRefreshTimer();
            startConnectionMonitoring();
        },
        onMeetingLeft: () => {
            console.log("👋 MEETING LEFT");
            clearIntervals();
            onMeetingLeave();
        },
        onError: (error) => {
            console.error("❌ MEETING ERROR:", error);
            console.error("❌ Error details:", {
                message: error.message,
                code: error.code,
                type: error.type,
                stack: error.stack
            });
            
            setConnectionStatus('error');
            
            // Clear screen share progress on error
            setScreenShareInProgress(false);
            clearScreenShareTimeout();
            
            if (error.message && error.message.includes('token')) {
                console.log("🔑 Token-related error detected, refreshing...");
                setTokenExpiryWarning(true);
                handleTokenRefresh();
            } else {
                console.error("❌ Non-token error:", error.message);
                // Don't show alert for screen share errors, just log them
                if (!error.message?.toLowerCase().includes('screen')) {
                    alert(`Meeting Error: ${error.message || 'Unknown error occurred'}`);
                }
            }
        },
        onScreenShareStarted: () => {
            console.log("🖥️ LOCAL SCREEN SHARE STARTED!");
            console.log("📊 Screen Share State:", {
                localParticipantId: localParticipantIdState || localParticipantId,
                localScreenShareOn: true,
                currentTime: new Date().toISOString()
            });
            setIsScreenSharing(true);
            setScreenShareError(null);
            setScreenShareInProgress(false);
            clearScreenShareTimeout();
            
            // FIXED: Use either state or direct value for local participant ID
            const currentLocalId = localParticipantIdState || localParticipantId;
            if (currentLocalId) {
                setCurrentScreenSharer(currentLocalId);
                console.log("✅ Set current screen sharer to local participant:", currentLocalId);
            }
        },
        onScreenShareStopped: () => {
            console.log("🖥️ LOCAL SCREEN SHARE STOPPED!");
            console.log("📊 Screen Share State:", {
                localParticipantId: localParticipantIdState || localParticipantId,
                localScreenShareOn: false,
                currentTime: new Date().toISOString()
            });
            setIsScreenSharing(false);
            setScreenShareInProgress(false);
            clearScreenShareTimeout();
            
            // FIXED: Clear screen sharer if it was the local participant
            const currentLocalId = localParticipantIdState || localParticipantId;
            if (currentScreenSharer === currentLocalId) {
                setCurrentScreenSharer(null);
                console.log("✅ Cleared local participant as screen sharer");
            }
        },
        onParticipantJoined: (participant) => {
            console.log("👥 PARTICIPANT JOINED:", participant.displayName || participant.id);
            console.log("📊 Participant details:", {
                id: participant.id,
                displayName: participant.displayName,
                isLocal: participant.isLocal
            });
        },
        onParticipantLeft: (participant) => {
            console.log("👥 PARTICIPANT LEFT:", participant.displayName || participant.id);
            // If the screen sharer left, clear the current screen sharer
            if (currentScreenSharer === participant.id) {
                console.log("🖥️ Screen sharer left, clearing current screen sharer");
                setCurrentScreenSharer(null);
            }
        }
    });

    // FIXED: Update local participant ID state when it becomes available
    useEffect(() => {
        if (localParticipantId && !localParticipantIdState) {
            console.log("📊 Setting local participant ID from useMeeting hook:", localParticipantId);
            setLocalParticipantIdState(localParticipantId);
        }
    }, [localParticipantId, localParticipantIdState]);

    // Use the state version if available, fallback to hook version
    const effectiveLocalParticipantId = localParticipantIdState || localParticipantId;

    // DEBUG: Log all state changes
    useEffect(() => {
        console.log("📊 MEETING STATE UPDATE:", {
            joined,
            isScreenSharing,
            screenShareInProgress,
            connectionStatus,
            currentScreenSharer,
            localParticipantId,
            localParticipantIdState,
            effectiveLocalParticipantId,
            localScreenShareOn,
            participantCount: participants.size,
            participantIds: [...participants.keys()]
        });
    }, [joined, isScreenSharing, screenShareInProgress, connectionStatus, currentScreenSharer, localParticipantId, localParticipantIdState, effectiveLocalParticipantId, localScreenShareOn, participants]);

    // FIXED: Monitor for screen sharing changes from all participants
    useEffect(() => {
        console.log("🔍 CHECKING SCREEN SHARE STATE:");
        console.log("📊 Local screen share:", {
            localScreenShareOn,
            effectiveLocalParticipantId
        });
        console.log("📊 Remote participants:", [...participants.entries()].map(([id, p]) => ({
            id,
            displayName: p.displayName,
            screenShareOn: p.screenShareOn
        })));

        let newScreenSharer = null;
        
        // Check local screen sharing first - FIXED: Use effective local participant ID
        if (localScreenShareOn && effectiveLocalParticipantId) {
            console.log("🖥️ Local participant is sharing screen");
            newScreenSharer = effectiveLocalParticipantId;
        } else {
            // Check remote participants
            for (const [participantId, participant] of participants.entries()) {
                console.log(`🔍 Checking participant ${participantId}:`, {
                    displayName: participant.displayName,
                    screenShareOn: participant.screenShareOn
                });
                if (participant.screenShareOn) {
                    console.log(`🖥️ Remote participant ${participantId} is sharing screen`);
                    newScreenSharer = participantId;
                    break; // Only one can share at a time
                }
            }
        }
        
        if (newScreenSharer !== currentScreenSharer) {
            console.log("🔄 SCREEN SHARER CHANGED:", {
                from: currentScreenSharer,
                to: newScreenSharer,
                timestamp: new Date().toISOString()
            });
            setCurrentScreenSharer(newScreenSharer);
        } else {
            console.log("📊 Screen sharer unchanged:", currentScreenSharer);
        }
    }, [participants, localScreenShareOn, effectiveLocalParticipantId, currentScreenSharer]);

    // Clear screen share timeout
    const clearScreenShareTimeout = useCallback(() => {
        if (screenShareTimeoutRef.current) {
            console.log("⏰ Clearing screen share timeout");
            clearTimeout(screenShareTimeoutRef.current);
            screenShareTimeoutRef.current = null;
        }
    }, []);

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
        clearScreenShareTimeout();
    }, [clearScreenShareTimeout]);

    // Start token refresh timer (refresh every 3 hours)
    const startTokenRefreshTimer = useCallback(() => {
        console.log("⏰ Starting token refresh timer (3 hours)");
        tokenRefreshInterval.current = setInterval(() => {
            console.log("🔑 Proactive token refresh triggered");
            handleTokenRefresh();
        }, 3 * 60 * 60 * 1000); // 3 hours
    }, []);

    // FIXED: Monitor connection status properly
    const startConnectionMonitoring = useCallback(() => {
        console.log("📡 Starting connection monitoring (30 seconds)");
        connectionCheckInterval.current = setInterval(() => {
            // FIXED: Don't include localParticipantId in participant count
            const remoteParticipantCount = participants.size;
            console.log("📡 Connection check:", {
                remoteParticipantCount,
                connectionStatus,
                hasLocalParticipant: !!effectiveLocalParticipantId
            });
            
            // Only show warning if no remote participants AND we've been joined for a while
            if (remoteParticipantCount === 0 && joined === 'JOINED') {
                console.log("⚠️ No remote participants detected");
                // Don't set to 'checking' unless there's a real connection issue
            } else {
                setConnectionStatus('connected');
            }
        }, 30000); // Check every 30 seconds
    }, [participants, connectionStatus, joined, effectiveLocalParticipantId]);

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

            console.log("🔑 Token refresh response:", {
                status: response.status,
                ok: response.ok
            });

            if (response.ok) {
                const data = await response.json();
                console.log("🔑 Token refresh data:", data);
                if (data.success) {
                    console.log("✅ Token refreshed successfully");
                    setTokenExpiryWarning(false);
                    
                    if (onTokenRefresh) {
                        onTokenRefresh(data.token);
                    }
                } else {
                    console.error("❌ Token refresh failed:", data.msg);
                }
            } else {
                console.error("❌ Token refresh request failed with status:", response.status);
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

    // FIXED: Improved screen share handler with better error handling
    const handleScreenShare = async () => {
        console.log("🖥️ SCREEN SHARE BUTTON CLICKED");
        console.log("📊 Current state:", {
            isScreenSharing,
            screenShareInProgress,
            localScreenShareOn,
            currentScreenSharer,
            effectiveLocalParticipantId
        });

        try {
            setScreenShareError(null);
            
            if (!isScreenSharing && !screenShareInProgress) {
                console.log("🖥️ Starting screen share process...");
                
                // Check if browser supports screen sharing
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    throw new Error('Screen sharing is not supported in this browser');
                }
                
                console.log("✅ Browser supports screen sharing");
                console.log("🖥️ Setting screen share in progress...");
                setScreenShareInProgress(true);
                
                // FIXED: Reduced timeout to 8 seconds and better error handling
                console.log("⏰ Setting 8-second timeout for screen share");
                screenShareTimeoutRef.current = setTimeout(() => {
                    console.log("⏰ SCREEN SHARE TIMEOUT TRIGGERED");
                    console.log("📊 Timeout state:", {
                        isScreenSharing,
                        screenShareInProgress,
                        localScreenShareOn,
                        currentScreenSharer
                    });
                    setScreenShareInProgress(false);
                    setScreenShareError("Screen share request timed out. Please try again or check if you cancelled the screen share dialog.");
                }, 8000); // 8 second timeout
                
                console.log("🔄 Calling toggleScreenShare()...");
                
                // Start screen sharing
                await toggleScreenShare();
                
                console.log("✅ toggleScreenShare() completed successfully");
                
            } else if (isScreenSharing) {
                console.log("🖥️ Stopping screen share...");
                setScreenShareInProgress(true);
                
                // Set timeout for stopping as well
                screenShareTimeoutRef.current = setTimeout(() => {
                    console.log("⏰ Screen share stop timeout");
                    setScreenShareInProgress(false);
                }, 5000);
                
                console.log("🔄 Calling toggleScreenShare() to stop...");
                await toggleScreenShare();
                console.log("✅ Screen share stop completed");
            } else {
                console.log("⚠️ Screen share already in progress, ignoring click");
            }
        } catch (error) {
            console.error("❌ SCREEN SHARE ERROR:", error);
            console.error("❌ Error details:", {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            // FIXED: Better error messages for common issues
            let errorMessage = error.message || 'Failed to toggle screen share';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Screen sharing was denied. Please allow screen sharing and try again.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Screen sharing is not supported in this browser.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Screen sharing was cancelled by the user.';
            }
            
            setScreenShareError(errorMessage);
            setScreenShareInProgress(false);
            clearScreenShareTimeout();
        }
    };

    // Sync local screen share state with VideoSDK state
    useEffect(() => {
        console.log("🔄 Syncing screen share state:", {
            localScreenShareOn,
            currentIsScreenSharing: isScreenSharing
        });
        setIsScreenSharing(localScreenShareOn);
    }, [localScreenShareOn, isScreenSharing]);

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

    // FIXED: Determine layout based on screen sharing and user role
    const getLayoutConfig = () => {
        const participantList = [...participants.values()];
        const isScreenShareActive = currentScreenSharer !== null;
        
        console.log("🎨 LAYOUT CALCULATION:");
        console.log("📊 Layout state:", {
            isScreenShareActive,
            currentScreenSharer,
            effectiveLocalParticipantId,
            participantCount: participantList.length,
            participantIds: participantList.map(p => p.id)
        });
        
        if (isScreenShareActive) {
            console.log("🎨 Using SCREEN SHARE layout");
            // Screen sharing layout
            const screenSharerParticipant = participantList.find(p => p.id === currentScreenSharer) || 
                                          (currentScreenSharer === effectiveLocalParticipantId ? { id: effectiveLocalParticipantId, displayName: userName } : null);
            
            console.log("📊 Screen sharer participant:", screenSharerParticipant);
            
            const otherParticipants = participantList.filter(p => p.id !== currentScreenSharer);
            // Add local participant to sidebar if they're not the screen sharer
            if (currentScreenSharer !== effectiveLocalParticipantId && effectiveLocalParticipantId) {
                // Add local participant info
                otherParticipants.unshift({ 
                    id: effectiveLocalParticipantId, 
                    displayName: userName + " (You)"
                });
            } else if (effectiveLocalParticipantId) {
                // If local is sharing, add them to sidebar as well for self-view
                otherParticipants.unshift({ 
                    id: effectiveLocalParticipantId, 
                    displayName: userName + " (You)"
                });
            }
            
            console.log("📊 Sidebar participants:", otherParticipants.map(p => ({ id: p.id, name: p.displayName })));
            
            return {
                type: 'screenShare',
                pinnedParticipant: screenSharerParticipant,
                sidebarParticipants: otherParticipants
            };
        } else {
            console.log("🎨 Using REGULAR layout");
            // Regular layout - pin the first remote participant and show local in sidebar
            const localParticipant = effectiveLocalParticipantId ? { id: effectiveLocalParticipantId, displayName: userName + " (You)" } : null;
            const remoteParticipants = participantList.filter(p => p.id !== effectiveLocalParticipantId);
            
            console.log("📊 Remote participants:", remoteParticipants.map(p => ({ id: p.id, name: p.displayName })));
            
            // Pin the first remote participant (should be the opposite role)
            const pinnedParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : null;
            
            // FIXED: Always include local participant in sidebar, plus other remotes
            const sidebarParticipants = [];
            if (localParticipant) {
                sidebarParticipants.push(localParticipant);
            }
            // Add remaining remote participants to sidebar
            sidebarParticipants.push(...remoteParticipants.slice(1));
            
            console.log("📊 Pinned participant:", pinnedParticipant ? { id: pinnedParticipant.id, name: pinnedParticipant.displayName } : null);
            console.log("📊 Sidebar participants:", sidebarParticipants.map(p => ({ id: p.id, name: p.displayName })));
            
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
                        
                        {connectionStatus === 'checking' && (
                            <div className="alert alert-info mb-1" role="alert">
                                <small>🔍 Checking connection status...</small>
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
                        onClick={() => {
                            console.log("🎤 Mic button clicked, current state:", localMicOn);
                            toggleMic();
                        }}
                        title="Toggle Microphone"
                    >
                        {localMicOn ? '🎤 On' : '🎤 Off'}
                    </button>
                    <button
                        className={`btn ${localWebcamOn ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => {
                            console.log("📹 Webcam button clicked, current state:", localWebcamOn);
                            toggleWebcam();
                        }}
                        title="Toggle Camera"
                    >
                        {localWebcamOn ? '📹 On' : '📹 Off'}
                    </button>
                    <button
                        className={`btn ${isScreenSharing ? 'btn-warning' : 'btn-info'} ${screenShareInProgress ? 'disabled' : ''}`}
                        onClick={handleScreenShare}
                        disabled={screenShareInProgress}
                        title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
                    >
                        {screenShareInProgress ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Processing...
                            </>
                        ) : isScreenSharing ? (
                            '🛑 Stop Share'
                        ) : (
                            '🖥️ Share Screen'
                        )}
                    </button>
                    <button
                        className="btn btn-outline-light"
                        onClick={() => {
                            console.log("🔄 Refresh button clicked");
                            handleTokenRefresh();
                        }}
                        title="Refresh Connection"
                    >
                        🔄 Refresh
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={() => {
                            console.log("📞 Leave button clicked");
                            leave();
                        }}
                        title="Leave Meeting"
                    >
                        📞 Leave
                    </button>
                    
                    {/* Connection and info status */}
                    <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${
                            connectionStatus === 'connected' ? 'bg-success' : 
                            connectionStatus === 'connecting' ? 'bg-warning' : 'bg-danger'
                        }`}>
                            {connectionStatus === 'connected' ? '🟢' : 
                             connectionStatus === 'connecting' ? '🟡' : '🔴'}
                        </span>
                        
                        {currentScreenSharer && (
                            <span className="badge bg-info">
                                🖥️ Screen Active
                            </span>
                        )}
                        
                        <span className="badge bg-secondary">
                            {effectiveLocalParticipantId ? `ID: ${effectiveLocalParticipantId.slice(-4)}` : 'No ID'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Meeting Layout */}
            <div className="d-flex h-100">
                {/* Main Content Area - 80% */}
                <div className="flex-grow-1" style={{ width: '80%', height: '100%' }}>
                    {layoutConfig.pinnedParticipant ? (
                        layoutConfig.type === 'screenShare' ? (
                            <>
                                {console.log("🎨 Rendering SCREEN SHARE view for participant:", layoutConfig.pinnedParticipant.id)}
                                <ParticipantView 
                                    participantId={layoutConfig.pinnedParticipant.id} 
                                    viewMode="screenShare"
                                    isLocal={layoutConfig.pinnedParticipant.id === effectiveLocalParticipantId}
                                />
                            </>
                        ) : (
                            <>
                                {console.log("🎨 Rendering PINNED view for participant:", layoutConfig.pinnedParticipant.id)}
                                <ParticipantView 
                                    participantId={layoutConfig.pinnedParticipant.id} 
                                    viewMode="pinned"
                                    isLocal={layoutConfig.pinnedParticipant.id === effectiveLocalParticipantId}
                                />
                            </>
                        )
                    ) : (
                        <div className="d-flex align-items-center justify-content-center h-100 bg-dark">
                            <div className="text-center text-light">
                                <div className="spinner-border mb-3" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <p>Waiting for other participants to join...</p>
                                <small className="text-muted">Meeting ID: {meetingId}</small>
                                {effectiveLocalParticipantId && (
                                    <div className="mt-2">
                                        <small className="text-info">Your ID: {effectiveLocalParticipantId}</small>
                                    </div>
                                )}
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
                    {/* Participants in sidebar */}
                    <div className="flex-grow-1">
                        {layoutConfig.sidebarParticipants && layoutConfig.sidebarParticipants.map((participant, index) => {
                            console.log(`🎨 Rendering sidebar participant ${index}:`, {
                                id: participant.id,
                                displayName: participant.displayName,
                                isLocal: participant.id === effectiveLocalParticipantId
                            });
                            return (
                                <div key={participant.id || index} className="mb-1">
                                    <ParticipantView 
                                        participantId={participant.id} 
                                        viewMode="sidebar"
                                        isLocal={participant.id === effectiveLocalParticipantId}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Meeting info at bottom */}
                    <div className="mt-2 pt-2 border-top border-secondary">
                        <div className="text-light small text-center">
                            <div className="mb-1">
                                <MeetingTimer />
                            </div>
                            <div className="text-muted" style={{ fontSize: '10px' }}>
                                {participants.size + (effectiveLocalParticipantId ? 1 : 0)} participant{participants.size !== 0 ? 's' : ''}
                            </div>
                            {currentScreenSharer && (
                                <div className="text-info" style={{ fontSize: '10px' }}>
                                    Screen sharing active ({currentScreenSharer === effectiveLocalParticipantId ? 'You' : 'Remote'})
                                </div>
                            )}
                            
                            {/* Debug info - only show in development */}
                            {process.env.NODE_ENV === 'development' && (
                                <div className="text-warning mt-2" style={{ fontSize: '8px' }}>
                                    DEBUG: {layoutConfig.type} layout
                                    <br />
                                    Sharer: {currentScreenSharer || 'none'}
                                    <br />
                                    Local SS: {localScreenShareOn ? 'ON' : 'OFF'}
                                    <br />
                                    Local ID: {effectiveLocalParticipantId || 'none'}
                                </div>
                            )}
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

    // DEBUG: Log props
    useEffect(() => {
        console.log("🚀 VideoMeeting Props:", {
            meetingId,
            userName,
            isModerator,
            hasToken: !!token
        });
    }, [meetingId, token, userName, isModerator]);

    useEffect(() => {
        console.log("⚙️ Setting up meeting config:", {
            meetingId,
            userName: userName || "Participant",
            mode: Constants.modes.CONFERENCE
        });
        
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
                                onTokenRefresh={handleTokenRefresh}
                                userName={userName}
                                isModerator={isModerator}
                            />
                        );
                    }}
                </MeetingConsumer>
            </MeetingProvider>
        </div>
    );
};

export default VideoMeeting;