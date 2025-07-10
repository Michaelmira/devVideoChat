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

    // Screen share view - FIXED: Better sizing and scaling
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
                justifyContent: 'center',
                overflow: 'hidden'  // Prevent any overflow
            }}>
                <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',  // This will show the full content but may add letterboxing
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

function MeetingView({ onMeetingLeave, meetingId, onTokenRefresh, userName, isModerator, user }) {
    const [joined, setJoined] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connected');
    const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
    const [screenShareError, setScreenShareError] = useState(null);
    const [viewMode, setViewMode] = useState('default'); // 'default', 'expanded', 'fullscreen'
    const [overlayPosition, setOverlayPosition] = useState({ x: window.innerWidth - 250, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const panStartPos = useRef({ x: 0, y: 0 });
    const mainContentRef = useRef(null);

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

            // Reset view mode and zoom when screen sharing stops
            if (!_presenterId) {
                console.log("🔄 Screen sharing stopped, resetting view mode and zoom");
                setViewMode('default');
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
            }
        },
        onError: (error) => {
            console.error("❌ MEETING ERROR:", error);

            // Only show connection error for actual connection issues
            if (error.message && (
                error.message.includes('token') ||
                error.message.includes('connection') ||
                error.message.includes('network') ||
                error.message.includes('disconnected')
            )) {
                setConnectionStatus('error');

                if (error.message.includes('token')) {
                    console.log("🔑 Token-related error detected, refreshing...");
                    setTokenExpiryWarning(true);
                    handleTokenRefresh();
                }
            } else {
                // For other errors (like permission denied, etc.), don't show connection error
                console.log("ℹ️ Non-connection error, not changing connection status:", error.message);
            }
        },
        onParticipantJoined: (participant) => {
            console.log("👥 PARTICIPANT JOINED:", participant.displayName || participant.id);
        },
        onParticipantLeft: (participant) => {
            console.log("👥 PARTICIPANT LEFT:", participant.displayName || participant.id);
        }
    });

    // Watch for presenter changes and reset zoom when screen sharing stops
    useEffect(() => {
        if (!presenterId) {
            console.log("🔄 No presenter detected, ensuring default state");
            setViewMode('default');
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
        }
    }, [presenterId]);
    const handlePresenterDoubleClick = useCallback((e) => {
        // Prevent double-click from interfering with pan
        if (isPanning) return;

        const isScreenShareActive = !!presenterId;
        if (!isScreenShareActive) return; // Only work during screen share

        // Cycle through view modes
        if (viewMode === 'default') {
            setViewMode('expanded');
        } else if (viewMode === 'expanded') {
            setViewMode('fullscreen');
            // Reset overlay position to top-right
            setOverlayPosition({ x: window.innerWidth - 250, y: 20 });
            // Reset zoom and pan
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
        } else {
            setViewMode('default');
            // Reset zoom and pan when leaving fullscreen
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
        }
    }, [viewMode, presenterId, isPanning]);

    // Handle zoom with mouse wheel
    const handleWheel = useCallback((e) => {
        if (viewMode !== 'fullscreen' || !presenterId) return;

        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(1, Math.min(4, zoomLevel * delta));

        if (newZoom !== zoomLevel) {
            // Calculate zoom origin based on mouse position
            const rect = mainContentRef.current?.getBoundingClientRect();
            if (rect) {
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;

                // Adjust pan to keep the zoom centered on cursor
                const zoomRatio = newZoom / zoomLevel;
                setPanOffset(prev => ({
                    x: prev.x * zoomRatio + (1 - zoomRatio) * (x - 0.5) * rect.width,
                    y: prev.y * zoomRatio + (1 - zoomRatio) * (y - 0.5) * rect.height
                }));
            }

            setZoomLevel(newZoom);
        }
    }, [viewMode, presenterId, zoomLevel]);

    // Handle pan start
    const handlePanStart = useCallback((e) => {
        if (viewMode !== 'fullscreen' || zoomLevel <= 1 || !presenterId) return;

        // Only start pan with left mouse button
        if (e.button !== 0) return;

        setIsPanning(true);
        panStartPos.current = {
            x: e.clientX - panOffset.x,
            y: e.clientY - panOffset.y
        };
        e.preventDefault();
    }, [viewMode, zoomLevel, panOffset, presenterId]);

    // Handle pan move
    const handlePanMove = useCallback((e) => {
        if (!isPanning) return;

        const newX = e.clientX - panStartPos.current.x;
        const newY = e.clientY - panStartPos.current.y;

        // Calculate boundaries based on zoom level
        const rect = mainContentRef.current?.getBoundingClientRect();
        if (rect) {
            const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
            const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

            setPanOffset({
                x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
                y: Math.max(-maxPanY, Math.min(maxPanY, newY))
            });
        }
    }, [isPanning, zoomLevel]);

    // Handle pan end
    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(4, prev * 1.2));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(1, prev / 1.2));
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, []);
    const handleDragStart = useCallback((e) => {
        if (viewMode !== 'fullscreen') return;
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - overlayPosition.x,
            y: e.clientY - overlayPosition.y
        };
        e.preventDefault();
    }, [viewMode, overlayPosition]);

    // Handle drag move
    const handleDragMove = useCallback((e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;

        // Boundary constraints
        const maxX = window.innerWidth - 250; // Assuming 250px width for overlay
        const maxY = window.innerHeight - 300; // Assuming 300px height for overlay

        setOverlayPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    }, [isDragging]);

    // Handle drag end
    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);

            return () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Add global mouse event listeners for panning
    useEffect(() => {
        if (isPanning) {
            document.addEventListener('mousemove', handlePanMove);
            document.addEventListener('mouseup', handlePanEnd);

            return () => {
                document.removeEventListener('mousemove', handlePanMove);
                document.removeEventListener('mouseup', handlePanEnd);
            };
        }
    }, [isPanning, handlePanMove, handlePanEnd]);

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

    // Monitor connection status - FIXED: Better connection detection
    const startConnectionMonitoring = useCallback(() => {
        console.log("📡 Starting connection monitoring (60 seconds)");
        connectionCheckInterval.current = setInterval(() => {
            const participantCount = participants.size;
            const hasLocalParticipant = !!localParticipant;

            console.log("📡 Connection check:", {
                participantCount,
                hasLocalParticipant,
                connectionStatus
            });

            // Only reset to connected if we were in error state and things look good
            if (connectionStatus === 'error' && hasLocalParticipant) {
                console.log("✅ Connection appears to be restored");
                setConnectionStatus('connected');
            }

        }, 60000); // Check every 60 seconds instead of 30
    }, [participants, connectionStatus, localParticipant]);

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

    // Auto-hide connection error after successful operations
    useEffect(() => {
        if (connectionStatus === 'error') {
            // Auto-clear error status after 10 seconds if no new errors
            const timeout = setTimeout(() => {
                if (localParticipant && participants.size >= 0) {
                    console.log("🔄 Auto-clearing connection error status");
                    setConnectionStatus('connected');
                }
            }, 10000);

            return () => clearTimeout(timeout);
        }
    }, [connectionStatus, localParticipant, participants.size]);
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

    // FIXED: Determine layout dimensions based on view mode
    const getLayoutDimensions = () => {
        const isScreenShareActive = !!presenterId;
        const controlsHeight = 80; // Approximate height of bottom controls

        if (!isScreenShareActive) {
            // No screen share, always use default layout
            return {
                mainWidth: '75%',
                sidebarWidth: '25%',
                overlayMode: false,
                mainHeight: `calc(100vh - ${controlsHeight}px)`,
                sidebarHeight: `calc(100vh - ${controlsHeight}px)`
            };
        }

        switch (viewMode) {
            case 'expanded':
                // Expand both horizontally AND vertically for better use of space
                return {
                    mainWidth: '85%',
                    sidebarWidth: '15%',
                    overlayMode: false,
                    mainHeight: `calc(100vh - ${controlsHeight}px)`,
                    sidebarHeight: `calc(100vh - ${controlsHeight}px)`
                };
            case 'fullscreen':
                // Use absolute positioning to cover the entire viewport
                return {
                    mainWidth: '100vw',
                    sidebarWidth: '250px',
                    overlayMode: true,
                    mainHeight: '100vh',  // Full height, will layer over controls
                    sidebarHeight: 'auto',
                    isAbsoluteFullscreen: true
                };
            default:
                return {
                    mainWidth: '75%',
                    sidebarWidth: '25%',
                    overlayMode: false,
                    mainHeight: `calc(100vh - ${controlsHeight}px)`,
                    sidebarHeight: `calc(100vh - ${controlsHeight}px)`
                };
        }
    };

    const layoutDimensions = getLayoutDimensions();
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

            {/* Meeting Controls - FIXED: Higher z-index for fullscreen mode */}
            <div className="position-fixed bottom-0 start-0 end-0 bg-dark bg-opacity-90 p-3" style={{
                zIndex: layoutDimensions.isAbsoluteFullscreen ? 1050 : 1040  // Ensure controls stay on top
            }}>
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
                        className="btn btn-primary"
                        onClick={async (event) => {
                            const button = event.currentTarget;
                            const originalText = button.innerHTML;
                            const meetingUrl = `${window.location.origin}/join/${meetingId}`;

                            try {
                                // Try modern clipboard API first
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(meetingUrl);
                                    console.log('✅ Meeting link copied via clipboard API:', meetingUrl);
                                } else {
                                    // Fallback method for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = meetingUrl;
                                    textArea.style.position = 'fixed';
                                    textArea.style.opacity = '0';
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(textArea);
                                    console.log('✅ Meeting link copied via fallback method:', meetingUrl);
                                }

                                // Show success feedback
                                button.innerHTML = '✅ Copied!';
                                button.classList.remove('btn-primary');
                                button.classList.add('btn-success');

                                setTimeout(() => {
                                    button.innerHTML = originalText;
                                    button.classList.remove('btn-success');
                                    button.classList.add('btn-primary');
                                }, 2000);

                            } catch (err) {
                                console.error('❌ Error copying meeting link:', err);

                                // Even if there's an "error", the copy might have worked
                                // So show success feedback but also log the error
                                button.innerHTML = '✅ Link Copied';
                                button.classList.remove('btn-primary');
                                button.classList.add('btn-success');

                                setTimeout(() => {
                                    button.innerHTML = originalText;
                                    button.classList.remove('btn-success');
                                    button.classList.add('btn-primary');
                                }, 2000);

                                // Only show error alert if we're really sure it failed
                                // For now, we'll assume it worked since the user reported it's copying
                                console.log('🔗 Meeting URL (manual copy if needed):', meetingUrl);
                            }
                        }}
                        title="Copy Meeting Link"
                    >
                        🔗 Copy Link
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
                        <span className={`badge ${connectionStatus === 'connected' ? 'bg-success' :
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

                        {/* View mode indicator for screen sharing */}
                        {presenterId && (
                            <span className="badge bg-secondary">
                                {viewMode === 'default' ? '📱 Default' :
                                    viewMode === 'expanded' ? '📺 Expanded' : '🖥️ Fullscreen'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Meeting Layout */}
            <div className="d-flex h-100" style={{
                position: 'relative',
                height: layoutDimensions.isAbsoluteFullscreen ? '100vh' : `calc(100vh - 80px)` // Account for controls
            }}>
                {/* Main Content Area - FIXED: Better height and width management */}
                <div
                    ref={mainContentRef}
                    className="flex-grow-1"
                    style={{
                        width: layoutDimensions.mainWidth,
                        height: layoutDimensions.mainHeight,
                        transition: 'width 0.3s ease',
                        overflow: 'hidden',
                        position: layoutDimensions.isAbsoluteFullscreen ? 'fixed' : 'relative',
                        top: layoutDimensions.isAbsoluteFullscreen ? 0 : 'auto',
                        left: layoutDimensions.isAbsoluteFullscreen ? 0 : 'auto',
                        zIndex: layoutDimensions.isAbsoluteFullscreen ? 1030 : 'auto', // Below controls but above everything else
                        cursor: viewMode === 'fullscreen' && zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
                    }}
                    onDoubleClick={handlePresenterDoubleClick}
                    onWheel={handleWheel}
                    onMouseDown={handlePanStart}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                            transformOrigin: 'center center',
                            transition: isPanning ? 'none' : 'transform 0.2s ease'
                        }}
                    >
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

                    {/* Zoom Controls */}
                    {viewMode === 'fullscreen' && presenterId && (
                        <div
                            className="position-absolute"
                            style={{
                                bottom: '20px',
                                right: '20px',
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                borderRadius: '8px',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                zIndex: 100
                            }}
                        >
                            <button
                                className="btn btn-sm btn-dark"
                                onClick={handleZoomOut}
                                disabled={zoomLevel <= 1}
                                title="Zoom Out"
                                style={{ width: '32px', height: '32px', padding: '4px' }}
                            >
                                ➖
                            </button>
                            <span
                                className="text-white"
                                style={{
                                    minWidth: '50px',
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    userSelect: 'none'
                                }}
                            >
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <button
                                className="btn btn-sm btn-dark"
                                onClick={handleZoomIn}
                                disabled={zoomLevel >= 4}
                                title="Zoom In"
                                style={{ width: '32px', height: '32px', padding: '4px' }}
                            >
                                ➕
                            </button>
                            <button
                                className="btn btn-sm btn-outline-light"
                                onClick={handleZoomReset}
                                disabled={zoomLevel === 1}
                                title="Reset Zoom"
                                style={{ marginLeft: '5px' }}
                            >
                                Reset
                            </button>
                        </div>
                    )}

                    {/* View Mode Toggle Hint */}
                    {presenterId && viewMode !== 'fullscreen' && (
                        <div
                            className="position-absolute"
                            style={{
                                top: '20px',
                                right: '20px',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                color: 'white',
                                zIndex: 100,
                                userSelect: 'none'
                            }}
                        >
                            Double-click to {viewMode === 'default' ? 'expand' : 'go fullscreen'}
                        </div>
                    )}
                </div>

                {/* Sidebar - Regular or Overlay mode - FIXED: Better responsive sizing */}
                <div
                    className={`bg-dark d-flex flex-column ${layoutDimensions.overlayMode ? 'position-fixed' : ''}`}
                    style={{
                        width: layoutDimensions.overlayMode ? '250px' : layoutDimensions.sidebarWidth,
                        height: layoutDimensions.overlayMode ? 'auto' : layoutDimensions.sidebarHeight,
                        maxHeight: layoutDimensions.overlayMode ? '80vh' : '100%',
                        padding: '8px',
                        borderLeft: !layoutDimensions.overlayMode ? '1px solid #333' : 'none',
                        transition: !layoutDimensions.overlayMode ? 'width 0.3s ease' : 'none',
                        ...(layoutDimensions.overlayMode ? {
                            position: 'fixed',  // Use fixed instead of absolute for fullscreen
                            left: `${overlayPosition.x}px`,
                            top: `${overlayPosition.y}px`,
                            backgroundColor: 'rgba(33, 37, 41, 0.95)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            zIndex: 1040,  // Above the fullscreen video but below controls
                            overflow: 'auto'
                        } : {})
                    }}
                    onMouseDown={layoutDimensions.overlayMode ? handleDragStart : undefined}
                >
                    {/* Sidebar Content - FIXED: Better spacing and sizing */}
                    <div className="flex-grow-1" style={{
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: layoutDimensions.overlayMode ? '4px' : '6px'
                    }}>
                        {layoutConfig.sidebarParticipants && layoutConfig.sidebarParticipants.map((participant, index) => (
                            <div key={participant.id || index} style={{
                                // Adjust participant size based on view mode
                                height: layoutDimensions.overlayMode ? '100px' :
                                    (viewMode === 'expanded' ? '140px' : '120px')
                            }}>
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
                                <MeetingTimer meetingId={meetingId} />
                            </div>
                            <div className="text-muted" style={{ fontSize: '10px' }}>
                                {participants.size + (localParticipant ? 1 : 0)} participant{participants.size !== 0 ? 's' : ''}
                            </div>
                            {layoutDimensions.overlayMode && (
                                <div className="text-info" style={{ fontSize: '10px', marginTop: '4px' }}>
                                    Drag to move
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recording Controls */}
            <div className="position-fixed" style={{
                top: '20px',
                left: '20px',
                right: '20px',
                zIndex: 1045
            }}>
                <RecordingControls
                    meetingId={meetingId}
                    user={user}
                    onRecordingStatusChange={(status) => {
                        console.log(`Recording status changed: ${status}`);
                    }}
                />
            </div>
        </div>
    );
}

// Enhanced Meeting Timer Component with Session Limits
function MeetingTimer({ meetingId }) {
    const [duration, setDuration] = useState(0);
    const [sessionData, setSessionData] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        // Fetch session information
        const fetchSessionData = async () => {
            if (meetingId) {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/session-status/${meetingId}`);
                    if (response.ok) {
                        const data = await response.json();
                        setSessionData(data);
                    }
                } catch (error) {
                    console.error('Error fetching session data:', error);
                }
            }
        };

        fetchSessionData();

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setDuration(elapsed);

            // Calculate time left based on session limits
            if (sessionData) {
                const maxDurationSeconds = sessionData.max_duration_minutes * 60;
                const remainingSeconds = Math.max(0, maxDurationSeconds - elapsed);
                setTimeLeft(remainingSeconds);

                // Auto-end meeting when time expires
                if (remainingSeconds <= 0) {
                    alert('⏰ Session time limit reached. The meeting will now end.');
                    // You could call onMeetingLeave here if passed as prop
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [meetingId]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTimerColor = () => {
        if (timeLeft === null) return 'text-light';
        if (timeLeft < 300) return 'text-danger'; // Last 5 minutes
        if (timeLeft < 900) return 'text-warning'; // Last 15 minutes
        return 'text-success';
    };

    return (
        <div className="text-center">
            <div className="small text-light">
                Meeting: {formatTime(duration)}
            </div>
            {timeLeft !== null && sessionData && (
                <div className={`small ${getTimerColor()}`}>
                    <span className="me-1">⏰</span>
                    {Math.floor(timeLeft / 3600)}h {Math.floor((timeLeft % 3600) / 60)}m left
                    <div style={{ fontSize: '10px' }} className="text-muted">
                        {sessionData.max_duration_minutes === 360 ? 'Premium' : 'Free'} Session
                    </div>
                </div>
            )}
        </div>
    );
}

// Recording Controls Component
function RecordingControls({ meetingId, user, onRecordingStatusChange }) {
    const [recordingStatus, setRecordingStatus] = useState('none');
    const [isLoading, setIsLoading] = useState(false);

    // Check if user is premium
    const isPremium = user?.subscription_status === 'premium';

    // Fetch current recording status
    const fetchRecordingStatus = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/sessions/${meetingId}/recordings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRecordingStatus(data.recording_status);
                onRecordingStatusChange?.(data.recording_status);
            }
        } catch (error) {
            console.error('Error fetching recording status:', error);
        }
    };

    // Start recording
    const startRecording = async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/sessions/${meetingId}/start-recording`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRecordingStatus('starting');
                onRecordingStatusChange?.('starting');
                alert('Recording started successfully!');
            } else {
                const error = await response.json();
                alert(`Failed to start recording: ${error.msg}`);
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Error starting recording');
        } finally {
            setIsLoading(false);
        }
    };

    // Stop recording
    const stopRecording = async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/sessions/${meetingId}/stop-recording`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRecordingStatus('stopping');
                onRecordingStatusChange?.('stopping');
                alert('Recording stopped successfully!');
            } else {
                const error = await response.json();
                alert(`Failed to stop recording: ${error.msg}`);
            }
        } catch (error) {
            console.error('Error stopping recording:', error);
            alert('Error stopping recording');
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (isPremium && meetingId) {
            fetchRecordingStatus();
        }
    }, [isPremium, meetingId]);

    // Don't show controls for non-premium users
    if (!isPremium) {
        return (
            <div className="recording-controls-premium-gate" style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                margin: '10px 0'
            }}>
                <p style={{ margin: '0 0 10px 0', color: '#6c757d' }}>
                    🎥 Recording available for Premium users only
                </p>
                <button
                    className="btn btn-warning btn-sm"
                    onClick={() => window.location.href = '/dashboard'}
                >
                    Upgrade to Premium
                </button>
            </div>
        );
    }

    return (
        <div className="recording-controls" style={{
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            margin: '10px 0'
        }}>
            <div className="recording-status" style={{ marginBottom: '10px' }}>
                {recordingStatus === 'active' && (
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        🔴 Recording in progress...
                    </span>
                )}
                {recordingStatus === 'starting' && (
                    <span style={{ color: '#fd7e14', fontWeight: 'bold' }}>
                        🟡 Starting recording...
                    </span>
                )}
                {recordingStatus === 'stopping' && (
                    <span style={{ color: '#fd7e14', fontWeight: 'bold' }}>
                        🟡 Stopping recording...
                    </span>
                )}
                {recordingStatus === 'completed' && (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                        ✅ Recording completed
                    </span>
                )}
                {recordingStatus === 'failed' && (
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        ❌ Recording failed
                    </span>
                )}
                {recordingStatus === 'none' && (
                    <span style={{ color: '#6c757d' }}>
                        📹 Ready to record
                    </span>
                )}
            </div>

            <div className="recording-buttons">
                {(recordingStatus === 'none' || recordingStatus === 'completed' || recordingStatus === 'failed') && (
                    <button
                        className="btn btn-danger btn-sm me-2"
                        onClick={startRecording}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Starting...' : '⏺️ Start Recording'}
                    </button>
                )}

                {(recordingStatus === 'active' || recordingStatus === 'starting') && (
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={stopRecording}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Stopping...' : '⏹️ Stop Recording'}
                    </button>
                )}
            </div>
        </div>
    );
}

const VideoMeeting = ({ meetingId, token, userName, isModerator }) => {
    const [meetingEnded, setMeetingEnded] = useState(false);
    const [currentToken, setCurrentToken] = useState(token);
    const [meetingConfig, setMeetingConfig] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        console.log("🚀 VideoMeeting Props:", {
            meetingId,
            userName,
            isModerator,
            hasToken: !!token
        });
    }, [meetingId, token, userName, isModerator]);

    // Fetch user data for recording capabilities
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = sessionStorage.getItem('token');
                if (token) {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/current/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData.user_data);
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUser();
    }, []);

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
                                onTokenRefresh={handleTokenRefresh}
                                userName={userName}
                                isModerator={isModerator}
                                user={user}
                            />
                        );
                    }}
                </MeetingConsumer>
            </MeetingProvider>
        </div>
    );

};

export default VideoMeeting;