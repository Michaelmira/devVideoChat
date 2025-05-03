// CalendlyAvailability.js - Fixed version
import React, { useState, useEffect, useContext } from 'react';
import { InlineWidget } from 'react-calendly';
import { Context } from "../store/appContext";
import { useParams } from 'react-router-dom';

const CalendlyAvailability = ({ mentorId, mentor }) => {
  const { store, actions } = useContext(Context);
  const { theid } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(mentor);
  
  useEffect(() => {
    // If mentor object is directly passed, use it
    if (mentor) {
      setCurrentMentor(mentor);
      return;
    }
    
    // Otherwise, get mentor ID from props or params
    const targetMentorId = mentorId || theid;
    
    // Find mentor in store if available
    if (store.mentors.length > 0) {
      const foundMentor = store.mentors.find(m => m.id.toString() === targetMentorId?.toString());
      if (foundMentor) {
        setCurrentMentor(foundMentor);
      }
    } else if (targetMentorId) {
      // If not in store, fetch it
      actions.getMentorById(targetMentorId).then(data => {
        if (data) setCurrentMentor(data);
      });
    }
  }, [mentor, mentorId, theid, store.mentors, actions]);
  
  // Check if we have a valid Calendly URL
  const calendlyUrl = currentMentor?.calendly_url;
  const isValidUrl = calendlyUrl && 
                     typeof calendlyUrl === 'string' && 
                     calendlyUrl.trim() !== '' && 
                     calendlyUrl.includes('calendly.com');
  
  // Widget styling - ensure full visibility
  const styles = {
    height: '700px',
    minWidth: '320px'
  };
  
  // Optional prefill with mentor's info if available
  const prefill = {
    email: "", // Leave empty to let users enter their own
    name: ""   // Don't prefill name to avoid conflicts
  };
  
  // UTM parameters for tracking
  const utm = {
    utmSource: "mentor_platform",
    utmMedium: "scheduling_page",
    utmCampaign: "mentorship_booking"
  };
  
  // This is the critical fix - proper loading state management
  useEffect(() => {
    if (isValidUrl) {
      // Set a timeout to ensure loading state is cleared even if callbacks fail
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500); // Force loading to end after 2.5 seconds
      
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [isValidUrl, calendlyUrl]);
  
  const handleCalendlyLoad = () => {
    setIsLoading(false);
  };
  
  const handleCalendlyError = () => {
    setIsLoading(false);
    setHasError(true);
  };
  
  return (
    <div className="calendly-container">
      {!currentMentor && (
        <div className="alert alert-info">
          Loading mentor information...
        </div>
      )}
      
      {currentMentor && !isValidUrl && (
        <div className="alert alert-warning">
          <p><strong>No scheduling link available</strong></p>
          <p>This mentor hasn't set up their availability calendar yet. Please contact them directly to arrange a session.</p>
          {currentMentor.email && (
            <p><strong>Contact:</strong> {currentMentor.email}</p>
          )}
        </div>
      )}
      
      {isValidUrl && (
        <>
          {isLoading && (
            <div className="d-flex justify-content-center my-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading Calendly...</span>
              </div>
            </div>
          )}
          
          {/* Critical fix: always show at full opacity */}
          <div style={{ opacity: 1 }}>
            <InlineWidget 
              url={calendlyUrl}
              styles={styles}
              prefill={prefill}
              utm={utm}
              onLoad={handleCalendlyLoad}
              onError={handleCalendlyError}
            />
          </div>
        </>
      )}
      
      {hasError && (
        <div className="alert alert-danger mt-3">
          <p><strong>Error loading calendar</strong></p>
          <p>There was a problem loading the scheduling calendar. Please try again later or contact the mentor directly.</p>
        </div>
      )}
    </div>
  );
};

export default CalendlyAvailability;