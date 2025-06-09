import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';

const daysOfWeek = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' }
];

const timezones = [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney'
];

export const MentorAvailabilitySettings = () => {
    const { store, actions } = useContext(Context);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [availabilities, setAvailabilities] = useState([]);
    const [settings, setSettings] = useState({
        session_duration: 60,
        buffer_time: 15,
        advance_booking_days: 30,
        minimum_notice_hours: 24,
        timezone: 'America/Los_Angeles'
    });
    const [unavailabilities, setUnavailabilities] = useState([]);

    // New unavailability period form
    const [newUnavailability, setNewUnavailability] = useState({
        start_datetime: '',
        end_datetime: '',
        reason: ''
    });

    useEffect(() => {
        fetchAvailabilityData();
    }, []);

    const fetchAvailabilityData = async () => {
        try {
            const response = await fetch(process.env.BACKEND_URL + '/api/mentor/availability', {
                headers: {
                    'Authorization': 'Bearer ' + store.token
                }
            });
            const data = await response.json();

            if (response.ok) {
                setAvailabilities(data.availabilities || []);
                setSettings(data.settings || {});
                setUnavailabilities(data.unavailabilities || []);
            } else {
                setError(data.msg || 'Failed to load availability settings');
            }
        } catch (err) {
            setError('Error loading availability settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAvailability = () => {
        setAvailabilities([
            ...availabilities,
            {
                day_of_week: 0,
                start_time: '09:00',
                end_time: '17:00',
                timezone: settings.timezone
            }
        ]);
    };

    const handleRemoveAvailability = (index) => {
        setAvailabilities(availabilities.filter((_, i) => i !== index));
    };

    const handleAvailabilityChange = (index, field, value) => {
        const newAvailabilities = [...availabilities];
        newAvailabilities[index] = {
            ...newAvailabilities[index],
            [field]: value
        };
        setAvailabilities(newAvailabilities);
    };

    const handleSettingsChange = (field, value) => {
        setSettings({
            ...settings,
            [field]: value
        });
    };

    const handleAddUnavailability = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(process.env.BACKEND_URL + '/api/mentor/unavailability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + store.token
                },
                body: JSON.stringify(newUnavailability)
            });
            const data = await response.json();

            if (response.ok) {
                setUnavailabilities([...unavailabilities, data.period]);
                setNewUnavailability({
                    start_datetime: '',
                    end_datetime: '',
                    reason: ''
                });
                setSuccess('Unavailability period added successfully');
            } else {
                setError(data.msg || 'Failed to add unavailability period');
            }
        } catch (err) {
            setError('Error adding unavailability period');
            console.error(err);
        }
    };

    const handleDeleteUnavailability = async (periodId) => {
        try {
            const response = await fetch(process.env.BACKEND_URL + `/api/mentor/unavailability/${periodId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + store.token
                }
            });

            if (response.ok) {
                setUnavailabilities(unavailabilities.filter(period => period.id !== periodId));
                setSuccess('Unavailability period deleted successfully');
            } else {
                const data = await response.json();
                setError(data.msg || 'Failed to delete unavailability period');
            }
        } catch (err) {
            setError('Error deleting unavailability period');
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(process.env.BACKEND_URL + '/api/mentor/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + store.token
                },
                body: JSON.stringify({
                    availabilities,
                    ...settings
                })
            });
            const data = await response.json();

            if (response.ok) {
                setSuccess('Availability settings updated successfully');
            } else {
                setError(data.msg || 'Failed to update availability settings');
            }
        } catch (err) {
            setError('Error updating availability settings');
            console.error(err);
        }
    };

    if (loading) {
        return <div className="text-center">Loading...</div>;
    }

    return (
        <div className="container">
            <h2 className="mb-4">Availability Settings</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
                <div className="card mb-4">
                    <div className="card-header">
                        <h3 className="h5 mb-0">Calendar Settings</h3>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Session Duration (minutes)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.session_duration}
                                        onChange={(e) => handleSettingsChange('session_duration', parseInt(e.target.value))}
                                        min="15"
                                        max="240"
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Buffer Time (minutes)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.buffer_time}
                                        onChange={(e) => handleSettingsChange('buffer_time', parseInt(e.target.value))}
                                        min="0"
                                        max="60"
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Advance Booking Days</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.advance_booking_days}
                                        onChange={(e) => handleSettingsChange('advance_booking_days', parseInt(e.target.value))}
                                        min="1"
                                        max="90"
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Minimum Notice Hours</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.minimum_notice_hours}
                                        onChange={(e) => handleSettingsChange('minimum_notice_hours', parseInt(e.target.value))}
                                        min="1"
                                        max="72"
                                    />
                                </div>
                            </div>
                            <div className="col-md-12">
                                <div className="mb-3">
                                    <label className="form-label">Timezone</label>
                                    <select
                                        className="form-select"
                                        value={settings.timezone}
                                        onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h3 className="h5 mb-0">Weekly Availability</h3>
                        <button type="button" className="btn btn-primary btn-sm" onClick={handleAddAvailability}>
                            Add Time Slot
                        </button>
                    </div>
                    <div className="card-body">
                        {availabilities.map((availability, index) => (
                            <div key={index} className="row mb-3 align-items-end">
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label">Day</label>
                                        <select
                                            className="form-select"
                                            value={availability.day_of_week}
                                            onChange={(e) => handleAvailabilityChange(index, 'day_of_week', parseInt(e.target.value))}
                                        >
                                            {daysOfWeek.map(day => (
                                                <option key={day.id} value={day.id}>{day.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label">Start Time</label>
                                        <TimePicker
                                            value={availability.start_time}
                                            onChange={(value) => handleAvailabilityChange(index, 'start_time', value)}
                                            disableClock
                                            format="HH:mm"
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="mb-3">
                                        <label className="form-label">End Time</label>
                                        <TimePicker
                                            value={availability.end_time}
                                            onChange={(value) => handleAvailabilityChange(index, 'end_time', value)}
                                            disableClock
                                            format="HH:mm"
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm mt-2"
                                        onClick={() => handleRemoveAvailability(index)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-header">
                        <h3 className="h5 mb-0">Unavailability Periods</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleAddUnavailability}>
                            <div className="row mb-3">
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label">Start Date/Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={newUnavailability.start_datetime}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                start_datetime: e.target.value
                                            })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label">End Date/Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control"
                                            value={newUnavailability.end_datetime}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                end_datetime: e.target.value
                                            })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <label className="form-label">Reason</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={newUnavailability.reason}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                reason: e.target.value
                                            })}
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary btn-sm">
                                Add Unavailability Period
                            </button>
                        </form>

                        <div className="mt-4">
                            {unavailabilities.map((period) => (
                                <div key={period.id} className="border-bottom py-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>
                                                {new Date(period.start_datetime).toLocaleString()} - {new Date(period.end_datetime).toLocaleString()}
                                            </strong>
                                            {period.reason && <div className="text-muted">{period.reason}</div>}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteUnavailability(period.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-primary btn-lg">
                        Save All Settings
                    </button>
                </div>
            </form>
        </div>
    );
}; 