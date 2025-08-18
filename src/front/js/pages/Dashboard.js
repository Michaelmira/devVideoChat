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
        <div className="container-fluid" style={{
            width: "100vw",
            background: `
				radial-gradient(circle at 22% 20%, rgba(255, 0, 0, 0.8), transparent 26%),
				
				black
				`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
        }}>
            <div className="text-center bg-transparent text-white mb-4">
                <h2>GuildMeet</h2>
                <p>Create shareable video links instantly</p>
                {user && (
                    <p className="text-white">
                        Welcome back, {user.first_name}!
                        {isPremium ? (
                            <span className="badge ms-2" style={{ backgroundColor: "#C03728" }}>Premium</span>
                        ) : (
                            <span className="badge ms-2" style={{ backgroundColor: "#C03728" }}>Free</span>
                        )}
                    </p>
                )}
            </div>

            {/* Single Action: Create Link */}
            <div className="bg-transparent mb-12">
                <div className="card-body text-center">
                    <button
                        className="btn btn-primary btn-lg"
                        style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                        onMouseEnter={e => {
                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                        e.currentTarget.style.transform = "translateY(-1px)"
                        }}
                        onMouseLeave={e => {
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateY(0)"
                        }}
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
                    <p className="mt-2 text-white">
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
            <div className="card bg-transparent mt-4">
                <div className="card-body">
                    <h5 className="card-title text-white mb-4">Quick Stats</h5>
                    <div className="d-flex flex-row justify-content-between mx-5">
                        <div
                            className="card"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "none",
                                borderRadius: "12px",
                                overflow: "hidden",
                                backgroundColor: "#18181B",
                                transition: "box-shadow 0.3s ease, transform 0.3s ease",
                                maxWidth: "280px",
                                width: "100%",
                                flex: "1 1 280px",
                                minHeight: "200px"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = "0 0 15px 5px #C03728";
                                e.currentTarget.style.transform = "translateY(-6px)"
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)"
                            }}
                        >
                            <h3 style={{ color: "#C03728" }}>{sessions.length}</h3>
                            <small className="text-muted">Active Sessions</small>
                        </div>
                        <div
                            className="card"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "none",
                                borderRadius: "12px",
                                overflow: "hidden",
                                backgroundColor: "#18181B",
                                transition: "box-shadow 0.3s ease, transform 0.3s ease",
                                maxWidth: "280px",
                                width: "100%",
                                flex: "1 1 280px",
                                minHeight: "200px"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = "0 0 15px 5px #C03728";
                                e.currentTarget.style.transform = "translateY(-6px)"
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)"
                            }}
                        >
                            <h3 style={{ color: "#C03728" }}>
                                {isPremium ? '360' : '50'}
                            </h3>
                            <small className="text-muted">Minutes per Session</small>
                        </div>
                        <div
                            className="card"
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "none",
                                borderRadius: "12px",
                                overflow: "hidden",
                                backgroundColor: "#18181B",
                                transition: "box-shadow 0.3s ease, transform 0.3s ease",
                                maxWidth: "280px",
                                width: "100%",
                                flex: "1 1 280px",
                                minHeight: "200px"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = "0 0 15px 5px #C03728";
                                e.currentTarget.style.transform = "translateY(-6px)"
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)"
                            }}
                        >
                            <h3 style={{ color: "#C03728" }}>6</h3>
                            <small className="text-muted">Hours Link Duration</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* How to Use Guide */}
            <div className="card bg-transparent mt-4">
                <div className="card-body">
                    <h5 className="card-title text-white">How to Use</h5>
                    <ol className="list-group list-group-numbered gap-4">
                        <li
                            className="list-group-item d-flex justify-content-between rounded align-items-start"
                            style={{ backgroundColor: "#18181B", color: "#fff"}}
                        >
                            <div className="ms-2 me-auto text-white">
                                <div className="fw-bold">Create a Link</div>
                                Click "Create Video Link" to generate a new session
                            </div>
                            <span className="badge rounded-pill" style={{ backgroundColor: '#C03728' }}>1</span>
                        </li>
                        <li
                            className="list-group-item d-flex justify-content-between rounded align-items-start"
                            style={{ backgroundColor: "#18181B", color: "#fff" }}
                        >
                            <div className="ms-2 me-auto text-white">
                                <div className="fw-bold">Copy & Share</div>
                                Copy the link and share it with anyone
                            </div>
                            <span className="badge rounded-pill" style={{ backgroundColor: '#C03728' }}>2</span>
                        </li>
                        <li
                            className="list-group-item d-flex justify-content-between rounded align-items-start"
                            style={{ backgroundColor: "#18181B", color: "#fff" }}
                        >
                            <div className="ms-2 me-auto text-white">
                                <div className="fw-bold">Start Video Chat</div>
                                Anyone with the link can join - no account needed!
                            </div>
                            <span className="badge rounded-pill" style={{ backgroundColor: '#C03728' }}>3</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}; 