import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    getTourByNumberAndDate,
} from '../../apis/api';
import { useTranslation } from 'react-i18next';
import { messages } from '../../messages';
import Header from '../common/Header';
import GuideTourConfirm from './GuideTourConfirm';
import Loading from '../Loading';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../../styles/StartFindTour.css';
import { format } from 'date-fns';

const StartFindTour = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
    } = useForm();
    const { t } = useTranslation();
    const [tour, setTour] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const findTour = async (data) => {
        try {
            setIsLoading(true);
            const getTourByNumberAndDateResponse = await getTourByNumberAndDate(data);
            if (getTourByNumberAndDateResponse?.statusCode !== 200) {
                console.log('Find tour error:', getTourByNumberAndDateResponse);
                setError(messages.tour.notFound);
                setTour(null);
            } else {
                console.log('Find tour:', getTourByNumberAndDateResponse.data[0]);
                setTour(getTourByNumberAndDateResponse.data[0]);
            }

        } catch (error) {
            console.error('Error fetching tour:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const onSubmit = (data) => {     
        console.log("Find data old", data);
        // console.log("Find data new", newData);
        // Perform any action with the form data here
        findTour(data);
    };
    console.log("Error", error);
    console.log("Tour", tour);
    // console.log("Error", error);
    const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
        <input
            className='date-picker'
            type="text"
            onClick={onClick}
            value={value}
            readOnly
            ref={ref}
            placeholder='YYYY-MM-DD'
        />
    ));
    return (
        <>
            {isLoading && <Loading />}
            <Header />
            {tour ? (
                // Render StartMainGuide component if tour is not null
                <GuideTourConfirm tour={tour} />
            ) : (
                // Render the form if tour is null
                <div
                    className="container-fluid py-5"
                >
                    <div className="row justify-content-center">
                        <div className="col-lg-6 col-md-8 col-12">
                            <div className="text-center mb-4">
                                <span className='titleLiveSession'
                                >
                                    {t('pageTitles.guide')}
                                </span>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)}>
                                <div className="mb-3">
                                    <label htmlFor="tourNumber" className="form-label fw-bold">
                                        {t('startGuidePage.tourNumber')}
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="tourNumber"
                                        {...register('tourNumber', { required: true })}
                                    />
                                    {errors.tourNumber && (
                                        <span className="text-danger">ツアー番号を入力してください。</span>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="departureDate" className="form-label fw-bold">
                                        {t('startGuidePage.startDate')}
                                    </label>
                                    {/* <input
                                        type="date"
                                        className="form-control"
                                        id="departureDate"
                                        {...register('departureDate', { required: true })}

                                    />
                                    {errors.departureDate && (
                                        <span className="text-danger">出発日を入力してください。</span>
                                    )}                                     */}
                                    <div className="form-control">
                                        {/* <DatePicker  
                                            selected={startDate} 
                                            onChange={setStartDate} 
                                            dateFormat="YYYY-MM-dd" 
                                            required 
                                            customInput={<CustomInput />}
                                             >                                                
                                             </DatePicker> */}
                                        <Controller
                                            name="departureDate"
                                            control={control}
                                            defaultValue={null}
                                            rules={{
                                                required: '出発日を入力してください。',                                               
                                              }}
                                            render={({ field }) => (
                                                <DatePicker
                                                    {...field}
                                                    selected={field.value}
                                                    onChange={(date) => field.onChange(format(date, 'yyyy-MM-dd'))}
                                                    dateFormat="YYYY-MM-dd"
                                                    
                                                    customInput={<CustomInput  />}
                                                />
                                            )}
                                        />
                                        
                                    </div>
                                    {errors.departureDate && <span className="text-danger">{errors.departureDate.message}</span>}
                                </div>
                                {error && <p className="text-danger">{error}</p>}
                                {/* <DatePicker selected={startDate} onChange={setStartDate} dateFormat="YYYY-MM-dd" required showIcon></DatePicker> */}
                                <div className="text-center">
                                    <button type="submit" className="btn btn-danger">
                                        {t('startGuidePage.nextBtn')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default StartFindTour;