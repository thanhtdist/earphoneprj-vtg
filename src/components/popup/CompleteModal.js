import React from "react";

const ConfirmDeleteModal = ({ show, bodyText, handleOkConfirmed, handleCloseConfirm }) => {
    return (
        <>
            {show && <div className="modal-backdrop show"></div>}

            <div
                className={`modal fade ${show ? "show d-block" : "d-none"}`}
                tabIndex="-1"
                role="dialog"
                style={{ display: show ? "block" : "none" }} // Ensures visibility
            >
                <div
                    className="modal-dialog"
                    role="document"
                    style={{
                        position: "absolute",
                        top: "33vh", // Moves it to 1/3 of the screen height
                        left: "50%", // Centers it horizontally
                        transform: "translate(-50%, -33%)", // Adjusts positioning
                    }}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Confirm</h5>
                            <button type="button" className="btn-close" onClick={handleCloseConfirm}></button>
                        </div>
                        <div className="modal-body">
                            <p>{bodyText}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" onClick={handleOkConfirmed}>
                                OK
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleCloseConfirm}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmDeleteModal;