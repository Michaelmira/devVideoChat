import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";

export const MVPLoginForm = () => {
    const { store, actions } = useContext(Context);
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isLogin ? '/api/login' : '/api/register';

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.firstName,
                    last_name: formData.lastName
                })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('token', data.access_token);
                sessionStorage.setItem('user_data', JSON.stringify(data.user_data || data.user));

                // Update store
                actions.setUser(data.user_data || data.user);

                navigate('/dashboard');
            } else {
                setError(data.msg || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Use MVP Google credentials
        window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/mvp/google/initiate`;
    };

    const handleGitHubLogin = () => {
        // Use MVP GitHub credentials  
        window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/auth/mvp/github/initiate`;
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div className="row">
                        <div className="col-6">
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="First name"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required={!isLogin}
                            />
                        </div>
                        <div className="col-6">
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="Last name"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required={!isLogin}
                            />
                        </div>
                    </div>
                )}

                <input
                    type="email"
                    className="form-control mb-3"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />

                <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary w-100 mb-3"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            {isLogin ? 'Signing In...' : 'Creating Account...'}
                        </>
                    ) : (
                        isLogin ? 'Sign In' : 'Create Account'
                    )}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setFormData({ ...formData, firstName: '', lastName: '' });
                        }}
                    >
                        {isLogin ? 'Need an account? Sign up' : 'Have an account? Sign in'}
                    </button>
                </div>
            </form>

            <div className="text-center my-3">
                <span className="text-muted">or</span>
            </div>

            {/* OAuth Buttons */}
            <div className="d-grid gap-2">
                <button
                    className="btn btn-outline-dark"
                    onClick={handleGoogleLogin}
                    type="button"
                >
                    <i className="fab fa-google me-2"></i>
                    Continue with Google
                </button>
                <button
                    className="btn btn-outline-dark"
                    onClick={handleGitHubLogin}
                    type="button"
                >
                    <i className="fab fa-github me-2"></i>
                    Continue with GitHub
                </button>
            </div>
        </>
    );
}; 