import React, { useEffect, useState, useContext } from 'react';
import { Context } from '../store/appContext';
import { MeetingProvider, MeetingConsumer, useMeeting, useParticipant } from "@videosdk.live/react-sdk";

const VideoMeeting = ({ bookingId, meetingId }) => {
    const { actions } = useContext(Context);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initMeeting = async () => {
            // If no meeting ID, create one
            if (!meetingId && bookingId) {
                const createResult = await actions.createMeetingForBooking(bookingId);
                if (createResult.success) {
                    meetingId = createResult.meeting_id;
                }
            }

            // Get token for joining
            if (meetingId) {
                const tokenResult = await actions.getMeetingToken(meetingId);
                if (tokenResult.success) {
                    setToken(tokenResult.token);
                }
            }
            setLoading(false);
        };

        initMeeting();
    }, [bookingId, meetingId]);

    if (loading) return <div>Loading meeting...</div>;
    if (!token) return <div>Error loading meeting</div>;

    return (
        <MeetingProvider
            config={{
                meetingId: meetingId,
                micEnabled: true,
                webcamEnabled: true,
                name: "Participant Name", // Get from user context
                token: token,
            }}
        >
            <MeetingView />
        </MeetingProvider>
    );
};

const MeetingView = () => {
    const { join, leave, toggleMic, toggleWebcam, meetingId } = useMeeting();

    useEffect(() => {
        join();
        return () => leave();
    }, []);

    return (
        <div className="meeting-container">
            <div className="video-grid">
                <MeetingConsumer>
                    {({ participants }) =>
                        Array.from(participants.values()).map(participant => (
                            <ParticipantView key={participant.id} participant={participant} />
                        ))
                    }
                </MeetingConsumer>
            </div>
            <div className="controls">
                <button onClick={toggleMic}>Toggle Mic</button>
                <button onClick={toggleWebcam}>Toggle Camera</button>
                <button onClick={leave} className="btn-danger">Leave Meeting</button>
            </div>
        </div>
    );
};

const ParticipantView = ({ participant }) => {
    const { webcamStream, micStream, webcamOn, micOn } = useParticipant(participant.id);

    return (
        <div className="participant">
            {webcamOn && webcamStream && (
                <video
                    ref={(ref) => {
                        if (ref && webcamStream) {
                            ref.srcObject = webcamStream;
                        }
                    }}
                    autoPlay
                    playsInline
                />
            )}
            <p>{participant.displayName}</p>
        </div>
    );
};

export default VideoMeeting; 