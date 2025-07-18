import React from "react";

const ErrorDetailModal = ({ show, title = "Invalid Data", errors = [], onClose }) => {
    if (!show) return null;

    return (
        <>
            {show && <div className="modal-backdrop fade show"></div>}

            <div
                className={`modal fade ${show ? "show d-block" : "d-none"}`}
                tabIndex="-1"
                role="dialog"
                style={{ display: show ? "block" : "none" }}
            >
                <div
                    className="modal-dialog modal-lg"
                    role="document"
                    style={{
                        position: "absolute",
                        top: "33vh",
                        left: "50%",
                        transform: "translate(-50%, -33%)",
                        maxHeight: "80vh",
                    }}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>

                        <div
                            className="modal-body"
                            style={{
                                maxHeight: "50vh",
                                overflowY: "auto",
                            }}
                        >
                            {errors.length === 0 ? (
                                <p>No errors found.</p>
                            ) : (
                                <ul className="list-group">
                                    {errors.map((err, idx) => (
                                        <li key={idx} className="text-danger mb-2">
                                            <strong>Row {err.index} (Tour: {err.tourNumber}):</strong> {err.error}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ErrorDetailModal;
