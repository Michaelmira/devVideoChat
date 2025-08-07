import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
// import "../../styles/navbar.css";

export const Navbar = () => {
	const { store, actions } = useContext(Context);
	const navigate = useNavigate();

	const handleLogout = () => {
		actions.logOut();
		navigate("/");
	};

	return (
		<nav className="navbar navbar-expand-lg bg-black">
  <div className="container-fluid px-5 d-flex justify-content-between align-items-center">
    
    {/* Brand */}
    <Link
      to="/"
      className="navbar-brand d-flex align-items-center text-decoration-none"
    >
      <div className="brand-icon me-2">
        <i
          className="fas fa-video"
          style={{ color: "#ec4432", fontSize: "1.5rem" }}
        ></i>
      </div>
      <span className="brand-text fw-bold text-white">GuildMeet</span>
    </Link>

    {/* Right side content */}
    <div className="d-flex align-items-center">
      {store.isLoggedIn ? (
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center">
            <div className="user-avatar me-2">
              <i
                className="fas fa-user-circle navbar__icon_red"
                style={{ fontSize: "1.5rem", color: "#fff" }}
              ></i>
            </div>
            <div className="user-info">
              <small className="text-white">
                {store.currentUserData?.user_data?.first_name || "User"}
              </small>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
            onMouseEnter={e => {
            e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
            e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseLeave={e => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)"
            }}
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt me-1"></i>
            Logout
          </button>
        </div>
      ) : (
        <Link
          to="/"
          className="btn btn-primary btn-sm"
          style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
          onMouseEnter={e => {
          e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
          e.currentTarget.style.transform = "translateY(-1px)"
          }}
          onMouseLeave={e => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)"
          }}
        >
          <i className="fas fa-sign-in-alt me-1"></i>
          Get Started
        </Link>
      )}
    </div>
  </div>
</nav>

	);
};
