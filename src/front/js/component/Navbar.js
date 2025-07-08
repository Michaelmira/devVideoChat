import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import "../../styles/navbar.css";

export const Navbar = () => {
	const { store, actions } = useContext(Context);
	const navigate = useNavigate();

	const handleLogout = () => {
		actions.logOut();
		navigate("/");
	};

	return (
		<nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
			<div className="container">
				{/* Brand */}
				<Link to="/" className="navbar-brand d-flex align-items-center text-decoration-none">
					<div className="brand-icon me-2">
						<i className="fas fa-video text-primary" style={{ fontSize: '1.5rem' }}></i>
					</div>
					<span className="brand-text fw-bold text-dark">GuildMeet</span>
				</Link>

				{/* Right side content */}
				<div className="navbar-nav ms-auto">
					{store.isLoggedIn ? (
						// When logged in - show user info and logout button
						<div className="d-flex align-items-center gap-3">
							<div className="d-flex align-items-center">
								<div className="user-avatar me-2">
									<i className="fas fa-user-circle text-secondary" style={{ fontSize: '1.5rem' }}></i>
								</div>
								<div className="user-info">
									<small className="text-muted">
										{store.currentUserData?.user_data?.first_name || 'User'}
									</small>
								</div>
							</div>
							<button
								className="btn btn-outline-secondary btn-sm"
								onClick={handleLogout}
							>
								<i className="fas fa-sign-out-alt me-1"></i>
								Logout
							</button>
						</div>
					) : (
						// When not logged in - show login link
						<Link to="/" className="btn btn-primary btn-sm">
							<i className="fas fa-sign-in-alt me-1"></i>
							Get Started
						</Link>
					)}
				</div>
			</div>
		</nav>
	);
};
