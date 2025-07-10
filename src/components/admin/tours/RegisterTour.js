import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    createTour,
} from '../../../apis/admin';
// import './../../../styles/Admin.css';
import Sidebar from '../common/Sidebar';
import { toast } from "react-toastify";
import Loading from '../../Loading';
import Config from '../../../utils/config'; // Importing the configuration file
import TourForm from '../common/TourForm';

const RegisterTour = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
const handleSubmit = (data) => {
        console.log('Đăng ký tour:', data);
        setIsLoading(true);
        bookTour(data);
    };
    // Book a new tour
    const bookTour = async (data) => {
        try {
            // Create the tour with meetingId and channelId
            const createTourResponse = await createTour(data);
            console.log('Tour created:', createTourResponse);
            // Show success message
            toast.success(`Tour ${data.tourNumber} was created successfully.`, {
                onClose: () => {
                    navigate(Config.pathNames.tour);
                },
            });
        } catch (error) {
            console.error('Error creating tour:', error.message);
            console.error('Error creating tour:', error.statusCode);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="container-fluid">
            <div className="row py-4"></div>
            <Sidebar />
            {isLoading && <Loading />}
            <main className="px-4 px-sm-5 my-2">
                <h1>ツアー登録</h1>
                <div className="col-8 mx-auto my-5 p-5 bg-white">
                    <TourForm onSubmit={handleSubmit}></TourForm>
                </div>
            </main>
        </div>
    );
};

export default RegisterTour;