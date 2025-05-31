// MentorDetails.js 

import React, { useEffect, useContext, useState } from "react";
import { Context } from "../store/appContext";
import { MapPin, Mail, Phone, Calendar, Clock, DollarSign, Award, BookOpen } from 'lucide-react';
import { useParams, Link, useNavigate } from "react-router-dom";
import CalendlyAvailability from "../component/CalendlyAvailability";
import CalendlyAvailability2 from "../component/CalendlyAvailability2"; // Import the new component
import { StripePaymentComponent } from "../component/StripePaymentComponent";

export const MentorDetails = () => {
    const { store, actions } = useContext(Context);
    const { theid } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    
    // New states for managing the booking flow
    const [bookingStep, setBookingStep] = useState('initial'); // 'initial', 'payment', 'calendly_finalize'
    const [paymentIntentData, setPaymentIntentData] = useState(null);
    const [bookingId, setBookingId] = useState(null);

    useEffect(() => {
        // Get the specific mentor details
        const fetchMentorDetails = async () => {
            setLoading(true);
            try {
                // If you have a specific endpoint for getting mentor details
                // await actions.getMentorById(theid);

                // Alternatively, if you already have all mentors in store
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
        // Check if user is authenticated
        if (!store.token || !store.currentUserData) {
            // Save the current page to sessionStorage so you can redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);

            // Alert the user
            alert("You need to be logged in to book a session. Redirecting to login page...");

            // Redirect to login page
            navigate("/login");
            return;
        }

        // User is authenticated, show payment modal
        setShowPaymentModal(true);
        setBookingStep('payment');
    };

    // Handle payment success - Updated to show CalendlyAvailability2
    const handlePaymentSuccess = (paymentIntent) => {
        console.log("Payment successful:", paymentIntent);
        
        // Track the booking
        if (mentor) {
            const bookingData = {
                mentorId: mentor.id,
                paidDateTime: new Date().toISOString(),
                clientEmail: store.currentUserData?.user_data?.email || '',
                amount: parseFloat(mentor.price || 0),
                status: 'paid'
            };

            actions.trackMentorBooking(bookingData)
                .then(bookingResult => {
                    if (bookingResult && bookingResult.id) {
                        console.log("Booking successfully tracked by backend. ID:", bookingResult.id);
                        setBookingId(bookingResult.id);
                    } else {
                        console.warn("Payment was successful, but backend booking tracking did not yield a booking ID.");
                        setBookingId(null);
                    }
                    
                    // Store payment data and move to Calendly step
                    setPaymentIntentData(paymentIntent);
                    setShowPaymentModal(false);
                    setBookingStep('calendly_finalize');
                })
                .catch(error => {
                    console.error("Error tracking booking with backend:", error);
                    alert("Payment was successful, but a critical error occurred while tracking your booking. Please contact support immediately.");
                });
        }
    };

    // Handle payment error
    const handlePaymentError = (error) => {
        console.error("Payment error:", error);
        alert(`Payment error: ${error.message || 'Unknown error'}`);
    };

    // Close payment modal and reset to initial state
    const handleClosePaymentModal = () => {
        setShowPaymentModal(false);
        setBookingStep('initial');
        setPaymentIntentData(null);
        setBookingId(null);
    };

    // Handle payment success from CalendlyAvailability component
    const handleCalendlyPaymentSuccess = (paymentIntent, bookingId, mentor) => {
        console.log("Payment successful from Calendly widget:", paymentIntent);
        
        // Store payment data and move to Calendly finalization step
        setPaymentIntentData(paymentIntent);
        setBookingId(bookingId);
        setBookingStep('calendly_finalize');
    };

    // Handle cancel from CalendlyAvailability component
    const handleCalendlyCancel = () => {
        // Reset to initial state if user cancels from the Calendly widget
        setBookingStep('initial');
    };

    // Handle when user wants to go back from Calendly step
    const handleBackFromCalendly = () => {
        setBookingStep('initial');
        setPaymentIntentData(null);
        setBookingId(null);
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

    // If we're in the Calendly finalization step, show CalendlyAvailability2
    if (bookingStep === 'calendly_finalize') {
        return (
            <div className="container mt-5 mb-5">
                <div className="row">
                    <div className="col-12 mb-4">
                        <button 
                            className="btn btn-outline-secondary"
                            onClick={handleBackFromCalendly}
                        >
                            &larr; Back to Mentor Profile
                        </button>
                    </div>
                </div>
                
                <CalendlyAvailability2 
                    mentor={mentor}
                    paymentIntentData={paymentIntentData}
                    bookingId={bookingId}
                />
            </div>
        );
    }

    return (
        <div className="container mt-5 mb-5">
            <div className="row">
                <div className="col-12 mb-4">
                    <Link to="/mentor-list" className="btn btn-outline-primary">
                        &larr; Back to All Mentors
                    </Link>
                </div>
            </div>

            <div className="card border-secondary shadow border-2">
                <div className="row g-0">
                    {/* Left Column - Mentor Profile Image and Contact */}
                    <div className="col-md-4 border-end">
                        <div className="card-body text-center">
                            <div className="py-4 d-flex flex-column align-items-center">
                                {/* Profile Photo */}
                                <div className="mb-4" style={{ width: "200px", height: "200px" }}>
                                    {mentor.profile_photo ? (
                                        <img
                                            src={mentor.profile_photo.image_url}
                                            alt={`${mentor.first_name} ${mentor.last_name}`}
                                            className="w-100 h-100 rounded-circle shadow"
                                            style={{ objectFit: "cover" }}
                                        />
                                    ) : (
                                        <div
                                            className="w-100 h-100 rounded-circle shadow d-flex justify-content-center align-items-center bg-light"
                                        >
                                            <span className="fs-1 text-secondary">
                                                {mentor.first_name?.charAt(0) || ""}{mentor.last_name?.charAt(0) || ""}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Mentor Name */}
                                <h2 className="fw-bold mb-1">
                                    {mentor.first_name || mentor.last_name ?
                                        `${mentor.first_name} ${mentor.last_name}` :
                                        'Unnamed Mentor'}
                                </h2>

                                {/* Active Status */}
                                {mentor.is_active && (
                                    <span className="badge bg-success mb-3">
                                        Currently Available
                                    </span>
                                )}

                                {/* Location */}
                                <div className="d-flex align-items-center justify-content-center mb-3">
                                    <MapPin size={18} className="me-2 text-primary" />
                                    <span>{mentor.city}, {mentor.what_state}, {mentor.country}</span>
                                </div>

                                {/* Contact Information Section */}
                                <div className="card w-100 mb-4 mt-3">
                                    <div className="card-header bg-light">
                                        <h5 className="mb-0">Contact Information</h5>
                                    </div>
                                    <div className="card-body">
                                        {mentor.email && (
                                            <div className="d-flex align-items-center mb-3">
                                                <Mail size={18} className="me-2 text-primary" />
                                                <span>{mentor.email}</span>
                                            </div>
                                        )}
                                        {mentor.phone && (
                                            <div className="d-flex align-items-center">
                                                <Phone size={18} className="me-2 text-primary" />
                                                <span>{mentor.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Book Now Button */}
                                <button
                                    className="btn btn-primary btn-lg w-100 mb-3"
                                    onClick={handleBookSession}
                                >
                                    Book a Session Now
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Mentor Details */}
                    <div className="col-md-8">
                        <div className="card-body">
                            <h3 className="border-bottom pb-2 mb-4">Mentor Profile</h3>

                            {/* About Section */}
                            <div className="mb-4">
                                <h4 className="d-flex align-items-center mb-3">
                                    <BookOpen size={20} className="me-2 text-primary" />
                                    About Me
                                </h4>
                                <p className="mb-0">{mentor.about_me || "No information provided."}</p>
                            </div>

                            {/* Skills Section */}
                            {mentor.skills && mentor.skills.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="d-flex align-items-center mb-3">
                                        <Award size={20} className="me-2 text-primary" />
                                        Skills & Expertise
                                    </h4>
                                    <div className="d-flex flex-wrap gap-2">
                                        {mentor.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="badge bg-primary py-2 px-3 fs-6"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Experience Section */}
                            <div className="mb-4">
                                <h4 className="d-flex align-items-center mb-3">
                                    <Calendar size={20} className="me-2 text-primary" />
                                    Experience
                                </h4>
                                <p>
                                    <strong>Years of Experience:</strong> {mentor.years_exp || "Not specified"}
                                </p>
                            </div>

                            {/* Availability Section */}
                            <div className="mb-4">
                                <h4 className="d-flex align-items-center mb-3">
                                    <Clock size={20} className="me-2 text-primary" />
                                    Availability
                                </h4>

                                {mentor.days && mentor.days.length > 0 ? (
                                    <div>
                                        <p className="mb-2"><strong>Available Days:</strong></p>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            {mentor.days.map((day, index) => (
                                                <span
                                                    key={index}
                                                    className="badge bg-secondary py-2 px-3 fs-6"
                                                >
                                                    {day}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p>Availability not specified.</p>
                                )}
                            </div>

                            {/* Session Details Section */}
                            <div className="mb-4">
                                <h4 className="d-flex align-items-center mb-3">
                                    <DollarSign size={20} className="me-2 text-primary" />
                                    Session Details
                                </h4>

                                {mentor.price && mentor.price !== "None" ? (
                                    <div className="card bg-light">
                                        <div className="card-body">
                                            <h5 className="card-title">Standard Session</h5>
                                            <p className="card-text mb-2">
                                                <strong>Price:</strong> ${mentor.price}
                                            </p>
                                            <p className="card-text">
                                                <strong>Duration:</strong> {mentor.session_duration || "60"} minutes
                                            </p>
                                            <button
                                                className="btn btn-outline-primary mt-2"
                                                onClick={handleBookSession}
                                            >
                                                Book This Session
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p>Session pricing not available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendly Availability Section - Show with callbacks for inline payment flow */}
            {bookingStep === 'initial' && mentor && mentor.calendly_url && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card border-secondary shadow border-2">
                            <div className="card-header bg-primary text-white">
                                <h3 className="mb-0">Schedule a Session with {mentor.first_name}</h3>
                            </div>
                            <div className="card-body p-0">
                                <CalendlyAvailability 
                                    mentor={mentor} 
                                    onPaymentSuccess={handleCalendlyPaymentSuccess}
                                    onCancel={handleCalendlyCancel}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && bookingStep === 'payment' && (
                <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Book a Session with {mentor.first_name}</h5>
                                <button type="button" className="btn-close" onClick={handleClosePaymentModal}></button>
                            </div>
                            <div className="modal-body">
                                <StripePaymentComponent
                                    customerId={store.currentUserData?.user_data?.id?.toString()}
                                    customerName={`${store.currentUserData?.user_data?.first_name || ''} ${store.currentUserData?.user_data?.last_name || ''}`}
                                    mentorId={mentor.id.toString()}
                                    mentorName={`${mentor.first_name} ${mentor.last_name}`}
                                    amount={parseFloat(mentor.price || 0)}
                                    onPaymentSuccess={handlePaymentSuccess}
                                    onPaymentError={handlePaymentError}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleClosePaymentModal}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};