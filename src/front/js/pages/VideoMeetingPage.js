import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Context } from '../store/appContext';
import VideoMeeting from '../component/VideoMeeting';

export const VideoMeetingPage = () => {
    const { meetingId } = useParams();
    const { store, actions } = useContext(Context);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initializeMeeting = async () => {
            try {
                const result = await actions.getMeetingToken(meetingId);
                if (result.success) {
                    setToken(result.token);
                } else {
                    setError('Failed to get meeting access. Please try again.');
                }
            } catch (err) {
                setError('An error occurred while joining the meeting.');
                console.error('Meeting initialization error:', err);
            } finally {
                setLoading(false);
            }
        };

        if (meetingId) {
            initializeMeeting();
        }
    }, [meetingId]);

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Initializing meeting...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4 className="alert-heading">Meeting Error</h4>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4 className="alert-heading">Access Denied</h4>
                    <p>You don't have permission to join this meeting.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-meeting-page">
            <VideoMeeting meetingId={meetingId} />
        </div>
    );
}; 