import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import { MVPLoginForm } from "../component/MVPLoginForm";
// import "../../styles/home.css";

export const Home = () => {
	const { store, actions } = useContext(Context);
	const navigate = useNavigate();

	// Handle OAuth callback and check if user is already logged in
	useEffect(() => {
		const handleOAuthCallback = async () => {
			console.log('🔍 Home useEffect running, checking for OAuth callback...');
			
			// Check for OAuth callback parameters in URL
			const urlParams = new URLSearchParams(window.location.search);
			const googleAuthSuccess = urlParams.get('google_auth');
			const githubAuthSuccess = urlParams.get('github_auth');
			const mvpGithubAuthSuccess = urlParams.get('mvp_github_auth');
			const token = urlParams.get('token');
			const userId = urlParams.get('user_id');
			const newUser = urlParams.get('new_user');
			
			console.log('🔍 OAuth params:', { 
				googleAuthSuccess, 
				githubAuthSuccess, 
				mvpGithubAuthSuccess, 
				token: token ? 'Present' : 'Missing', 
				userId, 
				newUser 
			});

			// Handle OAuth errors first
			if (googleAuthSuccess === 'error' || githubAuthSuccess === 'error' || mvpGithubAuthSuccess === 'error') {
				const error = urlParams.get('error');
				console.error('❌ OAuth error:', error);
				
				// Show user-friendly error message
				alert(`Login failed: ${error || 'Unknown error'}. Please try again.`);
				
				// Clean up URL parameters
				window.history.replaceState({}, document.title, window.location.pathname);
				return;
			}

			console.log('🔍 Checking OAuth success condition...');
			console.log('🔍 Success conditions:', {
				googleAuthSuccess: googleAuthSuccess === 'success',
				githubAuthSuccess: githubAuthSuccess === 'success',
				mvpGithubAuthSuccess: mvpGithubAuthSuccess === 'success',
				hasToken: !!token
			});

			if ((googleAuthSuccess === 'success' || githubAuthSuccess === 'success' || mvpGithubAuthSuccess === 'success') && token) {
				console.log('🎉 OAuth callback detected, processing login...');
				console.log('🔑 About to store token in sessionStorage...');

				// Store token and login user
				sessionStorage.setItem('token', token);
				console.log('✅ Token stored in sessionStorage');

				// Get user data
				console.log('📡 Calling getCurrentUser...');
				const success = await actions.getCurrentUser();
				console.log('📡 getCurrentUser result:', success);

				if (success) {
					console.log('🎯 OAuth login successful, redirecting to dashboard...');

					// Clean up URL parameters
					window.history.replaceState({}, document.title, window.location.pathname);

					// Redirect to dashboard
					navigate('/dashboard');
				} else {
					console.error('❌ Failed to get user data after OAuth');
					// Clean up URL parameters even on failure
					window.history.replaceState({}, document.title, window.location.pathname);
				}
				return;
			}

			console.log('🔍 OAuth success condition not met, checking for existing token...');

			// Regular check if user is already logged in
			const existingToken = sessionStorage.getItem('token');
			if (existingToken) {
				console.log('🔍 Found existing token, redirecting to dashboard...');
				// Redirect to dashboard if already logged in
				navigate('/dashboard');
			} else {
				console.log('🔍 No existing token found, staying on home page');
			}
		};

		handleOAuthCallback();
	}, [navigate, actions]);

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
			{/* Hero Section */}
			<div
			className="d-flex align-items-center justify-content-center flex-wrap min-vh-100"
			style={{ gap: "60px" }}
			>
			{/* Left Content */}
				<div style={{ flex: "0 1 50%" }}>
					<div className="px-4">
					<h1 className="display-4 fw-bold mb-4 text-white">GuildMeet</h1>
					<p className="lead mb-4 text-white">
						Create instant video chat links. Share with anyone.
						No accounts needed for guests.
					</p>
					<div className="d-flex gap-3 mb-4">
						<div className="text-center">
						<div className="badge mb-2 fs-6" style={{ backgroundColor: "#C03728" }}>FREE</div>
						<div className="small fw-bold text-white">1h 10m sessions</div>
						</div>
						<div className="text-center">
						<div className="badge mb-2 fs-6" style={{ backgroundColor: "#C03728" }}>$3/MONTH</div>
						<div className="small fw-bold text-white">6-hour sessions</div>
						</div>
					</div>
					</div>
				</div>

			{/* Right Form Card */}
				<div style={{ flex: "0 1 400px" }}>
					<div className="card shadow-lg mx-auto" style={{ backgroundColor: "#18181B" }}>
					<div className="card-body p-4">
						<h3 className="text-center text-white mb-4">Get Started</h3>
						<MVPLoginForm />
						<div className="text-center mt-3">
						<small className="text-white">Start with 70 free minutes</small>
						</div>
					</div>
					</div>
				</div>
			</div>
			{/* Features Section */}
			<div 
				className="row py-5" 
				style={{ backgroundColor: "#000" }}
			>
				<div className="col-12">
					<div className="text-center mb-5">
					<h2 className="text-white">How It Works</h2>
					</div>

					<div
						className="d-flex justify-content-center flex-wrap text-center"
						style={{ gap: "30px" }}
					>
						{[
							{ icon: "🔗", title: "1. Create Link", desc: "Generate instant video chat link" },
							{ icon: "📋", title: "2. Copy & Share", desc: "Share with anyone, anywhere" },
							{ icon: "🎥", title: "3. Start Chatting", desc: "Video + screen sharing instantly" },
						].map((item, i) => (
							<div key={i} style={{ flex: "1 1 280px", maxWidth: "280px" }}>
							<div
								className="p-4 text-white"
								style={{
								backgroundColor: "#18181B",
								borderRadius: "12px",
								boxShadow: "0 0 10px rgba(255, 255, 255, 0.05)",
								width: "100%",
								transition: "box-shadow 0.3s ease, transform 0.3s ease",
								}}
								onMouseEnter={(e) => {
								e.currentTarget.style.boxShadow = "0 0 15px 5px #C03728";
								e.currentTarget.style.transform = "translateY(-3px)";
								}}
								onMouseLeave={(e) => {
								e.currentTarget.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.05)";
								e.currentTarget.style.transform = "translateY(0)";
								}}
							>
								<div className="mb-3" style={{ fontSize: "3rem" }}>{item.icon}</div>
								<h5>{item.title}</h5>
								<p className="text-muted">{item.desc}</p>
							</div>
							</div>
						))}
					</div>

				</div>
			</div>


			{/* Pricing Section */}
			<div className="row py-5 bg-black">
				<div className="col-12">
					<div className="text-center mb-5">
						<h2 className="text-white">Simple Pricing</h2>
						<p className="lead text-muted">Choose what works for you</p>
					</div>
					<div className="row justify-content-center">
						 <div className="col-md-4">
							<div
							className="card h-100"
							style={{
								border: "none",
								borderRadius: "12px",
								overflow: "hidden",
								backgroundColor: "#18181B",
								transition: "box-shadow 0.3s ease, transform 0.3s ease"
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
								<div className="card-body text-center">
									<h5 className="card-title text-white">Free</h5>
									<h2 style={{ color: "#EC4432" }}>$0</h2>
									<p className="text-muted">per month</p>
									<ul className="list-unstyled text-white text-start">
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>70-minute sessions</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>Unlimited links</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>Screen sharing</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>HD video quality</li>
									</ul>
								</div>
							</div>
						</div>
						<div className="col-md-4">
							<div
								className="card h-100"
								style={{
								border: "none",
								borderRadius: "12px",
								overflow: "hidden", // 👈 This is key
								backgroundColor: "#18181B", // move background color here
								transition: "box-shadow 0.3s ease, transform 0.3s ease"
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
								<div className="card-body text-center">
								<h5 className="card-title text-white">
									Premium <span className="badge" style={{ backgroundColor: "#EC4432" }}>Popular</span>
								</h5>
								<h2 style={{ color: "#EC4432" }}>$3</h2>
								<p className="text-muted">per month</p>
								<ul className="list-unstyled text-white text-start">
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>6-hour sessions</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>1 active link</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>Screen sharing</li>
									<li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>HD video quality</li>
									{/* <li><span style={{ color: '#C03728' }} className="me-2">&#10003;</span>Recording capability</li> */}
								</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};