import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import PropTypes from 'prop-types';
import './BookingCalendarWidget.css';

const BookingCalendarWidget = ({ mentorId, mentorName, onSelectSlot, backendUrl }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timezone, setTimezone] = useState('America/Los_Angeles');

    useEffect(() => {
        fetchAvailableSlots();
    }, [currentDate, mentorId]);

    const fetchAvailableSlots = async () => {
        setLoading(true);
        setError(null);
        try {
            const startDate = startOfMonth(currentDate);
            const endDate = endOfMonth(currentDate);

            const response = await fetch(
                `${backendUrl || process.env.BACKEND_URL}/api/mentor/${mentorId}/available-slots?` +
                `start_date=${startDate.toISOString().split('T')[0]}&` +
                `end_date=${endDate.toISOString().split('T')[0]}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    // Mentor hasn't configured availability
                    setError('This mentor has not yet set up their availability. Please check back later or contact the mentor directly.');
                    setAvailableSlots([]);
                    return;
                }
                throw new Error(`Failed to fetch available slots: ${response.status}`);
            }

            const data = await response.json();
            setAvailableSlots(data.available_slots);
            setTimezone(data.timezone);
        } catch (err) {
            setError('Failed to load available time slots. Please try again later.');
            console.error('Error fetching slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentDate(subMonths(currentDate, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1));
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
    };

    const handleSlotSelect = (slot) => {
        onSelectSlot(slot);
    };

    const getDaysInMonth = () => {
        return eachDayOfInterval({
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        });
    };

    const getAvailableSlotsForDate = (date) => {
        return availableSlots.filter(slot => {
            const slotDate = new Date(slot.start_time);
            return isSameDay(slotDate, date);
        });
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-4">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div className="booking-calendar">
            {/* Month Navigation */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <button
                    className="btn btn-outline-primary"
                    onClick={handlePreviousMonth}
                    disabled={loading}
                >
                    &larr; Previous Month
                </button>
                <h4 className="mb-0">{format(currentDate, 'MMMM yyyy')}</h4>
                <button
                    className="btn btn-outline-primary"
                    onClick={handleNextMonth}
                    disabled={loading}
                >
                    Next Month &rarr;
                </button>
            </div>

            {/* Show message if no slots are available */}
            {!loading && availableSlots.length === 0 && !error && (
                <div className="alert alert-info" role="alert">
                    <h5 className="alert-heading">No Available Time Slots</h5>
                    <p>This mentor hasn't set up any available time slots for {format(currentDate, 'MMMM yyyy')}.</p>
                    <hr />
                    <p className="mb-0">Try checking other months or contact the mentor directly.</p>
                </div>
            )}

            {/* Calendar Grid */}
            {availableSlots.length > 0 && (
                <>
                    <div className="calendar-grid mb-4">
                        {/* Weekday Headers */}
                        <div className="row mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="col text-center">
                                    <small className="text-muted">{day}</small>
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="calendar-days">
                            {getDaysInMonth().map((date, index) => {
                                const daySlots = getAvailableSlotsForDate(date);
                                const isSelected = selectedDate && isSameDay(date, selectedDate);
                                const hasSlots = daySlots.length > 0;

                                return (
                                    <div
                                        key={date.toISOString()}
                                        className={`calendar-day ${isSelected ? 'selected' : ''} ${hasSlots ? 'has-slots' : ''}`}
                                        onClick={() => hasSlots && handleDateClick(date)}
                                        style={{ cursor: hasSlots ? 'pointer' : 'default' }}
                                    >
                                        <span className="day-number">{format(date, 'd')}</span>
                                        {hasSlots && (
                                            <small className="slot-count">
                                                {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                                            </small>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Slots */}
                    {selectedDate && (
                        <div className="time-slots">
                            <h5 className="mb-3">
                                Available Times for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </h5>
                            <div className="row g-2">
                                {getAvailableSlotsForDate(selectedDate).map((slot, index) => {
                                    const startTime = utcToZonedTime(new Date(slot.start_time), timezone);
                                    const endTime = utcToZonedTime(new Date(slot.end_time), timezone);

                                    return (
                                        <div key={index} className="col-md-4">
                                            <button
                                                className="btn btn-outline-primary w-100"
                                                onClick={() => handleSlotSelect(slot)}
                                            >
                                                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                                            </button>
                                        </div>
                                    );
                                })}
                                {getAvailableSlotsForDate(selectedDate).length === 0 && (
                                    <p className="text-muted">No available slots for this date.</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

BookingCalendarWidget.propTypes = {
    mentorId: PropTypes.number.isRequired,
    mentorName: PropTypes.string.isRequired,
    onSelectSlot: PropTypes.func.isRequired,
    backendUrl: PropTypes.string
};

export default BookingCalendarWidget;