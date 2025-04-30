import React, { useContext } from "react";
import { Context } from "../store/appContext";
import CalendlyAvailability from "../component/CalendlyAvailability";
import { MentorAvailability } from "../component/MentorAvailability";



export const MentorDashboard = () => {
	const { store, actions } = useContext(Context);

	return (

		<>
			<h1 className="text-center mt-5">MENTOR DASHBOARD</h1>

            <h1 className="text-center mt-5">Calendly Availability</h1>
            <CalendlyAvailability />

            <h1 className="text-center mt-5">Mentor Availability</h1>
            <MentorAvailability /> 

		</>
	);
};
