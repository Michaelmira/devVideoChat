import React, { useState, useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const RecordingsManager = ({ user }) => {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [showPlayer, setShowPlayer] = useState(false);
    const videoRef = useRef(null);
    const playerRef = useRef(null);

    // Early return if user doesn't have recording access
    if (user?.subscription_status !== 'recordings') {
        return (
            <div className="recordings-manager">
                <div className="card">
                    <div className="card-body text-center">
                        <h4 className="card-title">📹 Meeting Recordings</h4>
                        <p className="text-muted">
                            Recording features are not available on your current plan.
                        </p>
                        <div className="mt-3">
                            <p className="small text-muted">
                                Upgrade to access recording features:
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
                            Upgrade Plan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Fetch recordings
    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/my-recordings`, {
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
        // Only fetch recordings if user has recording access
        if (user?.subscription_status === 'recordings') {
            fetchRecordings();
        } else {
            setLoading(false);
        }
    }, [user?.subscription_status]);

    // Initialize video player
    useEffect(() => {
        if (showPlayer && selectedRecording && videoRef.current && !playerRef.current) {
            const player = videojs(videoRef.current, {
                controls: true,
                responsive: true,
                fluid: true,
                sources: [{
                    src: selectedRecording.recording_url,
                    type: 'application/x-mpegURL'
                }],
                html5: {
                    hls: {
                        enableLowInitialPlaylist: true,
                        smoothQualityChange: true,
                        overrideNative: true
                    }
                }
            });

            playerRef.current = player;
        }
    }, [showPlayer, selectedRecording]);

    // Cleanup video player
    useEffect(() => {
        return () => {
            if (playerRef.current && !playerRef.current.isDisposed()) {
                playerRef.current.dispose();
                playerRef.current = null;
            }
        };
    }, []);

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

    // Play recording in modal
    const playRecording = (recording) => {
        setSelectedRecording(recording);
        setShowPlayer(true);
    };

    // Close player modal
    const closePlayer = () => {
        if (playerRef.current && !playerRef.current.isDisposed()) {
            playerRef.current.dispose();
            playerRef.current = null;
        }
        setShowPlayer(false);
        setSelectedRecording(null);
    };

    // Copy URL to clipboard
    const copyRecordingUrl = (recordingUrl) => {
        if (recordingUrl) {
            navigator.clipboard.writeText(recordingUrl);
            alert('Recording URL copied to clipboard!');
        }
    };

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
                                                        Duration: {recording.max_duration_minutes === 360 ? 'Premium (6h)' : 'Free (70min)'}
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
                                                            onClick={() => playRecording(recording)}
                                                            title="Play recording"
                                                        >
                                                            <i className="fas fa-play"></i> Play
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => copyRecordingUrl(recording.recording_url)}
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

            {/* Video Player Modal */}
            {showPlayer && selectedRecording && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-play-circle me-2"></i>
                                    Recording: Session #{selectedRecording.session_id}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closePlayer}
                                ></button>
                            </div>
                            <div className="modal-body p-0">
                                <div data-vjs-player>
                                    <video
                                        ref={videoRef}
                                        className="video-js vjs-default-skin"
                                        controls
                                        preload="auto"
                                        width="100%"
                                        height="400"
                                        data-setup="{}"
                                    >
                                        <p className="vjs-no-js">
                                            To view this video please enable JavaScript, and consider upgrading to a web browser that
                                            <a href="https://videojs.com/html5-video-support/" target="_blank" rel="noopener noreferrer">
                                                supports HTML5 video
                                            </a>.
                                        </p>
                                    </video>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <div className="d-flex justify-content-between w-100">
                                    <div className="text-muted small">
                                        <i className="fas fa-calendar me-1"></i>
                                        {formatDate(selectedRecording.created_at)}
                                    </div>
                                    <div>
                                        <button
                                            className="btn btn-outline-secondary btn-sm me-2"
                                            onClick={() => copyRecordingUrl(selectedRecording.recording_url)}
                                            title="Copy URL"
                                        >
                                            <i className="fas fa-copy"></i> Copy URL
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={closePlayer}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecordingsManager;