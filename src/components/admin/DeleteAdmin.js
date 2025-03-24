import React from 'react';

const DeleteAdmin = () => {
    const handleDelete = () => {
        // Add delete logic here
        console.log('Admin deleted');
    };

    return (
        <div>
            <h1>Delete Admin</h1>
            <button onClick={handleDelete}>Delete Admin</button>
        </div>
    );
};

export default DeleteAdmin;