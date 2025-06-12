import React, { useEffect, useState } from 'react';
import { MeetingProvider, useMeeting, useParticipant, Constants, MeetingConsumer } from '@videosdk.live/react-sdk';

function ParticipantView({ participantId }) {
    const { webcamStream, micStream, webcamOn, micOn, isLocal, displayName } = useParticipant(participantId);
    const videoRef = React.useRef(null);

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
    const { join, leave, toggleMic, toggleWebcam, participants, meetingId } = useMeeting({
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
    });

    const joinMeeting = () => {
        setJoined('JOINING');
        join();
    };

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

    return (
        <div className="container-fluid p-3">
            <div className="row mb-3">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h4>Meeting ID: {meetingId}</h4>
                        <div>
                            <button
                                className="btn btn-secondary me-2"
                                onClick={() => toggleMic()}
                            >
                                Toggle Mic
                            </button>
                            <button
                                className="btn btn-secondary me-2"
                                onClick={() => toggleWebcam()}
                            >
                                Toggle Camera
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => leave()}
                            >
                                Leave Meeting
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {[...participants.keys()].map((participantId) => (
                    <div key={participantId} className="col-md-6 col-lg-4 mb-3">
                        <ParticipantView participantId={participantId} />
                    </div>
                ))}
            </div>

            {participants.size === 0 && (
                <div className="text-center py-5">
                    <p className="text-muted">Waiting for other participants to join...</p>
                </div>
            )}
        </div>
    );
}

const VideoMeeting = ({ meetingId, token }) => {
    const [meetingEnded, setMeetingEnded] = useState(false);

    const onMeetingLeave = () => {
        setMeetingEnded(true);
    };

    if (meetingEnded) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3>Meeting has ended</h3>
                <p>Thank you for participating!</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => window.location.href = '/customer-dashboard'}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (!meetingId || !token) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
                <h3>Invalid meeting configuration</h3>
                <p>Meeting ID or token is missing</p>
            </div>
        );
    }

    return (
        <MeetingProvider
            config={{
                meetingId,
                micEnabled: true,
                webcamEnabled: true,
                name: "Participant",
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