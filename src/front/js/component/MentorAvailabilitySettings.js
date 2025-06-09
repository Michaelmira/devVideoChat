import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
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
        <Container>
            <h2 className="mb-4">Availability Settings</h2>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Card className="mb-4">
                    <Card.Header>
                        <h3 className="h5 mb-0">Calendar Settings</h3>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Session Duration (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={settings.session_duration}
                                        onChange={(e) => handleSettingsChange('session_duration', parseInt(e.target.value))}
                                        min="15"
                                        max="240"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Buffer Time (minutes)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={settings.buffer_time}
                                        onChange={(e) => handleSettingsChange('buffer_time', parseInt(e.target.value))}
                                        min="0"
                                        max="60"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Advance Booking Days</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={settings.advance_booking_days}
                                        onChange={(e) => handleSettingsChange('advance_booking_days', parseInt(e.target.value))}
                                        min="1"
                                        max="90"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Minimum Notice Hours</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={settings.minimum_notice_hours}
                                        onChange={(e) => handleSettingsChange('minimum_notice_hours', parseInt(e.target.value))}
                                        min="1"
                                        max="72"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Timezone</Form.Label>
                                    <Form.Select
                                        value={settings.timezone}
                                        onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                                    >
                                        {timezones.map(tz => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="mb-4">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <h3 className="h5 mb-0">Weekly Availability</h3>
                        <Button variant="primary" size="sm" onClick={handleAddAvailability}>
                            Add Time Slot
                        </Button>
                    </Card.Header>
                    <Card.Body>
                        {availabilities.map((availability, index) => (
                            <Row key={index} className="mb-3 align-items-end">
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Day</Form.Label>
                                        <Form.Select
                                            value={availability.day_of_week}
                                            onChange={(e) => handleAvailabilityChange(index, 'day_of_week', parseInt(e.target.value))}
                                        >
                                            {daysOfWeek.map(day => (
                                                <option key={day.id} value={day.id}>{day.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Start Time</Form.Label>
                                        <TimePicker
                                            value={availability.start_time}
                                            onChange={(value) => handleAvailabilityChange(index, 'start_time', value)}
                                            disableClock
                                            format="HH:mm"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>End Time</Form.Label>
                                        <TimePicker
                                            value={availability.end_time}
                                            onChange={(value) => handleAvailabilityChange(index, 'end_time', value)}
                                            disableClock
                                            format="HH:mm"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleRemoveAvailability(index)}
                                        className="mt-2"
                                    >
                                        Remove
                                    </Button>
                                </Col>
                            </Row>
                        ))}
                    </Card.Body>
                </Card>

                <Card className="mb-4">
                    <Card.Header>
                        <h3 className="h5 mb-0">Unavailability Periods</h3>
                    </Card.Header>
                    <Card.Body>
                        <Form onSubmit={handleAddUnavailability}>
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Start Date/Time</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={newUnavailability.start_datetime}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                start_datetime: e.target.value
                                            })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>End Date/Time</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={newUnavailability.end_datetime}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                end_datetime: e.target.value
                                            })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Reason</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={newUnavailability.reason}
                                            onChange={(e) => setNewUnavailability({
                                                ...newUnavailability,
                                                reason: e.target.value
                                            })}
                                            placeholder="Optional"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button type="submit" variant="primary" size="sm">
                                Add Unavailability Period
                            </Button>
                        </Form>

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
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDeleteUnavailability(period.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card.Body>
                </Card>

                <div className="d-grid gap-2">
                    <Button type="submit" variant="primary" size="lg">
                        Save All Settings
                    </Button>
                </div>
            </Form>
        </Container>
    );
}; 