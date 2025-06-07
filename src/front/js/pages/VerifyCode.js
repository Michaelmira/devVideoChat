import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Context } from '../store/appContext';

export const VerifyCode = () => {
    const { actions } = useContext(Context);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState(location.state?.email);

    useEffect(() => {
        if (!location.state?.email) {
            setError("No email address was provided. Please sign up again.");
        }
    }, [location.state]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            setError('Please enter a valid 6-digit code.');
            return;
        }
        setError('');
        const result = await actions.verifyCode(email, code);
        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error || 'An unknown error occurred.');
        }
    };

    if (success) {
        return (
            <div className="container text-center mt-5">
                <h2>Verification Successful!</h2>
                <p>Your account is now active. You can proceed to log in.</p>
                <Link to="/login" className="btn btn-primary">Go to Login</Link>
            </div>
        );
    }

    if (!email) {
        return (
            <div className="container text-center mt-5">
                <h2>Error</h2>
                <p>{error || "Email is missing."}</p>
                <Link to="/signup" className="btn btn-primary">Go to Signup</Link>
            </div>
        );
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h2 className="card-title text-center">Verify Your Email</h2>
                            <p className="text-center">A 6-digit verification code has been sent to <strong>{email}</strong>. Please enter it below.</p>
                            <form onSubmit={handleVerify}>
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control"
                                        maxLength="6"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="Enter 6-digit code"
                                    />
                                </div>
                                {error && <div className="alert alert-danger">{error}</div>}
                                <button type="submit" className="btn btn-primary w-100">Verify Account</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 