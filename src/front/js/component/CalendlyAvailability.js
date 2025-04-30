// CalendlyAvailability.js
import React, { useState, useEffect } from 'react';
import { InlineWidget } from 'react-calendly';

// ==========================================
// CONFIGURATION - Edit these values as needed
// ==========================================
const CALENDLY_CONFIG = {
  // Your Calendly URL - Replace with your actual Calendly link
  url: "https://calendly.com/michaelmirisciotta",
  
  // Widget options
  styles: {
    height: '650px',
    minWidth: '320px'
  },
  
  // Optional prefill information for the booking form
  prefill: {
    email: "", // Leave empty to let users enter their own
    firstName: "",
    lastName: "",
    name: ""
  },
  
  // Optional UTM parameters for tracking
  utm: {
    utmSource: "your_website",
    utmMedium: "scheduling_page",
    utmCampaign: "availability_page"
  }
};
// ==========================================

const CalendlyAvailability = ({ 
  // Optional props that can override the config
  url = CALENDLY_CONFIG.url,
  styles = CALENDLY_CONFIG.styles,
  prefill = CALENDLY_CONFIG.prefill,
  utm = CALENDLY_CONFIG.utm
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Validate the URL format to prevent the error
  const isValidUrl = url && 
                     typeof url === 'string' && 
                     url.trim() !== '' && 
                     url.includes('calendly.com');
  
  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setHasError(false);
  }, [url]);
  
  const handleCalendlyLoad = () => {
    setIsLoading(false);
  };
  
  const handleCalendlyError = () => {
    setIsLoading(false);
    setHasError(true);
  };
  
  return (
    <div className="calendly-container">
      <h2 className="availability-title">Set Your Availability</h2>
      
      {isValidUrl ? (
        <>
          {isLoading && (
            <div className="loading-indicator">
              <p>Loading Calendly...</p>
            </div>
          )}
          
          <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s' }}>
            <InlineWidget 
              url={url}
              styles={styles}
              prefill={prefill}
              utm={utm}
              onLoad={handleCalendlyLoad}
              onError={handleCalendlyError}
            />
          </div>
        </>
      ) : (
        <div className="error-message" style={{ 
          padding: '20px', 
          border: '1px solid #f8d7da', 
          borderRadius: '4px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24' 
        }}>
          <p><strong>Invalid Calendly URL</strong></p>
          <p>Please edit the CALENDLY_CONFIG at the top of the CalendlyAvailability.js file with your valid Calendly URL.</p>
          <p>Example: https://calendly.com/your-username</p>
        </div>
      )}
      
      {hasError && (
        <div className="error-message" style={{ 
          marginTop: '10px',
          padding: '20px', 
          border: '1px solid #f8d7da', 
          borderRadius: '4px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24' 
        }}>
          <p><strong>Error loading Calendly</strong></p>
          <p>There was a problem loading your Calendly widget. Please verify your URL is correct.</p>
        </div>
      )}
    </div>
  );
};

export default CalendlyAvailability;