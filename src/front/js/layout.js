import React, { useEffect, useContext } from "react";
import { Context } from "./store/appContext";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./component/scrollToTop";
import { BackendURL } from "./component/backendURL";

import { Home } from "./pages/home";
import { Dashboard } from "./pages/Dashboard";
import { JoinSession } from "./pages/JoinSession";
import { VideoMeetingPage } from "./pages/VideoMeetingPage";

import injectContext from "./store/appContext";

import { Navbar } from "./component/Navbar";
import { Footer } from "./component/footer";


//create your first component
const Layout = () => {
    //the basename is used when your project is published in a subdirectory and not in the root of the domain
    // you can set the basename on the .env file located at the root of this project, E.g: BASENAME=/react-hello-webapp/
    const basename = process.env.BASENAME || "";

    if (!process.env.BACKEND_URL || process.env.BACKEND_URL == "") return <BackendURL />;

    const { store, actions } = useContext(Context);

    //useEffect to handle token exp. instances
    useEffect(() => {
        // Check and validate token on mount
        const validateToken = async () => {
            const token = store.token || sessionStorage.getItem("token");
            if (token) {
                console.log("Validating token...");
                const isValid = await actions.getCurrentUser();
                if (!isValid) {
                    console.log("Token validation failed, logging out...");
                    actions.logOut();
                }
            } else {
                console.log("No token found");
            }
        };

        validateToken();

        const interval = setInterval(() => {
            if (store.token) {
                actions.getCurrentUser();
            } else {
                // Handle no token case
                console.log('User not authenticated');
            }
        }, 60000);

        // Cleanup function
        return () => clearInterval(interval);
    }, [store.token]);

    return (
        <div>
            <BrowserRouter basename={basename}>
                <ScrollToTop>
                    <Navbar />
                    <Routes>
                        {/* SIMPLIFIED VIDEO CHAT ROUTES */}
                        <Route element={<Home />} path="/" />  {/* Landing page with MVP login */}
                        <Route element={<Dashboard />} path="/dashboard" />  {/* Logged-in users */}
                        <Route element={<JoinSession />} path="/join/:meetingId" />  {/* Public joining */}
                        <Route element={<VideoMeetingPage />} path="/video-meeting/:meetingId" />  {/* Video meeting */}

                        <Route element={<h1>Not found!</h1>} path="*" />
                    </Routes>
                    <Footer />
                </ScrollToTop>
            </BrowserRouter>
        </div>
    );
};

export default injectContext(Layout);
