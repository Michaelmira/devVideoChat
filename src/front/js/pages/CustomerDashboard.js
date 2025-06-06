import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../store/appContext';

const CustomerDashboard = () => {
    const { store, actions } = useContext(Context);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBookings = async () => {
            if (store.currentUser?.role !== 'customer') {
                setLoading(false);
                return;
            }
            try {
                const userBookings = await actions.getCustomerBookings();
                setBookings(userBookings || []);
            } catch (err) {
                setError('Failed to fetch your bookings. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (store.token) {
            fetchBookings();
        } else {
            setLoading(false);
        }
    }, [store.currentUser, store.token, actions]);

    if (loading) {
        return <div className="container text-center"><h2>Loading Dashboard...</h2></div>;
    }

    if (!store.token || store.currentUser?.role !== 'customer') {
        return <div className="container"><h2>Please log in as a customer to see your dashboard.</h2></div>;
    }

    if (error) {
        return <div className="container alert alert-danger"><h2>Error</h2><p>{error}</p></div>;
    }

    return (
        <div className="container mt-5">
            <h1>Your Dashboard</h1>
            <h2 className="mb-4">Your Booked Sessions</h2>
            {bookings.length > 0 ? (
                <div className="list-group">
                    {bookings.map(booking => (
                        <div key={booking.id} className="list-group-item list-group-item-action flex-column align-items-start mb-3">
                            <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1">{`Session with ${booking.mentor_name}`}</h5>
                                <small>Status: <span className="badge bg-success">{booking.status}</span></small>
                            </div>
                            <p className="mb-1">
                                <strong>Date & Time:</strong> {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : 'Not scheduled'}
                            </p>
                            <small>Booking ID: {booking.id}</small>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="alert alert-info">
                    <p>You have no upcoming bookings.</p>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard; 