import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";

import { Home } from "./pages/home";

import { Single } from "./pages/single";
import injectContext from "./store/appContext";

import { Navbar } from "./component/Navbar";
import { Footer } from "./component/footer";

import { MentorList } from "./pages/mentorList";
import { MentorDashboard } from "./pages/MentorDashboard";
import { MentorProfile } from "./pages/MentorProfile";
import { StripePaymentExample } from "./pages/StripePaymentExample";
import { MentorDetails } from "./pages/MentorDetails";


//create your first component
const Layout = () => {
    //the basename is used when your project is published in a subdirectory and not in the root of the domain
    // you can set the basename on the .env file located at the root of this project, E.g: BASENAME=/react-hello-webapp/
    const basename = process.env.BASENAME || "";

    if (!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

    return (
        <div>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <Navbar />
                    <Routes>
                        <Route element={<Home />} path="/" />
                        <Route element={<MentorProfile />} path="/mentor-profile" />
                        <Route element={<Single />} path="/single/:theid" />
                        <Route element={<h1>Not found!</h1>} />
                        <Route element={<MentorList />} path="/mentor-list" />
                        <Route element={<MentorDashboard />} path="/mentor-dashboard" />
                        <Route element={<MentorDetails />} path="/mentor-details/:theid" />
                        <Route element={<StripePaymentExample />} path="/customer-stripe-pay/" />
                    </Routes>
                    <Footer />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};

export default injectContext(Layout);
