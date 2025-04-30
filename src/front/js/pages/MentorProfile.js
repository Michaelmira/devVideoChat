import React, { useState, useContext, useEffect } from "react";
import { Context } from "../store/appContext";
import { Link } from "react-router-dom";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  ValidatePrice,
  ValidateNumber,
  ValidatePhoneNumber,
  ValidateFirstName,
  ValidateLastName,
  ValidateWhatState,
  ValidateCountry,
  ValidateMentorAboutMe,
} from "../component/Validators";
import {
  skillsList,
  daysOfTheWeek,
  stateOptions,
  countryOptions,
} from "../store/data";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import ProfilePhoto from "../component/ProfilePhoto";
import PortfolioImage from "../component/PortfolioImage";
import { ChangePsModal } from "../auth/ChangePsModal";
import { GoogleAuthMentor } from "../component/GoogleAuthMentor";
import { StripeConnect } from "../component/StripeConnect";

import { InvalidItem } from "../component/InvalidItem";

import userIcon from "../../img/user-3296.png";

import "../../styles/mentorProfile.css";

export const MentorProfile = () => {
  const { actions } = useContext(Context);
  const [showChangePsModal, setShowChangePsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedPortfolioImages, setUploadedPortfolioImages] = useState([]);
  const [previewImg, setPreviewImg] = useState();
  const [markedForDeletion, setMarkedForDeletion] = useState([]); // for portfolio pictures
  const [isMarkedForDeletion, setIsMarkedForDeletion] = useState(false); // for profile photo
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imageSizeError, setImageSizeError] = useState(false);
  const [portfolioImgSizeError, setPortfolioImgSizeError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalMentor, setOriginalMentor] = useState({});
  const [selectedCountry, setSelectedCountry] = useState();
  const [invalidItems, setInvalidItems] = useState([]);
  const [phoneError, setPhoneError] = useState("");
  const [CharacterCount, setCharacterCount] = useState(0);
  const [mentorId, setMentorId] = useState("");
  const [mentor, setMentor] = useState({
    email: "",
    is_active: true,
    first_name: "",
    last_name: "",
    nick_name: "",
    phone: "",
    city: "",
    what_state: "",
    country: "",
    years_exp: "",
    skills: [],
    days: [],
    price: null,
    about_me: "",
  });

  useEffect(() => {
    if (mentorId) {
      console.log(`mentor_id is set to: ${mentorId}`);
    } else {
      console.log("There is no mentorId");
    }
  }, [mentorId]); // The effect will run whenever mentorId changes

  const fetchMentorData = async () => {
    const data = await actions.getCurrentMentor();
    if (data) {
      setMentor(data);
      setMentorId(data.id);
      setOriginalMentor(data);
      setCharacterCount(data.about_me?.length || 0);
    }
  };

  useEffect(() => {
    fetchMentorData();
  }, []);

  const profileImageUrl = mentor.profile_photo?.image_url || userIcon;
  const profileImagePositionX = mentor.profile_photo?.position_x || 0;
  const profileImagePositionY = mentor.profile_photo?.position_y || 0;
  const profileImageScale = mentor.profile_photo?.scale || 1;
  // const portfolioImageUrls = mentor?.portfolio_photos?.length > 0 ? mentor.portfolio_photos : placeholderImages;
  const portfolioImageUrls = mentor?.portfolio_photos || [];

  // const [loading, setLoading] = useState(true);
  // if (loading) {
  // 	return <div>Loading...</div>;
  // }
  // if (!mentor) {
  // 	return <div>Mentor not found</div>;
  // }

  const handleCancelChanges = async () => {
    setInvalidItems([]);
    setPhoneError("");
    setPreviewImg(null);
    // setMentor(originalMentor);
    setEditMode(false);
    setUploadedPortfolioImages([]);
    setUploadedImages([]);
    setMarkedForDeletion([]);
    setIsMarkedForDeletion(false);
    setImageSizeError(false);
    setPortfolioImgSizeError(false);

    // const data = await actions.getCurrentMentor();
    // if (data) {
    // 	setMentor(data);
    // 	setOriginalMentor(data);
    // 	setCharacterCount(data.about_me?.length || 0);
    // }
    fetchMentorData();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let x = value;
    if (name == "skills" || name == "days") {
      if (value.includes(",")) {
        x = value.split(",");
      } else {
        let array = [];
        array.push(value);
        x = array;
      }
    }
    if (name === "about_me") {
      setCharacterCount(value.length);
    }
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      [name]: x,
    }));
  };

  const handleSelectChange = (selectedOptions, { name }) => {
    const values = selectedOptions
      ? selectedOptions.map((option) => option.label)
      : [];
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      [name]: values,
    }));
  };

  const handleCountryChange = (selectedOption) => {
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      country: selectedOption ? selectedOption.label : "",
    }));
  };

  const handleStateChange = (selectedOption) => {
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      what_state: selectedOption ? selectedOption.value : "",
    }));
  };

  const handlePriceChange = (event) => {
    const { value } = event.target;
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      price: value.trim() === "" ? null : value,
    }));
  };

  const formattedPrice = () => {
    return mentor.price == "None" ? null : mentor.price;
  };

  const handlePhoneChange = (value, countryData) => {
    const phoneValidation = ValidatePhoneNumber(value, countryData.countryCode);
    setSelectedCountry(countryData.countryCode);
    if (phoneValidation.isValid) {
      setPhoneError("");
    } else {
      setPhoneError(phoneValidation.message);
    }
    console.log(value);
    setMentor((prevMentorInfo) => ({
      ...prevMentorInfo,
      phone: value,
    }));
  };

  const handleDeactivate = async () => {
    const token = sessionStorage.getItem("token");
    console.log(sessionStorage.getItem("token"));
    if (!token) {
      alert("No token found");
      return;
    }
    setMentor((prevMentor) => ({ ...prevMentor, is_active: false }));
    const response = await fetch(
      process.env.BACKEND_URL + "/api/mentor/deactivate",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      alert("Account deactivated succesfully");
    } else {
      alert("Failed to deactivate account");
    }
  };

  const handleReactivate = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("No token found");
      return;
    }
    setMentor((prevMentor) => ({ ...prevMentor, is_active: true }));
    const response = await fetch(
      process.env.BACKEND_URL + "/api/mentor/reactivate",
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      alert("Account reactivated successfully");
    } else {
      alert("Failed to reactivate account");
    }
  };

  const handleShowChangePsModal = () => {
    setShowChangePsModal(true);
  };

  const handleNewImage = async () => {
    const success = await actions.addMentorImage(
      uploadedImages,
      position.x,
      position.y,
      scale
    );
    if (success) {
      fetch(process.env.BACKEND_URL + "/api/mentor", {
        headers: { Authorization: "Bearer " + sessionStorage.getItem("token") },
      })
        .then((resp) => resp.json())
        .then((data) => setMentor(data))
        .catch((error) => console.log(error));
    }
  };

  const handlePortfolioImages = async () => {
    if (uploadedPortfolioImages.length > 0) {
      const success = await actions.addPortfolioImages(uploadedPortfolioImages);
      if (success) {
        fetch(process.env.BACKEND_URL + "/api/mentor", {
          headers: {
            Authorization: "Bearer " + sessionStorage.getItem("token"),
          },
        })
          .then((resp) => resp.json())
          .then((data) => {
            setMentor(data);
            setUploadedPortfolioImages([]);
          })
          .catch((error) => console.log(error));
      }
    }
  };

  const handleDeletePortfolioImages = async (imagesToDelete) => {
    const success = await actions.deletePortfolioImages(imagesToDelete);
    if (success) {
      fetch(process.env.BACKEND_URL + "/api/mentor", {
        headers: { Authorization: "Bearer " + sessionStorage.getItem("token") },
      })
        .then((resp) => resp.json())
        .then((data) => setMentor(data))
        .catch((error) => console.log(error));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // if (mentor.price === "None") {
    // 	setMentor((prevMentorInfo) => ({
    // 		...prevMentorInfo,
    // 		price: null,
    // 	}));
    // 	return;
    // }
    try {
      setInvalidItems([]);
      let isPriceValid = ValidatePrice(
        formattedPrice(),
        setInvalidItems,
        setMentor
      );
      let isYearValid = ValidateNumber(mentor.years_exp, setInvalidItems);
      let isFirstNameValid = ValidateFirstName(
        mentor.first_name,
        setInvalidItems
      );
      let isLastNameValid = ValidateLastName(mentor.last_name, setInvalidItems);
      let isCountryValid = ValidateCountry(mentor.country, setInvalidItems);
      let isStateValid = ValidateWhatState(mentor.what_state, setInvalidItems);
      let isAboutMeValid = ValidateMentorAboutMe(
        mentor.about_me,
        setInvalidItems
      );

      if (
        isPriceValid &&
        isYearValid &&
        isFirstNameValid &&
        isLastNameValid &&
        isCountryValid &&
        isStateValid &&
        isAboutMeValid
      ) {
        // Handle profile photo
        if (isMarkedForDeletion) {
          await actions.deleteProfilePhoto();
        } else if (uploadedImages.length > 0) {
          await handleNewImage();
        }

        // Handle portfolio images
        await handlePortfolioImages();
        if (markedForDeletion.length > 0) {
          await handleDeletePortfolioImages(markedForDeletion);
        }

        const success = await actions.editMentor({
          ...mentor,
          profile_photo: {
            ...mentor.profile_photo,
            position_x: position.x,
            position_y: position.y,
            scale: scale,
          },
          price: formattedPrice(),
        });
        if (success) {
          alert("Mentor information updated successfully");
          setEditMode(false);
          setUploadedPortfolioImages([]);
          setUploadedImages([]);
          setIsMarkedForDeletion(false);
          setPreviewImg(null);
          fetchMentorData();
          setImageSizeError(false);
          setPortfolioImgSizeError(false);
        } else {
          alert("Failed to update mentor information");
          setImageSizeError(false);
          setPortfolioImgSizeError(false);
        }
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("An error occurred while saving changes");
    } finally {
      setIsSaving(false);
    }
  };

  // console.log("mentor price", mentor.price)

  return (
    <div className="container card border-secondary shadow border-2 pt-0 mentor-profile">
      <div id="header" className="card-header bg-light-subtle">
        <h2 className="my-2 header-text d-flex align-items-center justify-content-center">
          Mentor Profile
          {/* {editMode == false
						? (<button onClick={() => setEditMode(true)} className="btn btn-secondary fa-solid fa-pencil ms-4"></button>)
						: ''
					} */}
          <GoogleAuthMentor mentorId={mentorId} />
          <StripeConnect />
        </h2>
        {!mentor.is_active && (
          <div className="alert alert-warning" role="alert">
            Your account is currently deactivated, please reactivate your
            account if you would like to continue to offer your services.
          </div>
        )}
      </div>

      <div className={`row px-4 ${editMode ? "pt-5" : "pt-3"}`}>
        {/* {editMode ? "border-container" : ""} */}
        <div className="d-flex justify-content-end">
          {editMode == false ? (
            <button
              onClick={() => setEditMode(true)}
              className="btn btn-lg btn-secondary fa-solid fa-pencil mb-4"
            ></button>
          ) : (
            ""
          )}
        </div>
        {/* <div className="col-5 mb-4"> */}
        <div className="col-12 col-md-5 mb-4 profile-section">
          <div className="d-flex justify-content-center">
            <ProfilePhoto
              url={profileImageUrl}
              setMentor={setMentor}
              editMode={editMode}
              uploadedImages={uploadedImages}
              setUploadedImages={setUploadedImages}
              previewImg={previewImg}
              setPreviewImg={setPreviewImg}
              isMarkedForDeletion={isMarkedForDeletion}
              setIsMarkedForDeletion={setIsMarkedForDeletion}
              position={position}
              setPosition={setPosition}
              positionX={profileImagePositionX}
              positionY={profileImagePositionY}
              scale={scale}
              setScale={setScale}
              imageScale={profileImageScale}
              imageSizeError={imageSizeError}
              setImageSizeError={setImageSizeError}
            />
          </div>
          <PortfolioImage
            portfolioImgs={portfolioImageUrls}
            setMentor={setMentor}
            editMode={editMode}
            uploadedPortfolioImages={uploadedPortfolioImages}
            setUploadedPortfolioImages={setUploadedPortfolioImages}
            markedForDeletion={markedForDeletion}
            setMarkedForDeletion={setMarkedForDeletion}
            portfolioImgSizeError={portfolioImgSizeError}
            setPortfolioImgSizeError={setPortfolioImgSizeError}
          />
        </div>
        {/* <div className="col-7 pe-5"> */}
        <div className="col-12 col-md-7 info-column">
          <dl className="row">
            <dt className="col-sm-4 form-label">Email:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <input
                    type="email"
                    name="email"
                    value={mentor.email}
                    onChange={handleChange}
                    className="form-control"
                    disabled
                  />
                  <button
                    className="mt-2 btn btn-sm btn-outline-secondary"
                    onClick={handleShowChangePsModal}
                  >
                    Change Password
                  </button>
                </>
              ) : (
                mentor.email
              )}
            </dd>

            <dt className="col-sm-4 form-label">First Name:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <input
                    type="text"
                    name="first_name"
                    value={mentor.first_name}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                  {invalidItems.includes("first_name") && (
                    <InvalidItem error="First Name is required. Must be between 2-25 characters." />
                  )}
                </>
              ) : (
                mentor.first_name
              )}
            </dd>

            <dt className="col-sm-4 form-label">Last Name:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <input
                    type="text"
                    name="last_name"
                    value={mentor.last_name}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                  {invalidItems.includes("last_name") && (
                    <InvalidItem error="Last Name is required. Must be between 2-25 characters." />
                  )}
                </>
              ) : (
                mentor.last_name
              )}
            </dd>

            <dt className="col-sm-4 form-label">Nickname:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <input
                  type="text"
                  name="nick_name"
                  value={mentor.nick_name}
                  onChange={handleChange}
                  className="form-control"
                />
              ) : (
                mentor.nick_name
              )}
            </dd>

            <dt className="col-sm-4 form-label">Phone:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <PhoneInput
                    country={"us"}
                    value={mentor.phone}
                    onChange={handlePhoneChange}
                    inputClass="form-control phone-input"
                    inputStyle={{
                      width: "100%",
                    }}
                    inputProps={{
                      name: "phone",
                      required: true,
                      autoFocus: true,
                    }}
                  />
                  {phoneError && <InvalidItem error={phoneError} />}
                </>
              ) : (
                // <PhoneInput
                // 	disabled
                // 	country={'us'}
                // 	value={mentor.phone}
                // 	onChange={handlePhoneChange}
                // 	inputClass="form-control disabled border-0"
                // 	inputStyle={{
                // 		height: '25px',
                // 		fontSize: '16px',
                // 		padding: '0px',
                // 		margin: '0px',
                // 		lineHeight: 'auto',
                // 		width: '100%'
                // 	}}
                // 	buttonStyle={{
                // 		display: 'none'
                // 	}}
                // />

                <PhoneInput
                  readOnly
                  enableSearch={false}
                  country={"us"}
                  value={mentor.phone}
                  onChange={handlePhoneChange}
                  inputClass="form-control border-0"
                  containerStyle={{
                    pointerEvents: "none",
                  }}
                  inputStyle={{
                    height: "25px",
                    fontSize: "16px",
                    padding: "0px",
                    margin: "0px",
                    lineHeight: "auto",
                    width: "100%",
                    cursor: "text",
                    backgroundColor: "transparent",
                  }}
                  buttonStyle={{
                    display: "none",
                  }}
                />
              )}
            </dd>

            <dt className="col-sm-4 form-label">Country:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <Select
                    isClearable
                    name="country"
                    options={countryOptions}
                    className="basic-single-select"
                    classNamePrefix="select"
                    onChange={handleCountryChange}
                    defaultValue={countryOptions[195]}
                    value={
                      mentor.country
                        ? { value: mentor.country, label: mentor.country }
                        : ""
                    }
                    required
                  />
                  {invalidItems.includes("country") && (
                    <InvalidItem error="Country is required. Must be between 6-80 characters." />
                  )}
                </>
              ) : (
                mentor.country
              )}
            </dd>

            <dt className="col-sm-4 form-label">Region/ State:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <CreatableSelect
                    isClearable
                    name="what_state"
                    options={
                      mentor.country === "United States of America (USA)"
                        ? stateOptions
                        : []
                    }
                    className="basic-single-select"
                    classNamePrefix="select"
                    onChange={handleStateChange}
                    value={
                      mentor.what_state
                        ? { value: mentor.what_state, label: mentor.what_state }
                        : ""
                    }
                  />
                  {invalidItems.includes("what_state") && (
                    <InvalidItem error="State/ Region is required. Must be between 1-80 characters." />
                  )}
                </>
              ) : (
                mentor.what_state
              )}
            </dd>

            <dt className="col-sm-4 form-label">City:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <input
                  type="text"
                  name="city"
                  value={mentor.city}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              ) : (
                mentor.city
              )}
            </dd>

            <dt className="col-sm-4 form-label">Years of Experience:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <input
                    type="text"
                    name="years_exp"
                    value={mentor.years_exp}
                    onChange={handleChange}
                    className="form-control"
                  />
                  {invalidItems.includes("years_exp") && (
                    <InvalidItem error="Must be a number (ex. 2)" />
                  )}
                </>
              ) : (
                mentor.years_exp
              )}
            </dd>

            <dt className="col-sm-4 form-label">Skills:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <CreatableSelect
                  isMulti
                  name="skills"
                  value={mentor.skills?.map((skill) => ({
                    value: skill,
                    label: skill,
                  }))}
                  onChange={handleSelectChange}
                  options={skillsList.filter(
                    (skill) => !mentor.skills?.includes(skill.label)
                  )}
                  closeMenuOnSelect={false}
                  // styles={customStyles}
                />
              ) : (
                mentor.skills?.join(", ")
              )}
            </dd>

            <dt className="col-sm-4 form-label">Days Available:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <Select
                  isMulti
                  name="days"
                  options={daysOfTheWeek.filter(
                    (day) => !mentor.days?.includes(day.label)
                  )}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  closeMenuOnSelect={false}
                  defaultValue={mentor.days?.map((day) => ({
                    value: day,
                    label: day,
                  }))}
                  onChange={handleSelectChange}
                />
              ) : (
                mentor.days?.join(", ")
              )}
            </dd>

            <dt className="col-sm-4 form-label">Price:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <div className="input-group">
                    <span className="input-group-text">$</span>
                    <input
                      type="text"
                      name="price"
                      value={formattedPrice()}
                      onChange={handlePriceChange}
                      className="form-control"
                    />
                    <span className="input-group-text">/hr</span>
                  </div>
                  {/* TODO: Make sure the invalideItems errors go away/reset if you hit 'cancel changes' button */}
                  {invalidItems.includes("price") && (
                    <InvalidItem error="Invalid price value (ex. 20.00)" />
                  )}
                </>
              ) : mentor.price && mentor.price !== "None" ? (
                `$${mentor.price} /hr`
              ) : (
                ""
              )}
            </dd>

            <dt className="col-sm-4 form-label">About Me:</dt>
            <dd className="col-sm-8">
              {editMode ? (
                <>
                  <textarea
                    name="about_me"
                    value={mentor.about_me}
                    onChange={handleChange}
                    className="form-control"
                    rows="14"
                  ></textarea>
                  <span className="d-flex flex-row">
                    <p
                      className={`mb-0 ${
                        CharacterCount > 2500 ? "text-danger" : ""
                      }`}
                    >
                      {CharacterCount}
                    </p>
                    <p className="mb-0">&nbsp;/ 2500</p>
                  </span>
                  {invalidItems.includes("about_me") && (
                    <InvalidItem error="Character count must be below 2500." />
                  )}
                </>
              ) : (
                <div className="about-me-container">
                  <div className="about-me-content p-1">{mentor.about_me}</div>
                </div>
              )}
            </dd>
          </dl>
          {editMode && (
            <div className="d-flex justify-content-end mb-5 gap-2">
              <button
                className="btn btn-danger small-button"
                onClick={handleCancelChanges}
              >
                Cancel
              </button>
              {/* <button
                className="btn btn-success small-button"
                onClick={handleSubmit}
              >
                Save Changes
              </button> */}
              <button
                className="btn btn-success small-button d-flex align-items-center justify-content-center gap-2"
                onClick={handleSubmit}
                disabled={isSaving}
                style={{ minWidth: "120px" }}
              >
                {isSaving ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex justify-content-center gap-3">
        {editMode && mentor.is_active ? (
          <button
            className="btn btn-danger my-3 small-button"
            onClick={() =>
              confirm("Are you sure you want to deactivate your account?") &&
              handleDeactivate()
            }
          >
            Deactivate Account
          </button>
        ) : editMode && !mentor.is_active ? (
          <button
            className="btn btn-success my-3 small-button"
            onClick={handleReactivate}
          >
            Reactivate Account
          </button>
        ) : null}
      </div>

      {showChangePsModal && (
        <ChangePsModal
          show={showChangePsModal}
          onHide={() => setShowChangePsModal(false)}
        />
      )}
    </div>
  );
};
