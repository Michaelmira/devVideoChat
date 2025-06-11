// MentorDetails.js 

import React, { useEffect, useContext, useState, useRef } from "react";
import { Context } from "../store/appContext";
import { MapPin, Mail, Phone, Calendar, Clock, DollarSign, Award, BookOpen } from 'lucide-react';
import { useParams, Link, useNavigate } from "react-router-dom";
import { StripePaymentComponent } from "../component/StripePaymentComponent";
import BookingCalendarWidget from "../component/BookingCalendarWidget";
import './MentorDetails.css';

export const MentorDetails = () => {
    const { store, actions } = useContext(Context);
    const { theid } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

    // State for portfolio image modal
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [selectedPortfolioImage, setSelectedPortfolioImage] = useState(null);

    const bookingSectionRef = useRef(null);

    const openPortfolioModal = (imageUrl) => {
        setSelectedPortfolioImage(imageUrl);
        setShowPortfolioModal(true);
    };

    const closePortfolioModal = () => {
        setShowPortfolioModal(false);
        setSelectedPortfolioImage(null);
    };

    useEffect(() => {
        // Get the specific mentor details
        const fetchMentorDetails = async () => {
            setLoading(true);
            try {
                const mentorData = store.mentors.find(m => m.id.toString() === theid);
                setMentor(mentorData);
            } catch (error) {
                console.error("Error fetching mentor details:", error);
            } finally {
                setLoading(false);
            }
        };

        // If store.mentors is empty, fetch all mentors first
        if (store.mentors.length === 0) {
            actions.getMentors().then(() => fetchMentorDetails());
        } else {
            fetchMentorDetails();
        }
    }, [theid, actions, store.mentors]);

    const handleBookSession = () => {
        if (bookingSectionRef.current) {
            bookingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleTimeSlotSelected = async (slot) => {
        setSelectedTimeSlot(slot);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = async (paymentIntent) => {
        try {
            const result = await actions.finalizeBooking({
                mentorId: mentor.id,
                sessionStartTime: selectedTimeSlot.start_time,
                sessionEndTime: selectedTimeSlot.end_time,
                paymentIntentId: paymentIntent.id,
                amountPaid: paymentIntent.amount,
                notes: ''
            });

            if (result.success) {
                // Redirect to customer dashboard or show success message
                navigate('/customer-dashboard');
            } else {
                alert('Failed to finalize booking. Please contact support.');
            }
        } catch (error) {
            console.error('Error finalizing booking:', error);
            alert('An error occurred while finalizing your booking. Please contact support.');
        }
    };

    const handlePaymentError = (error) => {
        console.error("Payment error:", error);
        alert(`Payment error: ${error.message || 'Unknown error'}`);
        setShowPaymentModal(false);
    };

    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setSelectedTimeSlot(null);
    };

    if (loading) {
        return (
            <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!mentor) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4 className="alert-heading">Mentor Not Found</h4>
                    <p>We couldn't find the mentor you're looking for. They may no longer be available.</p>
                    <hr />
                    <div className="d-flex justify-content-between">
                        <Link to="/mentor-list" className="btn btn-primary">
                            Return to Mentor List
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5 mb-5">
            <div className="row">
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body text-center">
                            {mentor.profile_photo ? (
                                <img
                                    src={mentor.profile_photo.image_url}
                                    alt={`${mentor.first_name} ${mentor.last_name}`}
                                    className="rounded-circle img-fluid mb-3"
                                    style={{ width: "200px", height: "200px", objectFit: "cover" }}
                                />
                            ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: "200px", height: "200px" }}>
                                    <span className="text-white h1">
                                        {mentor.first_name[0]}{mentor.last_name[0]}
                                    </span>
                                </div>
                            )}
                            <h3>{mentor.first_name} {mentor.last_name}</h3>
                            {mentor.nick_name && <p className="text-muted">"{mentor.nick_name}"</p>}

                            <div className="d-grid gap-2">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleBookSession}
                                >
                                    Book a Session
                                </button>
                            </div>
                        </div>

                        <ul className="list-group list-group-flush">
                            <li className="list-group-item">
                                <MapPin className="me-2" size={18} />
                                {mentor.city}, {mentor.what_state}, {mentor.country}
                            </li>
                            <li className="list-group-item">
                                <DollarSign className="me-2" size={18} />
                                ${mentor.price}/session
                            </li>
                            <li className="list-group-item">
                                <Award className="me-2" size={18} />
                                {mentor.years_exp} years of experience
                            </li>
                        </ul>
                    </div>

                    {/* Skills Section */}
                    <div className="card mt-4">
                        <div className="card-header">
                            <h5 className="mb-0">Skills & Expertise</h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex flex-wrap gap-2">
                                {mentor.skills && mentor.skills.map((skill, index) => (
                                    <span key={index} className="badge bg-primary">{skill}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    {/* About Section */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">About Me</h5>
                        </div>
                        <div className="card-body">
                            <p style={{ whiteSpace: 'pre-line' }}>{mentor.about_me}</p>
                        </div>
                    </div>

                    {/* Portfolio Section */}
                    {mentor.portfolio_photos && mentor.portfolio_photos.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h5 className="mb-0">Portfolio</h5>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    {mentor.portfolio_photos.map((photo, index) => (
                                        <div key={index} className="col-md-4">
                                            <img
                                                src={photo.image_url}
                                                alt={`Portfolio ${index + 1}`}
                                                className="img-fluid rounded cursor-pointer"
                                                onClick={() => openPortfolioModal(photo.image_url)}
                                                style={{ cursor: 'pointer', height: '200px', width: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Booking Calendar Section */}
                    <div ref={bookingSectionRef} className="card mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">Book a Session</h5>
                        </div>
                        <div className="card-body">
                            <BookingCalendarWidget
                                mentorId={mentor.id}
                                mentorName={`${mentor.first_name} ${mentor.last_name}`}
                                onSelectSlot={handleTimeSlotSelected}
                                backendUrl={process.env.BACKEND_URL}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Portfolio Modal */}
            {showPortfolioModal && (
                <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <button type="button" className="btn-close" onClick={closePortfolioModal}></button>
                            </div>
                            <div className="modal-body text-center">
                                <img
                                    src={selectedPortfolioImage}
                                    alt="Portfolio"
                                    className="img-fluid"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedTimeSlot && (
                <div className="payment-modal-wrapper">
                    <div 
                        className="modal d-block" 
                        tabIndex="-1" 
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onClick={(e) => {
                            // Close modal when clicking on backdrop
                            if (e.target.classList.contains('modal')) {
                                handleClosePaymentModal();
                            }
                        }}
                    >
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Complete Your Booking</h5>
                                    <button type="button" className="btn-close" onClick={handleClosePaymentModal}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="mb-4">
                                        <h6>Session Details:</h6>
                                        <p className="mb-1">
                                            <strong>Date:</strong> {new Date(selectedTimeSlot.start_time).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                        <p className="mb-1">
                                            <strong>Time:</strong> {new Date(selectedTimeSlot.start_time).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })} - {new Date(selectedTimeSlot.end_time).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </p>
                                        <p className="mb-1">
                                            <strong>Duration:</strong> {selectedTimeSlot.duration} minutes
                                        </p>
                                        <p className="mb-0">
                                            <strong>Price:</strong> ${mentor.price}
                                        </p>
                                    </div>
                                    <hr />
                                    <StripePaymentComponent
                                        amount={parseFloat(mentor.price) * 100} // Convert to cents
                                        onSuccess={handlePaymentSuccess}
                                        onError={handlePaymentError}
                                        mentorName={`${mentor.first_name} ${mentor.last_name}`}
                                        mentorId={mentor.id}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorDetails;