import React, { useState, useEffect, useContext } from "react";
import { Context } from "../store/appContext";
import { useNavigate } from "react-router-dom";
import { MVPLoginForm } from "../component/MVPLoginForm";
import "../../styles/home.css";

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
		<div className="container-fluid">
			{/* Hero Section */}
			<div className="row min-vh-100 align-items-center">
				<div className="col-lg-6">
					<div className="px-4">
						<h1 className="display-4 fw-bold mb-4">
							Quick Video Chat Links
						</h1>
						<p className="lead mb-4">
							Create instant video chat links. Share with anyone.
							No accounts needed for guests.
						</p>
						<div className="d-flex gap-3 mb-4">
							<div className="text-center">
								<div className="badge bg-success mb-2 fs-6">FREE</div>
								<div className="small">50-minute sessions</div>
							</div>
							<div className="text-center">
								<div className="badge bg-primary mb-2 fs-6">$3/MONTH</div>
								<div className="small">6-hour sessions</div>
							</div>
						</div>
					</div>
				</div>

				{/* MVP Login Card */}
				<div className="col-lg-6">
					<div className="card shadow-lg mx-auto" style={{ maxWidth: '400px' }}>
						<div className="card-body p-4">
							<h3 className="text-center mb-4">Get Started</h3>

							{/* Quick Login Form */}
							<MVPLoginForm />

							<div className="text-center mt-3">
								<small className="text-muted">
									Start with 50 free minutes
								</small>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Features Section */}
			<div className="row py-5 bg-light">
				<div className="col-12">
					<div className="text-center mb-5">
						<h2>How It Works</h2>
					</div>
					<div className="row text-center">
						<div className="col-md-4">
							<div className="mb-3" style={{ fontSize: '3rem' }}>🔗</div>
							<h5>1. Create Link</h5>
							<p>Generate instant video chat link</p>
						</div>
						<div className="col-md-4">
							<div className="mb-3" style={{ fontSize: '3rem' }}>📋</div>
							<h5>2. Copy & Share</h5>
							<p>Share with anyone, anywhere</p>
						</div>
						<div className="col-md-4">
							<div className="mb-3" style={{ fontSize: '3rem' }}>🎥</div>
							<h5>3. Start Chatting</h5>
							<p>Video + screen sharing instantly</p>
						</div>
					</div>
				</div>
			</div>

			{/* Pricing Section */}
			<div className="row py-5">
				<div className="col-12">
					<div className="text-center mb-5">
						<h2>Simple Pricing</h2>
						<p className="lead">Choose what works for you</p>
					</div>
					<div className="row justify-content-center">
						<div className="col-md-4">
							<div className="card h-100">
								<div className="card-body text-center">
									<h5 className="card-title">Free</h5>
									<h2 className="text-success">$0</h2>
									<p className="text-muted">per month</p>
									<ul className="list-unstyled">
										<li>✅ 50-minute sessions</li>
										<li>✅ Unlimited links</li>
										<li>✅ Screen sharing</li>
										<li>✅ HD video quality</li>
									</ul>
								</div>
							</div>
						</div>
						<div className="col-md-4">
							<div className="card h-100 border-primary">
								<div className="card-body text-center">
									<h5 className="card-title">
										Premium <span className="badge bg-primary">Popular</span>
									</h5>
									<h2 className="text-primary">$3</h2>
									<p className="text-muted">per month</p>
									<ul className="list-unstyled">
										<li>✅ 6-hour sessions</li>
										<li>✅ 1 active link</li>
										<li>✅ Screen sharing</li>
										<li>✅ HD video quality</li>
										<li>✅ Recording capability</li>
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