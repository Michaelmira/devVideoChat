import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import { ActiveSessionsList } from "../component/ActiveSessionsList";
import { UpgradeCard } from "../component/UpgradeCard";

export const Dashboard = () => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        // Check if user is logged in
        const token = sessionStorage.getItem('token');
        const userData = sessionStorage.getItem('user_data');

        if (!token) {
            navigate('/');
            return;
        }

        if (userData) {
            setUser(JSON.parse(userData));
        }

        // Load user's sessions
        loadSessions();
    }, [navigate]);

    const loadSessions = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');

            const response = await fetch(`${process.env.BACKEND_URL}/api/my-sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions || []);
            } else {
                const errorData = await response.json();
                console.error('Failed to load sessions:', errorData);
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const createSession = async () => {
        setCreating(true);
        try {
            const token = sessionStorage.getItem('token');

            const response = await fetch(`${process.env.BACKEND_URL}/api/create-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Reload sessions to show the new one
                loadSessions();

                // Show success message
                alert('✅ Video session created successfully! Copy the link to share with others.');
            } else {
                const errorData = await response.json();
                alert(`❌ ${errorData.msg || 'Failed to create session'}`);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            alert('❌ Network error. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const copyLink = (sessionUrl) => {
        navigator.clipboard.writeText(sessionUrl);
        alert('📋 Link copied to clipboard!');
    };

    const isPremium = user?.subscription_status === 'premium';

    if (loading && sessions.length === 0) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="text-center mb-4">
                <h2>Quick Video Chat</h2>
                <p>Create shareable video links instantly</p>
                {user && (
                    <p className="text-muted">
                        Welcome back, {user.first_name}!
                        {isPremium ? (
                            <span className="badge bg-primary ms-2">Premium</span>
                        ) : (
                            <span className="badge bg-success ms-2">Free</span>
                        )}
                    </p>
                )}
            </div>

            {/* Single Action: Create Link */}
            <div className="card mb-4">
                <div className="card-body text-center">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={createSession}
                        disabled={creating}
                    >
                        {creating ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating...
                            </>
                        ) : (
                            <>
                                🎥 Create Video Link
                            </>
                        )}
                    </button>
                    <p className="mt-2 text-muted">
                        {isPremium
                            ? '6-hour sessions • 1 active link limit'
                            : '50-minute sessions • Unlimited links'
                        }
                    </p>
                </div>
            </div>

            {/* Active Sessions with Copy Buttons */}
            <ActiveSessionsList
                sessions={sessions}
                onCopy={copyLink}
                onRefresh={loadSessions}
            />

            {/* Upgrade CTA for Free Users */}
            {!isPremium && <UpgradeCard />}

            {/* Quick Stats */}
            <div className="card mt-4">
                <div className="card-body">
                    <h5 className="card-title">Quick Stats</h5>
                    <div className="row text-center">
                        <div className="col-4">
                            <h3 className="text-primary">{sessions.length}</h3>
                            <small className="text-muted">Active Sessions</small>
                        </div>
                        <div className="col-4">
                            <h3 className="text-success">
                                {isPremium ? '360' : '50'}
                            </h3>
                            <small className="text-muted">Minutes per Session</small>
                        </div>
                        <div className="col-4">
                            <h3 className="text-info">6</h3>
                            <small className="text-muted">Hours Link Duration</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* How to Use Guide */}
            <div className="card mt-4">
                <div className="card-body">
                    <h5 className="card-title">How to Use</h5>
                    <ol className="list-group list-group-numbered">
                        <li className="list-group-item d-flex justify-content-between align-items-start">
                            <div className="ms-2 me-auto">
                                <div className="fw-bold">Create a Link</div>
                                Click "Create Video Link" to generate a new session
                            </div>
                            <span className="badge bg-primary rounded-pill">1</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-start">
                            <div className="ms-2 me-auto">
                                <div className="fw-bold">Copy & Share</div>
                                Copy the link and share it with anyone
                            </div>
                            <span className="badge bg-primary rounded-pill">2</span>
                        </li>
                        <li className="list-group-item d-flex justify-content-between align-items-start">
                            <div className="ms-2 me-auto">
                                <div className="fw-bold">Start Video Chat</div>
                                Anyone with the link can join - no account needed!
                            </div>
                            <span className="badge bg-primary rounded-pill">3</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}; 