// MentorDetails.js 

import React, { useEffect, useContext, useState } from "react";
import { Context } from "../store/appContext";
import { MapPin, Mail, Phone, Calendar, Clock, DollarSign, Award, BookOpen } from 'lucide-react';
import { useParams, Link, useNavigate } from "react-router-dom";
import CalendlyAvailability from "../component/CalendlyAvailability";

export const MentorDetails = () => {
    const { store, actions } = useContext(Context);
    const { theid } = useParams();
    const navigate = useNavigate();
    const [mentor, setMentor] = useState(null);
    const [loading, setLoading] = useState(true);

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
        // Navigate to booking page or open booking modal
        navigate(`/customer-stripe-pay/${theid}`);
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
                                {/* Add additional experience details here if available */}
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

                                {/* Add time slots here if available */}
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

            {/* Calendly Availability Section */}
            {mentor && mentor.calendly_url && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card border-secondary shadow border-2">
                            <div className="card-header bg-primary text-white">
                                <h3 className="mb-0">Schedule a Session with {mentor.first_name}</h3>
                            </div>
                            <div className="card-body p-0">
                                {/* Key fixes: don't wrap in another container that might affect styling */}
                                <CalendlyAvailability mentor={mentor} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};