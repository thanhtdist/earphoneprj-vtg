import React from 'react';

function NotFound() {
    console.log("Not Found Page");
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh"
            }}
        >
            <h2>404 - Page Not Found</h2>
        </div>
    );
}

export default NotFound;