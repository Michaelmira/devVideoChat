import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import { ActiveSessionsList } from "../component/ActiveSessionsList";
import { UpgradeSection } from "../component/UpgradeSection";
import { PremiumStatusSection } from "../component/PremiumStatusSection";
import RecordingsManager from "../component/RecordingsManager";
import "../../styles/upgrade-card.css";

export const Dashboard = () => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [creating, setCreating] = useState(false);
    const [upgradeExpanded, setUpgradeExpanded] = useState(false);

    useEffect(() => {
        // Check if user is logged in
        const token = sessionStorage.getItem('token');
        const userData = sessionStorage.getItem('user_data');

        if (!token) {
            navigate('/');
            return;
        }

        // Set user data from sessionStorage first (for faster UI)
        if (userData) {
            setUser(JSON.parse(userData));
        }

        // Fetch fresh user data from backend to ensure subscription status is up-to-date
        const fetchFreshUserData = async () => {
            try {
                const response = await fetch(`${process.env.BACKEND_URL}/api/current/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const freshUser = data.user_data;

                    // Update both sessionStorage and state with fresh data
                    sessionStorage.setItem('user_data', JSON.stringify(freshUser));
                    setUser(freshUser);

                    console.log('✅ Fresh user data loaded:', freshUser);
                } else {
                    console.error('Failed to fetch fresh user data');
                }
            } catch (error) {
                console.error('Error fetching fresh user data:', error);
            }
        };

        fetchFreshUserData();

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

    const handleStartUpgrade = () => {
        setUpgradeExpanded(true);
    };

    const handlePaymentSuccess = async (paymentIntent) => {
        setUpgradeExpanded(false);

        try {
            // Fetch fresh user data from backend to get updated subscription status
            const token = sessionStorage.getItem('token');
            const response = await fetch(`${process.env.BACKEND_URL}/api/current/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const updatedUser = data.user_data;

                // Update both sessionStorage and local state with fresh data
                sessionStorage.setItem('user_data', JSON.stringify(updatedUser));
                setUser(updatedUser);

                console.log('✅ User data refreshed:', updatedUser);

                // Also refresh sessions
                loadSessions();

                alert('🎉 Welcome to Premium! You now have 6-hour sessions!');
            } else {
                console.error('Failed to fetch updated user data');
                // Fallback to local update
                const userData = sessionStorage.getItem('user_data');
                if (userData) {
                    const updatedUser = JSON.parse(userData);
                    updatedUser.subscription_status = 'premium';
                    sessionStorage.setItem('user_data', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                }

                loadSessions();
                alert('🎉 Welcome to Premium! You now have 6-hour sessions!');
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
            // Fallback to local update
            const userData = sessionStorage.getItem('user_data');
            if (userData) {
                const updatedUser = JSON.parse(userData);
                updatedUser.subscription_status = 'premium';
                sessionStorage.setItem('user_data', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }

            loadSessions();
            alert('🎉 Welcome to Premium! You now have 6-hour sessions!');
        }
    };

    const handlePaymentCancel = () => {
        setUpgradeExpanded(false);
    };

    const isPremium = user?.subscription_status === 'premium';

    // Debug logging for subscription status
    console.log('🔍 Dashboard Debug:', {
        user: user,
        subscription_status: user?.subscription_status,
        isPremium: isPremium
    });

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
                <h2>GuildMeet</h2>
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

            {/* Recordings Manager */}
            <div className="mb-4">
                <RecordingsManager user={user} />
            </div>

            {/* Premium Status or Upgrade CTA */}
            {isPremium ? (
                <PremiumStatusSection user={user} />
            ) : (
                <UpgradeSection
                    expanded={upgradeExpanded}
                    onStartUpgrade={handleStartUpgrade}
                    onPaymentSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                />
            )}

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