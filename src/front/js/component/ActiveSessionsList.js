import React from "react";

export const ActiveSessionsList = ({ sessions, onCopy, onRefresh }) => {

    const formatTimeRemaining = (expiresAt) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diffMs = expires - now;

        if (diffMs <= 0) {
            return "Expired";
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m left`;
        } else {
            return `${diffMinutes}m left`;
        }
    };

    const getDurationBadgeColor = (maxDuration) => {
        return maxDuration === 360 ? 'bg-primary' : 'bg-success';
    };

    if (!sessions || sessions.length === 0) {
        return (
            <div className="card mb-4" style={{ backgroundColor: "#18181B"}}>
                <div className="card-body text-center py-5">
                    <div className="mb-3" style={{ fontSize: '4rem', opacity: 0.3 }}>📹</div>
                    <h5 className="text-white">No Active Sessions</h5>
                    <p className="text-white">Create your first video link to get started</p>
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
                        onClick={onRefresh}
                    >
                        <i className="fas fa-refresh me-2"></i>
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card mb-4" style={{ backgroundColor: "#18181B"}}>
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 text-white">Active Sessions ({sessions.length})</h5>
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
                        onClick={onRefresh}
                    >
                        <i className="fas fa-refresh me-2"></i>
                        Refresh
                    </button>
            </div>
            <div className="card-body p-0">
                {sessions.map((session, index) => (
                    <div key={session.id} className={`p-3 ${index < sessions.length - 1 ? 'border-bottom' : ''}`}>
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <div className="d-flex align-items-center mb-2">
                                    <span className="badge me-2 {getDurationBadgeColor(session.max_duration_minutes)}">
                                        {session.max_duration_minutes === 360 ? '6hrs' : '70min'}
                                    </span>
                                    <small className="text-white">
                                        Created: {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString()}
                                    </small>
                                </div>
                                <div className="d-flex align-items-center">
                                    <span
                                        className={`badge me-2 ${formatTimeRemaining(session.expires_at).includes('Expired')
                                            ? 'bg-danger'
                                            : 'bg-warning text-dark'
                                            }`}
                                    >
                                        ⏰ {formatTimeRemaining(session.expires_at)}
                                    </span>
                                    <small className="text-white">
                                        ID: {session.meeting_id}
                                    </small>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="d-flex flex-column flex-md-row gap-2">
                                    <button
                                        className="btn btn-primary flex-fill"
                                        style={{ backgroundColor: "#EC4432", border: "none", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                        onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = "0 0 5px 1px #fff";
                                        e.currentTarget.style.transform = "translateY(-1px)"
                                        }}
                                        onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.transform = "translateY(0)"
                                        }}
                                        onClick={() => onCopy(session.session_url)}
                                    >
                                        <i className="fas fa-copy me-2"></i>
                                        Copy Link
                                    </button>
                                    <a
                                        href={session.session_url}
                                        style={{ backgroundColor: "transparent", border: "2px solid #EC4432", transition: "box-shadow 0.3s ease, transform 0.3s ease" }}
                                        onMouseEnter={e => {
                                        e.currentTarget.style.boxShadow = "0 0 5px 1px #EC4432";
                                        e.currentTarget.style.transform = "translateY(-1px)"
                                        }}
                                        onMouseLeave={e => {
                                        e.currentTarget.style.boxShadow = "none";
                                        e.currentTarget.style.transform = "translateY(0)"
                                        }}
                                        className="btn btn-primary flex-fill"
                                    >
                                        <i className="fas fa-external-link-alt me-2"></i>
                                        Join
                                    </a>
                                </div>
                                <div className="mt-2">
                                    <small className="text-white d-block text-truncate">
                                        {session.session_url}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="card-footer text-center">
                <small className="text-white">
                    💡 Links expire automatically after 6 hours for security
                </small>
            </div>
        </div>
    );
}; 