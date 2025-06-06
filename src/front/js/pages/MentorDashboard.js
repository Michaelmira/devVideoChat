import React, { useContext, useState, useEffect } from "react";
import { Context } from "../store/appContext";
import CalendlyAvailability from "../component/CalendlyAvailability";
import { MentorAvailability } from "../component/MentorAvailability";

export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);
	const [mentorData, setMentorData] = useState(store.currentUserData?.user_data);

	useEffect(() => {
		if (!store.currentUserData?.user_data) {
			actions.getCurrentUser().then(data => {
				if (data && data.user_data) setMentorData(data.user_data);
			});
		} else {
			setMentorData(store.currentUserData.user_data);
		}
		actions.getMentorBookings();
	}, [store.currentUserData, actions]);

	return (
		<div className="container mt-5">
			<h1 className="text-center mb-5">MENTOR DASHBOARD</h1>

			<div className="row">
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
			</div>

			<div className="row">
				<div className="col">
					<h2>Upcoming Bookings</h2>
					{store.mentorBookings && store.mentorBookings.length > 0 ? (
						<ul className="list-group">
							{store.mentorBookings.map(booking => (
								<li key={booking.id} className="list-group-item">
									<p><strong>Client:</strong> {booking.client_name}</p>
									<p><strong>Time:</strong> {new Date(booking.start_time).toLocaleString()}</p>
									<p><strong>Status:</strong> {booking.status}</p>
									<p><strong>Meeting Link:</strong> <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer">{booking.meeting_link}</a></p>
								</li>
							))}
						</ul>
					) : (
						<p>You have no upcoming bookings.</p>
					)}
				</div>
			</div>
		</div>
	);
};
