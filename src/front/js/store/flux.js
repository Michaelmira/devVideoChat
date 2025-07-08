const getState = ({ getStore, getActions, setStore }) => {
    return {
        store: {
            // Legacy compatibility flags (will be phased out)
            isMentorLoggedIn: false,
            isCustomerLoggedIn: false,

            // New unified system
            currentUserData: JSON.parse(sessionStorage.getItem("currentUserData")) || null,
            token: sessionStorage.getItem("token") || null,
            isLoggedIn: false,

            // User info for forms
            userInfo: {
                email: "",
                firstName: "",
                lastName: ""
            }
        },

        actions: {
            // NEW: Set user for unified video chat app
            setUser: (userData) => {
                console.log('🔄 Store: Setting user data:', userData);
                setStore({
                    currentUserData: { role: "user", user_data: userData },
                    token: sessionStorage.getItem('token'),
                    isLoggedIn: true,
                    // Clear old system flags
                    isMentorLoggedIn: false,
                    isCustomerLoggedIn: false
                });
            },

            // NEW: Unified logout
            logOut: () => {
                console.log('🚪 Logging out user');
                setStore({
                    token: null,
                    currentUserData: null,
                    isLoggedIn: false,
                    isMentorLoggedIn: false,
                    isCustomerLoggedIn: false
                });
                sessionStorage.clear();
            },

            getCurrentUser: async () => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/current/user`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + sessionStorage.getItem('token')
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();

                        // Handle new unified user system
                        if (data.role == "user") {
                            setStore({
                                currentUserData: data,
                                isLoggedIn: true,
                                // Clear old system flags
                                isMentorLoggedIn: false,
                                isCustomerLoggedIn: false
                            });
                            return true;
                        }

                        // Legacy compatibility - will be removed
                        if (data.role == "mentor") {
                            setStore({
                                isMentorLoggedIn: true,
                                currentUserData: data
                            });
                            return true;
                        }
                        if (data.role == "customer") {
                            setStore({
                                isCustomerLoggedIn: true,
                                currentUserData: data
                            });
                            return true;
                        }
                    } else {
                        console.error("get current user status:", response.status);
                        getActions().logOut();
                        alert("Your login token has expired. Please log in again to continue.");
                        return false;
                    }
                } catch (error) {
                    console.error("Failed to fetch current user:", error);
                    getActions().logOut();
                    alert("Token has expired. Please log in again to continue.");
                    return false;
                }
            },

            // Legacy compatibility functions (will be removed)
            checkStorage: async () => {
                const token = sessionStorage.getItem("token");
                if (token) {
                    setStore({
                        token: token,
                        isLoggedIn: true
                    });
                    return true;
                }
                return false;
            },

            checkStorageMentor: async () => {
                const token = sessionStorage.getItem("token");
                if (token) {
                    setStore({
                        token: token,
                        isMentorLoggedIn: true
                    });
                    return true;
                }
                return false;
            },

            // Email verification
            verifyCode: async (email, code) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/verify-code`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            email: email,
                            code: code
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return { success: true, message: data.msg || "Email verified successfully" };
                    } else {
                        return { success: false, message: data.msg || "Verification failed" };
                    }
                } catch (error) {
                    console.error("Verification error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            // Google OAuth initiation
            initiateGoogleAuth: async (userType) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/google/initiate`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            user_type: userType
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Open OAuth popup
                        const popup = window.open(data.auth_url, 'googleAuth', 'width=600,height=600');

                        return new Promise((resolve) => {
                            const checkClosed = setInterval(() => {
                                if (popup.closed) {
                                    clearInterval(checkClosed);
                                    resolve({ success: false, message: "Authentication cancelled" });
                                }
                            }, 1000);
                        });
                    } else {
                        return { success: false, message: data.message || "Failed to initiate Google authentication" };
                    }
                } catch (error) {
                    console.error("Google auth initiation error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            verifyGoogleAuth: async (authData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/google/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store auth data
                        sessionStorage.setItem("token", data.token);
                        sessionStorage.setItem("currentUserData", JSON.stringify(data.user_data));

                        setStore({
                            token: data.token,
                            currentUserData: { role: "user", user_data: data.user_data },
                            isLoggedIn: true
                        });

                        return { success: true, user_data: data.user_data };
                    } else {
                        return { success: false, message: data.message || "Authentication failed" };
                    }
                } catch (error) {
                    console.error("Google auth verification error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            // GitHub OAuth initiation
            initiateGitHubAuth: async (userType) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/initiate`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            user_type: userType
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Open OAuth popup
                        const popup = window.open(data.auth_url, 'githubAuth', 'width=600,height=600');

                        return new Promise((resolve) => {
                            const checkClosed = setInterval(() => {
                                if (popup.closed) {
                                    clearInterval(checkClosed);
                                    resolve({ success: false, message: "Authentication cancelled" });
                                }
                            }, 1000);
                        });
                    } else {
                        return { success: false, message: data.message || "Failed to initiate GitHub authentication" };
                    }
                } catch (error) {
                    console.error("GitHub auth initiation error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            verifyGitHubAuth: async (authData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store auth data
                        sessionStorage.setItem("token", data.token);
                        sessionStorage.setItem("currentUserData", JSON.stringify(data.user_data));

                        setStore({
                            token: data.token,
                            currentUserData: { role: "user", user_data: data.user_data },
                            isLoggedIn: true
                        });

                        return { success: true, user_data: data.user_data };
                    } else {
                        return { success: false, message: data.message || "Authentication failed" };
                    }
                } catch (error) {
                    console.error("GitHub auth verification error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            // MVP OAuth (for home page)
            initiateMVPGoogleAuth: async (mentorId) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/mvp/google/initiate`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            mentor_id: mentorId
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Open OAuth popup
                        const popup = window.open(data.auth_url, 'mvpGoogleAuth', 'width=600,height=600');

                        return new Promise((resolve) => {
                            const checkClosed = setInterval(() => {
                                if (popup.closed) {
                                    clearInterval(checkClosed);
                                    resolve({ success: false, message: "Authentication cancelled" });
                                }
                            }, 1000);
                        });
                    } else {
                        return { success: false, message: data.message || "Failed to initiate MVP Google authentication" };
                    }
                } catch (error) {
                    console.error("MVP Google auth initiation error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            initiateMVPGitHubAuth: async (mentorId) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/mvp/github/initiate`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            mentor_id: mentorId
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Open OAuth popup
                        const popup = window.open(data.auth_url, 'mvpGitHubAuth', 'width=600,height=600');

                        return new Promise((resolve) => {
                            const checkClosed = setInterval(() => {
                                if (popup.closed) {
                                    clearInterval(checkClosed);
                                    resolve({ success: false, message: "Authentication cancelled" });
                                }
                            }, 1000);
                        });
                    } else {
                        return { success: false, message: data.message || "Failed to initiate MVP GitHub authentication" };
                    }
                } catch (error) {
                    console.error("MVP GitHub auth initiation error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            },

            verifyMVPGitHubAuth: async (authData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store auth data
                        sessionStorage.setItem("token", data.token);
                        sessionStorage.setItem("currentUserData", JSON.stringify(data.user_data));

                        setStore({
                            token: data.token,
                            currentUserData: { role: "user", user_data: data.user_data },
                            isLoggedIn: true
                        });

                        return { success: true, user_data: data.user_data };
                    } else {
                        return { success: false, message: data.message || "Authentication failed" };
                    }
                } catch (error) {
                    console.error("MVP GitHub auth verification error:", error);
                    return { success: false, message: "An unexpected error occurred" };
                }
            }
        }
    };
};

export default getState;


