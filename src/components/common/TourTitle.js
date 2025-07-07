import React from 'react';

function TourTitle({tour}) {
    console.log("TourTitle Page");
    return (
        <div className='titleFileUpload'>
            <div className='time'>
                <span>{tour?.departureDate}</span>
            </div>
            <div className='nameTour'>
                <span>{tour?.courseName}</span>
            </div>
        </div>
    );
}

export default TourTitle;