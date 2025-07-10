import React, { useState, useEffect } from 'react';
import { backendURL } from "./backendURL";

const RecordingsManager = ({ user }) => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is premium
    const isPremium = user?.subscription_status === 'premium';

    // Fetch recordings
    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendURL}/api/my-recordings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setRecordings(data.recordings || []);
            } else {
                const errorData = await response.json();
                setError(errorData.msg || 'Failed to fetch recordings');
            }
        } catch (error) {
            console.error('Error fetching recordings:', error);
            setError('Error fetching recordings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isPremium) {
            fetchRecordings();
        } else {
            setLoading(false);
        }
    }, [isPremium]);

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Play recording
    const playRecording = (recordingUrl) => {
        if (recordingUrl) {
            window.open(recordingUrl, '_blank');
        }
    };

    // Premium gate for non-premium users
    if (!isPremium) {
        return (
            <div className="recordings-manager">
                <div className="card">
                    <div className="card-body text-center">
                        <h4 className="card-title">📹 Meeting Recordings</h4>
                        <p className="text-muted">
                            Recording and playback features are available for Premium members only.
                        </p>
                        <div className="mt-3">
                            <p className="small text-muted">
                                Upgrade to Premium to:
                            </p>
                            <ul className="list-unstyled small">
                                <li>✅ Record your meetings</li>
                                <li>✅ Save recordings to cloud storage</li>
                                <li>✅ Access recording history</li>
                                <li>✅ Share recordings with participants</li>
                            </ul>
                        </div>
                        <button
                            className="btn btn-warning"
                            onClick={() => window.location.href = '/dashboard'}
                        >
                            Upgrade to Premium
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="recordings-manager">
                <div className="card">
                    <div className="card-body text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading your recordings...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="recordings-manager">
                <div className="card">
                    <div className="card-body text-center">
                        <div className="alert alert-danger">
                            <strong>Error:</strong> {error}
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={fetchRecordings}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main recordings display
    return (
        <div className="recordings-manager">
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h4 className="mb-0">
                        <i className="fas fa-video me-2"></i>
                        Your Recordings
                    </h4>
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={fetchRecordings}
                        title="Refresh recordings"
                    >
                        <i className="fas fa-refresh"></i> Refresh
                    </button>
                </div>

                <div className="card-body">
                    {recordings.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="mb-3">
                                <i className="fas fa-video fa-3x text-muted"></i>
                            </div>
                            <h5 className="text-muted">No recordings yet</h5>
                            <p className="text-muted">
                                Your recorded meetings will appear here. Start a meeting and begin recording to see your first recording!
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.href = '/dashboard'}
                            >
                                Start New Meeting
                            </button>
                        </div>
                    ) : (
                        <div className="recordings-grid">
                            {recordings.map((recording, index) => (
                                <div key={recording.session_id} className="recording-item mb-3">
                                    <div className="card">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <h6 className="card-title mb-1">
                                                        Meeting Session #{recording.session_id}
                                                    </h6>
                                                    <p className="text-muted small mb-2">
                                                        <i className="fas fa-calendar me-1"></i>
                                                        {formatDate(recording.created_at)}
                                                    </p>
                                                    <p className="text-muted small mb-2">
                                                        <i className="fas fa-clock me-1"></i>
                                                        Duration: {recording.max_duration_minutes === 360 ? 'Premium (6h)' : 'Free (50min)'}
                                                    </p>
                                                    <div className="mb-2">
                                                        <span className={`badge ${recording.recording_status === 'completed' ? 'bg-success' :
                                                                recording.recording_status === 'failed' ? 'bg-danger' :
                                                                    'bg-warning'
                                                            }`}>
                                                            {recording.recording_status === 'completed' ? 'Ready' :
                                                                recording.recording_status === 'failed' ? 'Failed' :
                                                                    'Processing'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    {recording.recording_url && recording.recording_status === 'completed' && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => playRecording(recording.recording_url)}
                                                            title="Play recording"
                                                        >
                                                            <i className="fas fa-play"></i> Play
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(recording.recording_url || 'Processing...');
                                                            alert('Recording URL copied to clipboard!');
                                                        }}
                                                        title="Copy recording URL"
                                                        disabled={!recording.recording_url}
                                                    >
                                                        <i className="fas fa-copy"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card-footer text-muted">
                    <small>
                        <i className="fas fa-info-circle me-1"></i>
                        Total recordings: {recordings.length}
                        {recordings.length > 0 && (
                            <span className="ms-3">
                                <i className="fas fa-cloud me-1"></i>
                                Stored securely in the cloud
                            </span>
                        )}
                    </small>
                </div>
            </div>
        </div>
    );
};

export default RecordingsManager; 