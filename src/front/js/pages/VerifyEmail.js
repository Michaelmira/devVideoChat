import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Context } from '../store/appContext';

export const VerifyEmail = () => {
    const { store, actions } = useContext(Context);
    const [searchParams] = useSearchParams();
    const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, error

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            actions.verifyEmail(token)
                .then(result => {
                    if (result.success) {
                        setVerificationStatus('success');
                    } else {
                        setVerificationStatus('error');
                    }
                });
        } else {
            setVerificationStatus('error');
        }
    }, []);

    const renderStatus = () => {
        switch (verificationStatus) {
            case 'verifying':
                return <p>Verifying your email, please wait...</p>;
            case 'success':
                return (
                    <div>
                        <h2>Email Verified Successfully!</h2>
                        <p>Your account is now active. You can now log in.</p>
                        <Link to="/login" className="btn btn-primary">Go to Login</Link>
                    </div>
                );
            case 'error':
                return (
                    <div>
                        <h2>Verification Failed</h2>
                        <p>The verification link is invalid or has expired. Please try signing up again or contact support.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container text-center mt-5">
            {renderStatus()}
        </div>
    );
}; 