import React, { useContext, useState, useEffect } from "react";
import { Context } from "../store/appContext";
import { CalendlyAvailability } from "../component/CalendlyAvailability";
import { MentorAvailability } from "../component/MentorAvailability";
import { MentorAvailabilitySettings } from "../component/MentorAvailabilitySettings";
import { Container, Row, Col, Card, ListGroup, Alert } from 'react-bootstrap';

export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);
	const [mentorData, setMentorData] = useState(store.currentUserData?.user_data);
	const [bookings, setBookings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Add cleanup effect for modal backdrop
	useEffect(() => {
		// Remove any lingering modal backdrops
		const modalBackdrops = document.getElementsByClassName('modal-backdrop');
		while (modalBackdrops.length > 0) {
			modalBackdrops[0].remove();
		}
		// Remove modal-open class from body
		document.body.classList.remove('modal-open');
		document.body.style.overflow = '';
		document.body.style.paddingRight = '';
	}, []);

	useEffect(() => {
		const fetchMentorData = async () => {
			try {
				if (!store.currentUserData?.user_data) {
					const data = await actions.getCurrentUser();
					if (data && data.user_data) setMentorData(data.user_data);
				} else {
					setMentorData(store.currentUserData.user_data);
				}

				if (store.currentUserData?.role === 'mentor') {
					const mentorBookings = await actions.getMentorBookings();
					setBookings(mentorBookings || []);
				}
			} catch (err) {
				setError('Failed to fetch dashboard data.');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		if (store.token) {
			fetchMentorData();
		} else {
			setLoading(false);
		}
	}, [store.currentUserData, store.token, actions]);

	if (loading) {
		return <div className="container text-center"><h2>Loading Dashboard...</h2></div>;
	}

	if (!store.token || store.currentUserData?.role !== 'mentor') {
		return <div className="container"><h2>Please log in as a mentor to see your dashboard.</h2></div>;
	}

	if (error) {
		return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
	}

	return (
		<Container className="mt-5">
			<h1 className="text-center mb-4">MENTOR DASHBOARD</h1>

			<Row>
				<Col lg={8}>
					<Card className="mb-4">
						<Card.Header>
							<h2 className="h4 mb-0">Upcoming Bookings</h2>
						</Card.Header>
						<Card.Body>
							{bookings.length > 0 ? (
								<ListGroup>
									{bookings.map(booking => (
										<ListGroup.Item key={booking.id}>
											<div className="d-flex w-100 justify-content-between">
												<h5 className="mb-1">{`Session with ${booking.customer_name}`}</h5>
												<span className={`badge bg-success`}>{booking.status}</span>
											</div>
											<p className="mb-1">
												<strong>Date & Time:</strong> {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : 'Not Scheduled'}
											</p>
											<p className="mb-1">
												<strong>Meeting Link:</strong>
												{booking.google_meet_link ? (
													<a href={booking.google_meet_link} target="_blank" rel="noopener noreferrer" className="ms-2">
														Join Meeting
													</a>
												) : (
													<span className="ms-2">Link not available</span>
												)}
											</p>
											<small>Booking ID: {booking.id}</small>
										</ListGroup.Item>
									))}
								</ListGroup>
							) : (
								<Alert variant="info" className="mb-0">You have no upcoming bookings.</Alert>
							)}
						</Card.Body>
					</Card>
				</Col>

				<Col lg={4}>
					<Card className="mb-4">
						<Card.Header>
							<h2 className="h4 mb-0">Quick Stats</h2>
						</Card.Header>
						<Card.Body>
							<div className="d-flex justify-content-between mb-3">
								<span>Total Bookings:</span>
								<strong>{bookings.length}</strong>
							</div>
							<div className="d-flex justify-content-between mb-3">
								<span>Upcoming Sessions:</span>
								<strong>
									{bookings.filter(b =>
										new Date(b.scheduled_at) > new Date() &&
										b.status !== 'cancelled_by_mentor' &&
										b.status !== 'cancelled_by_customer'
									).length}
								</strong>
							</div>
							<div className="d-flex justify-content-between">
								<span>Completed Sessions:</span>
								<strong>
									{bookings.filter(b => b.status === 'completed').length}
								</strong>
							</div>
						</Card.Body>
					</Card>
				</Col>
			</Row>

			<Row>
				<Col>
					<MentorAvailabilitySettings />
				</Col>
			</Row>

			<Row>
				<div className="col-md-6 mb-4">
					<h2 className="text-center h4 mb-3">Your Public Calendly Page</h2>
					<p className="text-center text-muted small">This is a preview of your main Calendly scheduling page that clients might see. Actual bookings will go through the integrated system.</p>
					{mentorData && mentorData.calendly_url ? (
						<div className="card"><div className="card-body p-0"><CalendlyAvailability mentor={mentorData} /></div></div>
					) : (
						<div className="alert alert-light text-center">
							<p>Your public Calendly URL is not set. You can set it in your <a href="/mentor-profile">profile</a>.</p>
							<small>Note: Even without this public URL, integrated bookings will work once Calendly is connected in your profile.</small>
						</div>
					)}
				</div>
				<div className="col-md-6 mb-4">
					<h2 className="text-center h4 mb-3">Internal Availability Overview</h2>
					<p className="text-center text-muted small">This component might show your general availability settings within our platform (if applicable).</p>
					<div className="card"><div className="card-body"><MentorAvailability /></div></div>
				</div>
			</Row>
		</Container>
	);
};
