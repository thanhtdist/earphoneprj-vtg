import React, { useState } from 'react';

const UploadTour = () => {
    const [tourData, setTourData] = useState({
        name: '',
        description: '',
        price: '',
        date: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTourData({ ...tourData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Add logic to Upload the tour
        console.log('Uploadd Tour Data:', tourData);
    };

    return (
        <div>
            <h2>Upload Tour</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Name:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={tourData.name}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label htmlFor="description">Description:</label>
                    <textarea
                        id="description"
                        name="description"
                        value={tourData.description}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label htmlFor="price">Price:</label>
                    <input
                        type="number"
                        id="price"
                        name="price"
                        value={tourData.price}
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <label htmlFor="date">Date:</label>
                    <input
                        type="date"
                        id="date"
                        name="date"
                        value={tourData.date}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit">Upload Tour</button>
            </form>
        </div>
    );
};

export default UploadTour;