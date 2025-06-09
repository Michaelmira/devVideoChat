import React, { useState, useEffect, useContext } from 'react';
import { Context } from "../store/appContext";
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export const BookingCalendar = ({ mentorId, onSelectSlot }) => {
    const { store } = useContext(Context);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [timezone, setTimezone] = useState('America/Los_Angeles');

    useEffect(() => {
        fetchAvailableSlots();
    }, [mentorId, selectedDate]);

    const fetchAvailableSlots = async () => {
        try {
            const startDate = moment(selectedDate).startOf('month').format('YYYY-MM-DD');
            const endDate = moment(selectedDate).endOf('month').format('YYYY-MM-DD');

            const response = await fetch(
                `${process.env.BACKEND_URL}/api/mentor/${mentorId}/available-slots?` +
                new URLSearchParams({
                    start_date: startDate,
                    end_date: endDate
                }),
                {
                    headers: {
                        'Authorization': 'Bearer ' + store.token
                    }
                }
            );
            const data = await response.json();

            if (response.ok) {
                setAvailableSlots(data.available_slots.map(slot => ({
                    title: 'Available',
                    start: new Date(slot.start_time),
                    end: new Date(slot.end_time),
                    duration: slot.duration,
                    resource: slot
                })));
                setTimezone(data.timezone);
            } else {
                setError(data.msg || 'Failed to load available slots');
            }
        } catch (err) {
            setError('Error loading available slots');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (date) => {
        setSelectedDate(date);
    };

    const handleSelectSlot = (slotInfo) => {
        // Find the available slot that matches this selection
        const selectedSlot = availableSlots.find(slot =>
            moment(slot.start).isSame(slotInfo.start) &&
            moment(slot.end).isSame(slotInfo.end)
        );

        if (selectedSlot) {
            onSelectSlot(selectedSlot.resource);
        }
    };

    if (loading) {
        return <div className="text-center">Loading available slots...</div>;
    }

    return (
        <Container>
            {error && <Alert variant="danger">{error}</Alert>}

            <Card>
                <Card.Header>
                    <h3 className="h5 mb-0">Available Time Slots</h3>
                    <small className="text-muted">Timezone: {timezone}</small>
                </Card.Header>
                <Card.Body>
                    <div style={{ height: '500px' }}>
                        <Calendar
                            localizer={localizer}
                            events={availableSlots}
                            startAccessor="start"
                            endAccessor="end"
                            selectable
                            onSelectSlot={handleSelectSlot}
                            onNavigate={handleNavigate}
                            defaultView="week"
                            views={['week', 'month']}
                            step={30}
                            timeslots={2}
                            min={moment().startOf('day').toDate()}
                            max={moment().endOf('day').toDate()}
                            formats={{
                                timeGutterFormat: 'HH:mm',
                                eventTimeRangeFormat: ({ start, end }) => {
                                    return `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`;
                                }
                            }}
                        />
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}; 