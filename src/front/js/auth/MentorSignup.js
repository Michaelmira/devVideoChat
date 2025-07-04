// MentorSignup.js

import React, { useContext, useState } from "react";
import { Context } from "../store/appContext";
import PhoneInput from 'react-phone-input-2'
import { ValidateEmail, ValidateFirstName, ValidateLastName, ValidatePassword, ValidateCity, ValidatePhone, ValidateWhatState, ValidateCountry } from "../component/Validators";
import Select from 'react-select';
import CreatableSelect from "react-select/creatable";
import { stateOptions, countryOptions } from "../store/data";


export const MentorSignup = ({ switchToLogin, onSignupSuccess }) => {
    const { actions } = useContext(Context);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [first_name, setFirst_name] = useState("");
    const [last_name, setLast_name] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [what_state, setWhat_state] = useState("");
    const [country, setCountry] = useState("");
    const [countryCode, setCountryCode] = useState("us");
    const [invalidItems, setInvalidItems] = useState([]);

    const handleSignup = async (e) => {
        if (e) e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setInvalidItems([]);
        let isEmailValid = ValidateEmail(email, setInvalidItems);
        let isFirstNameValid = ValidateFirstName(first_name, setInvalidItems);
        let isLastNameValid = ValidateLastName(last_name, setInvalidItems);
        let isPasswordValid = ValidatePassword(password, setInvalidItems);
        let isCityValid = ValidateCity(city, setInvalidItems);
        let isWhatStateValid = ValidateWhatState(what_state, setInvalidItems);
        let isCountryValid = ValidateCountry(country, setInvalidItems);
        let isPhoneValid = ValidatePhone(phone, countryCode, setInvalidItems);

        if (isEmailValid && isFirstNameValid && isLastNameValid && isPasswordValid && isCityValid && isWhatStateValid && isCountryValid && isPhoneValid) {
            const formData = {
                email, password, first_name, last_name, phone, city, what_state, country
            };
            const result = await actions.signUpMentor(formData);
            if (result.success) {
                onSignupSuccess(formData.email);
            } else {
                alert(result.message || "Signup failed. Please try again.");
            }
        }
    }

    const handleCountryChange = (selectedOption) => {
        setCountry(selectedOption ? selectedOption.label : '');
    };

    const handleStateChange = (selectedOption) => {
        setWhat_state(selectedOption ? selectedOption.value : '');
    };

    const handlePhoneChange = (value, countryData) => {
        setPhone(value);
        setCountryCode(countryData?.countryCode || "us");

        // comment out the bottom 4 lines if you do not want to see the phone error before form submission
        // const isPhoneValid = ValidatePhone(value, countryCode, setInvalidItems);
        // if (isPhoneValid) {
        //     setInvalidItems(prevInvalidItems => prevInvalidItems.filter(item => item !== "phone"));
        // }
    };


    return (

        <form onSubmit={handleSignup}>
            <div className="row justify-content-center authDiv">
                <div className="col-12 text-light" >
                    <h2 className="text-center mt-2 mb-4">Welcome Mentors!</h2>

                    <div className="mb-3">
                        <input
                            type="text"
                            className={`form-control bg-dark text-light ${invalidItems.includes("email") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("email") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                        {invalidItems.includes("email") && (
                            <div className="invalid-feedback d-block" style={{
                                textAlign: 'left',
                                marginTop: '0.25rem',
                                marginBottom: '0',
                                color: '#dc3545'
                            }}>
                                Invalid email format (e.g.: example@domain.com)
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <input
                            type="password"
                            className={`form-control bg-dark text-light ${invalidItems.includes("password") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("password") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        {invalidItems.includes("password") &&
                            <div className="invalid-feedback">Password must be 5-20 characters.</div>
                        }
                    </div>

                    <div className="mb-3">
                        <input
                            type="password"
                            className={`form-control bg-dark text-light ${invalidItems.includes("password") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("password") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                        />
                        {invalidItems.includes("password") &&
                            <div className="invalid-feedback">Password must be 5-20 characters.</div>
                        }
                    </div>

                    <div className="mb-3">
                        <input
                            type="first_name"
                            className={`form-control bg-dark text-light ${invalidItems.includes("first_name") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("first_name") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="First Name"
                            value={first_name}
                            onChange={(event) => setFirst_name(event.target.value)}
                            required
                        />
                        {invalidItems.includes("first_name") && (
                            <div className="invalid-feedback">First Name is required. Must be between 2 - 25 characters.</div>
                        )}
                    </div>

                    <div className="mb-3">
                        <input
                            type="last_name"
                            className={`form-control bg-dark text-light ${invalidItems.includes("last_name") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("last_name") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="Last Name"
                            value={last_name}
                            onChange={(event) => setLast_name(event.target.value)}
                            required
                        />
                        {invalidItems.includes("last_name") && (
                            <div className="invalid-feedback">Last Name is required. Must be between 2 - 25 characters.</div>
                        )}
                    </div>

                    <div className="mb-3 position-relative">
                        <PhoneInput
                            country={'us'}
                            value={phone}
                            onChange={handlePhoneChange}
                            inputClass={`form-control ${invalidItems.includes("phone") ? "is-invalid" : ""}`}
                            inputStyle={{
                                width: '100%',
                                backgroundColor: "#212529",
                                color: 'white',
                                border: invalidItems.includes("phone") ? '1px solid red' : '1px solid #414549',
                                height: '50px',
                            }}
                            containerStyle={{
                                width: '100%',
                                marginBottom: invalidItems.includes("phone") ? '38px' : '0',
                            }}
                            buttonStyle={{
                                backgroundColor: "#212529",
                                border: invalidItems.includes("phone") ? '1px solid red' : '1px solid #414549'
                            }}
                            dropdownStyle={{
                                backgroundColor: "#2b2b2b",
                                color: 'white',
                            }}
                            required
                        />
                        {invalidItems.includes("phone") && (
                            <div
                                className="invalid-feedback d-block"
                                style={{
                                    position: 'absolute',
                                    bottom: '-23px',
                                    left: '0',
                                    marginTop: '0.25rem',
                                }}
                            >
                                Invalid phone number
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <Select
                            isClearable
                            name="country"
                            options={countryOptions}
                            className={`basic-single-select ${invalidItems.includes("country") ? "is-invalid" : ""}`}
                            classNamePrefix="select"
                            onChange={handleCountryChange}
                            defaultValue={countryOptions[195]}
                            value={country ? { label: country, value: country } : ''}
                            placeholder="Select a Country..."
                            required
                        />
                        {invalidItems.includes("country") && (
                            <div className="invalid-feedback">
                                <i className="fas fa-circle-exclamation me-2" />
                                Country is required. Must be between 2 - 80 characters.
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <CreatableSelect
                            isClearable
                            name="what_state"
                            options={country === "United States of America (USA)" ? stateOptions : []}
                            className={`basic-single-select ${invalidItems.includes("what_state") ? "is-invalid" : ""}`}
                            classNamePrefix="select"
                            onChange={handleStateChange}
                            value={what_state ? { value: what_state, label: what_state } : ''}
                            placeholder="Select or Type a State/ Providence..."
                        />
                        {invalidItems.includes("what_state") && (
                            <div className="invalid-feedback">
                                <i className="fas fa-circle-exclamation me-2" />
                                State is required. Must be between 2-80 characters.
                            </div>
                        )}
                    </div>

                    <div className="mb-3">
                        <input
                            type="city"
                            className={`form-control bg-dark text-light ${invalidItems.includes("city") ? "is-invalid" : ""}`}
                            style={{
                                border: invalidItems.includes("city") ? '1px solid red' : '1px solid #414549',
                                padding: '12px'
                            }}
                            placeholder="City"
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                            required
                        />
                        {invalidItems.includes("city") && (
                            <div className="invalid-feedback">City is required. Must be between 2 - 80 characters.</div>
                        )}
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="btn btn-secondary w-100 py-2 mt-3 mb-4"
                            style={{
                                backgroundColor: '#6c757d',
                                border: 'none',
                                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                                transition: 'box-shadow 0.3s ease',
                            }}
                        >
                            Submit
                        </button>
                    </div>
                    <div className="text-center text-secondary small-font">
                        Already have an account?
                        <span
                            onClick={() => switchToLogin()}
                            className="ms-1 text-secondary auth-link"
                        >
                            Login
                        </span>
                    </div>
                </div>
            </div>
        </form>
    );
}
