import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import {
  getTour,
  updateTour
} from '../../../apis/admin';
// import './../../../styles/Admin.css';
import Sidebar from '../common/Sidebar';
import GenerateQRCode from './GenerateQRCode';
import { Controller, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { Link } from 'react-router-dom';
import { toast } from "react-toastify";
import Loading from '../../Loading';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import Config from '../../../utils/config'; // Importing the configuration file

const UpdateTour = () => {
  const navigate = useNavigate();
  const { tourId } = useParams(); // Extracts 'tourId' from the URL
  console.log('Tour ID:', tourId);
  const [isLoading, setIsLoading] = useState(false);
  const [tour, setTour] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    control,
  } = useForm();

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
  // Update form fields whenever tour changes
  useEffect(() => {
    if (tour) {
      reset(tour);
    }
  }, [tour, reset]);


  const onSubmit = (data) => {
    //alert(JSON.stringify(data, null, 2)); // Display form data in an alert
    console.log('Form data:', data);

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
  const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
    <input
      className='date-picker'
      type="text"
      onClick={onClick}
      value={value}
      readOnly
      ref={ref}

    />
  ));
  return (
    <div className="container-fluid">
      <div className="row py-4"></div>
      <Sidebar />
      {isLoading && <Loading />}
      <main className="px-4 px-sm-5 my-2">
        <h1>ツアー登録</h1>
        <div className="col-8 mx-auto my-5 p-5 bg-white">
           <form onSubmit={handleSubmit(onSubmit)}>
                <div className="form-group row mb-3">
                    <label htmlFor="chatRestriction" className="col-sm-3 col-form-label">チャットの制限</label>
                    <div className="col-sm-9">
                        <select id="chatRestriction" className="form-control"
                            {...register("chatRestriction", { required: "チャットの制限を選択してください。" })}
                            style={{ "maxWidth": "100%", "appearance": "listbox" }}
                        >
                            <option value=""></option>
                            <option value="allChat">誰でもチャット可能</option>
                            <option value="guideOnly">ガイドのみチャット可能</option>
                            <option value="nochat">チャット無効</option>
                        </select>
                        {errors.chatRestriction && (
                            <p style={{ color: "red" }}>{errors.chatRestriction.message}</p>
                        )}
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="tourNumber" className="col-sm-3 col-form-label">ツアー番号</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="tourNumber" placeholder=""
                            {...register("tourNumber", { required: "ツアー番号を入力してください。" })}
                        />
                        {errors.tourNumber && <p style={{ color: "red" }}>{errors.tourNumber.message}</p>}
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="courseName" className="col-sm-3 col-form-label">コース名</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="courseName" placeholder=""
                            {...register("courseName", { required: "" })}
                        />
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="lanningAndSalesSignature" className="col-sm-3 col-form-label">企画営業署名</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="lanningAndSalesSignature" placeholder=""
                            {...register("lanningAndSalesSignature")}
                        />
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="planningSalesOfficeTeamName" className="col-sm-3 col-form-label">企画営業所チーム名</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="planningSalesOfficeTeamName" placeholder=""
                            {...register("planningSalesOfficeTeamName")}
                        />
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="departureDate" className="col-sm-3 col-form-label">出発日</label>
                    <div className="col-sm-9">
                        <div className='form-control'>
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
                                        required
                                        customInput={<CustomInput label={"departureDate"} />}
                                    />
                                )}
                            />
                        </div>
                        {errors.departureDate && <span className="text-danger">{errors.departureDate.message}</span>}
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="returnDate" className="col-sm-3 col-form-label">帰着日</label>
                    <div className="col-sm-9">
                        <div className='form-control'>
                            <Controller
                                name="returnDate"
                                control={control}
                                defaultValue={null}
                                rules={{
                                    required: '帰着日を入力してください。',
                                }}
                                render={({ field }) => (
                                    <DatePicker
                                        {...field}
                                        selected={field.value}
                                        onChange={(date) => field.onChange(format(date, 'yyyy-MM-dd'))}
                                        dateFormat="YYYY-MM-dd"
                                        required
                                        customInput={<CustomInput label={"returnDate"} />}
                                    />
                                )}
                            />


                        </div>
                        {errors.returnDate && <span className="text-danger">{errors.returnDate.message}</span>}
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="nameOfCoursePersonInCharge" className="col-sm-3 col-form-label">コースご担当者様氏名</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="nameOfCoursePersonInCharge" placeholder=""
                            {...register("nameOfCoursePersonInCharge")}
                        />

                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="tourConductorName" className="col-sm-3 col-form-label">添乗員様氏名</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="tourConductorName" placeholder=""
                            {...register("tourConductorName")}
                        />

                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="numberOfReceiversInUse" className="col-sm-3 col-form-label">受信機側利用台数</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="numberOfReceiversInUse" placeholder=""
                            {...register("numberOfReceiversInUse")}
                        />

                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="numberOfSendingDevices" className="col-sm-3 col-form-label">送信側利用台数</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="numberOfSendingDevices" placeholder=""
                            {...register("numberOfSendingDevices")}
                        />

                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="subGuideFunctionAvailable" className="col-sm-3 col-form-label">サブガイド機能利用(有・無）</label>
                    <div className="col-sm-9">
                        <input type="checkbox" id="subGuideFunctionAvailable"
                            {...register("subGuideFunctionAvailable",)}
                        />
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="useTheTranslationFunction" className="col-sm-3 col-form-label">翻訳機能利用</label>
                    <div className="col-sm-9">
                        <input type="checkbox" id="useTheTranslationFunction" placeholder=""
                            {...register("useTheTranslationFunction",)}
                        />
                    </div>
                </div>
                <div className="form-group row mb-3">
                    <label htmlFor="coSponsoredCourseNumber" className="col-sm-3 col-form-label">共催コース番号</label>
                    <div className="col-sm-9">
                        <input type="text" className="form-control" id="coSponsoredCourseNumber" placeholder=""
                            {...register("coSponsoredCourseNumber",)}
                        />

                    </div>
                </div>
                <div className="form-group row mb-3"></div>
                <GenerateQRCode tourId={tour.tourId} />
                <div className="text-center mt-5">
                    <Link to={`${Config.pathNames.tour}`} type="submit" className="btn btn-outline-danger" style={{ "marginRight": "50px" }}>戻る</Link>
                    <button type="submit" className="btn btn-danger">更新</button>
                </div>
            </form>
        </div>
      </main>
    </div>
  );
};

export default UpdateTour;