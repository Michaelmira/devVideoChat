import React, { useContext, useState } from "react";
import { Context } from "../store/appContext";
import { ValidateEmail, ValidatePassword } from "../component/Validators";


export const MentorLogin = ({ onSuccess, switchToSignUp, onForgotPs }) => {
    const { actions } = useContext(Context);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [invalidItems, setInvalidItems] = useState([]);
    const [apiError, setApiError] = useState("");

    const handleLogin = async () => {
        setInvalidItems([]);
        setApiError("");
        const isEmailValid = ValidateEmail(email, setInvalidItems);
        const isPasswordValid = ValidatePassword(password, setInvalidItems);

        if (isEmailValid && isPasswordValid) {
            const result = await actions.logInMentor({ email, password });
            if (result.success) {
                // Remove any existing modal backdrops and cleanup
                const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                while (modalBackdrops.length > 0) {
                    modalBackdrops[0].remove();
                }
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                if (onSuccess) onSuccess();
            } else {
                setApiError(result.message || "Email and/or password is incorrect. Please try again.");
            }
        }
    };

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
        }}>
            <div className="row justify-content-center authDiv">
                <div className="col-12 text-light">
                    <h2 className="text-center mt-2 mb-4">Welcome Back Mentors!</h2>
                    <div className="mb-3">
                        <input
                            type="email"
                            className={`form-control bg-dark text-light ${invalidItems.includes("email") ? 'is-invalid' : ''}`}
                            style={{
                                border: invalidItems.includes("email") ? '1px solid red' : '1px solid #414549',
                                padding: '12px',
                            }}
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        {invalidItems.includes("email") && (
                            <div className="invalid-feedback">Invalid email format</div>
                        )}
                    </div>
                    <div>
                        <input
                            type="password"
                            className={`form-control bg-dark text-light ${invalidItems.includes("password") ? 'is-invalid' : ''}`}
                            style={{
                                border: invalidItems.includes("password") ? '1px solid red' : '1px solid #414549',
                                padding: '12px',
                            }}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                            required
                        />
                        {invalidItems.includes("password") && (
                            <div className="invalid-feedback">Password must be 5-20 characters</div>
                        )}
                        {apiError && <p className="text-danger mt-2">{apiError}</p>}
                        <div>
                            <span
                                onClick={() => onForgotPs()}
                                className="text-secondary auth-link small-font"
                                style={{ cursor: 'pointer' }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                    </div>
                    <div className="text-center mt-3 mb-4">
                        <button
                            type="submit"
                            className="btn btn-secondary w-100 py-2"
                            style={{
                                backgroundColor: '#6c757d',
                                border: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Login
                        </button>
                    </div>
                    <div className="text-center text-secondary small-font">
                        New to our platform?
                        <span
                            onClick={() => switchToSignUp()}
                            className="ms-1 text-secondary auth-link"
                        >
                            Create an account
                        </span>
                    </div>
                </div>
            </div>
        </form>
    );
};