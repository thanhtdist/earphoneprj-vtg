import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
    getTour,
    updateTour
} from '../../../apis/admin';
// import './../../../styles/Admin.css';
import Sidebar from '../common/Sidebar';

import { useParams } from "react-router-dom";

import { toast } from "react-toastify";
import Loading from '../../Loading';

import Config from '../../../utils/config'; // Importing the configuration file
import TourForm from '../common/TourForm';

const UpdateTour = () => {
    const navigate = useNavigate();
    const { tourId } = useParams(); // Extracts 'tourId' from the URL
    console.log('Tour ID:', tourId);
    const [isLoading, setIsLoading] = useState(false);
    const [tour, setTour] = useState([]);

    //   const {
    //     register,
    //     handleSubmit,
    //     reset,
    //     formState: { errors },
    //     control,
    //   } = useForm();

    useEffect(() => {
        const getTourDetail = async () => {
            try {
                setIsLoading(true);
                const getTourDetailResponse = await getTour(tourId);
                console.log("getTourDetailResponse", getTourDetailResponse);
                setTour(getTourDetailResponse);
            } catch (error) {
                console.error('Error retrieving tour details:', error);
                toast.error("Tour details could not be loaded.");
            } finally {
                setIsLoading(false);
            }
        };
        getTourDetail();
    }, [tourId]);
    console.log('Tour:', tour);

    const handleSubmit = (data) => {
        console.log('update tour:', data);
        setIsLoading(true);
        callUpdateTour(data);
    };
    // Call API to update tour
    const callUpdateTour = async (data) => {
        try {
            // Update tour
            console.log('Data update tour:', data);
            const updateTourResponse = await updateTour(data);
            console.log('Tour updated:', updateTourResponse);
            // Redirect to the tour list page
            if (updateTourResponse && updateTourResponse.error) {
                toast.error(`Error updating tour ${data.tourNumber}: ${updateTourResponse.error}`);
            } else {
                toast.success(`Tour ${data.tourNumber} was updated successfully.`, {
                    onClose: () => {
                        navigate(Config.pathNames.tour);
                    },
                });
            }
        } catch (error) {
            console.error('Error update tour:', error);
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
                    <TourForm onSubmit={handleSubmit} defaultValues={tour}></TourForm>
                </div>
            </main>
        </div>
    );
};

export default UpdateTour;