import React, { useEffect, useState } from 'react';
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

function MeetingView({ onMeetingLeave }) {
    const [joined, setJoined] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenShareError, setScreenShareError] = useState(null);
    
    const { 
        join, 
        leave, 
        toggleMic, 
        toggleWebcam, 
        toggleScreenShare,
        participants, 
        meetingId,
        localScreenShareOn
    } = useMeeting({
        onMeetingJoined: () => {
            setJoined('JOINED');
        },
        onMeetingLeft: () => {
            onMeetingLeave();
        },
        onError: (error) => {
            console.error("Meeting error:", error);
            alert(`Meeting Error: ${error.message || 'Unknown error occurred'}`);
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
    });

    const joinMeeting = () => {
        setJoined('JOINING');
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
            
            // Reset screen sharing state on error
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
            {/* Meeting Controls */}
            <div className="row mb-3">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                        <h4 className="mb-2 mb-md-0">Meeting ID: {meetingId}</h4>
                        <div className="d-flex flex-wrap gap-2">
                            <button
                                className="btn btn-secondary"
                                onClick={() => toggleMic()}
                                title="Toggle Microphone"
                            >
                                🎤 Toggle Mic
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => toggleWebcam()}
                                title="Toggle Camera"
                            >
                                📹 Toggle Camera
                            </button>
                            <button
                                className={`btn ${isScreenSharing ? 'btn-warning' : 'btn-info'}`}
                                onClick={handleScreenShare}
                                title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
                            >
                                {isScreenSharing ? (
                                    <>🛑 Stop Sharing</>
                                ) : (
                                    <>🖥️ Share Screen</>
                                )}
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
                        </div>
                    )}
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
                    <p className="text-muted">Waiting for other participants to join...</p>
                </div>
            )}

            {/* Screen sharing instructions */}
            {!hasScreenShare && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card bg-light">
                            <div className="card-body">
                                <h6 className="card-title">💡 Screen Sharing Tips:</h6>
                                <ul className="mb-0 small text-muted">
                                    <li>Click "🖥️ Share Screen" to share your screen with other participants</li>
                                    <li>You can share your entire screen, a specific window, or a browser tab</li>
                                    <li>Your camera will appear in a small window when screen sharing</li>
                                    <li>Click "🛑 Stop Sharing" to stop screen sharing</li>
                                    <li>Only one person can share their screen at a time</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const VideoMeeting = ({ meetingId, token, userName }) => {
    const [meetingEnded, setMeetingEnded] = useState(false);

    const onMeetingLeave = () => {
        setMeetingEnded(true);
    };

    if (meetingEnded) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3>Meeting has ended</h3>
                <p>Thank you for participating!</p>
                <div className="d-flex gap-2">
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
            </div>
        );
    }

    if (!meetingId || !token) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3>Invalid meeting configuration</h3>
                <p>Meeting ID or token is missing</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => window.history.back()}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <MeetingProvider
            config={{
                meetingId,
                micEnabled: true,
                webcamEnabled: true,
                name: userName || "Participant",
                mode: Constants.modes.CONFERENCE,
                multiStream: true,
            }}
            token={token}
            reinitialiseMeetingOnConfigChange={true}
            joinWithoutUserInteraction={false}
        >
            <MeetingConsumer>
                {() => (
                    <MeetingView onMeetingLeave={onMeetingLeave} />
                )}
            </MeetingConsumer>
        </MeetingProvider>
    );
};

export default VideoMeeting;