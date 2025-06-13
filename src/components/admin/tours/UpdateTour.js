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
            {/* <div className="form-group row mb-3">
              <label htmlFor="tourStatus" className="col-sm-3 col-form-label">現在のステータス: </label>
              <div className="col-sm-9">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="statusTest"
                    value="test"
                    {...register("tourTestStatus", { required: "ステータスを選択してください。" })}
                    defaultChecked={tour.tourTestStatus === "test"}
                  />
                  <label className="form-check-label" htmlFor="statusTest">
                  テスト稼働
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="statusProduction"
                    value="production"
                    {...register("tourTestStatus", { required: "ステータスを選択してください。" })}
                    defaultChecked={tour.tourTestStatus === "production"}
                  />
                  <label className="form-check-label" htmlFor="statusProduction">
                  本番稼働
                  </label>
                </div>
                {errors.tourTestStatus && <p style={{ color: "red" }}>{errors.tourTestStatus.message}</p>}
              </div>
            </div> */}
            <div className="form-group row mb-3">
              <label htmlFor="chatRestriction" className="col-sm-3 col-form-label">チャットの制限</label>
              <div className="col-sm-9">
                <select id="chatRestriction" className="form-control"
                  defaultValue={tour.chatRestriction}
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
                <input type="text" className="form-control" id="tourNumber" placeholder="例）X9411111"
                  defaultValue={tour.tourNumber}
                  {...register("tourNumber", { required: "ツアー番号を入力してください。" })}
                />
                {errors.tourNumber && <p style={{ color: "red" }}>{errors.tourNumber.message}</p>}
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="processingNumber" className="col-sm-3 col-form-label">処理番号</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="processingNumber" placeholder="例）W0001"
                  defaultValue={tour.processingNumber}
                  {...register("processingNumber", { required: "" })}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="tourName" className="col-sm-3 col-form-label">ツアー名</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="tourName" placeholder="例）浅草寺ツアー"
                  defaultValue={tour.tourName}
                  {...register("tourName", { required: "ツアー名を入力してください。" })}
                />
                {errors.tourName && <p style={{ color: "red" }}>{errors.tourName.message}</p>}
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="acceptanceDate" className="col-sm-3 col-form-label">申込受付日時</label>
              <div className="col-sm-9">
                {/* <input type="datetime-local" className="form-control" id="acceptanceDate" placeholder="例）2025/1/1/15:42"
                  defaultValue={tour.acceptanceDate}
                  {...register("acceptanceDate")}
                />
              </div> */}
                <div className="form-control">
                  <Controller
                    name="acceptanceDate"
                    control={control}
                    defaultValue={null}
                    render={({ field }) => (
                      <DatePicker
                        {...field}
                        selected={field.value}
                        onChange={(date) => field.onChange(format(date, 'yyyy-MM-dd HH:mm'))}
                        dateFormat="YYYY-MM-dd hh:mm"
                        required
                        showTimeInput
                        customInput={<CustomInput lable={"acceptanceDate"} />}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="planningOfficeName" className="col-sm-3 col-form-label">企画営業所名</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="planningOfficeName" placeholder="例）スポーツ旅行センター"
                  defaultValue={tour.planningOfficeName}
                  {...register("planningOfficeName")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="planningSalesOfficeName" className="col-sm-3 col-form-label">企画営業所<br />（その他を選択された方）</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="planningSalesOfficeName" placeholder=""
                  defaultValue={tour.planningSalesOfficeName}
                  {...register("planningSalesOfficeName")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="planningSalesOfficeTeamName" className="col-sm-3 col-form-label">企画営業所 <br />チーム名</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="planningSalesOfficeTeamName" placeholder="例）スポーツ"
                  defaultValue={tour.planningSalesOfficeTeamName}
                  {...register("planningSalesOfficeTeamName")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="contactPersonName" className="col-sm-3 col-form-label">ご担当者様<br />お名前</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="contactPersonName" placeholder="例）山田花子"
                  defaultValue={tour.contactPersonName}
                  {...register("contactPersonName")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="contactPersonEmail" className="col-sm-3 col-form-label">ご担当者様<br />メールアドレス</label>
              <div className="col-sm-9">
                <input type="email" className="form-control" id="contactPersonEmail" placeholder="例）kinoshita@ken-net.net"
                  defaultValue={tour.contactPersonEmail}
                  {...register("contactPersonEmail")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="numberOfDevices" className="col-sm-3 col-form-label">利用端末数</label>
              <div className="col-sm-9">
                <input type="number" className="form-control" id="numberOfDevices" placeholder="例）30"
                  defaultValue={tour.numberOfDevices}
                  {...register("numberOfDevices")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="numberOfTransmitters" className="col-sm-3 col-form-label">送信機必要端末数</label>
              <div className="col-sm-9">
                <input type="number" className="form-control" id="numberOfTransmitters" placeholder="例）2"
                  defaultValue={tour.numberOfTransmitters}
                  {...register("numberOfTransmitters")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="departureDate" className="col-sm-3 col-form-label">出発日</label>
              <div className="col-sm-9">
                {/* <input type="date" className="form-control" id="departureDate" placeholder="例）2025年4月4日"
                  defaultValue={tour.departureDate}
                  {...register("departureDate", { required: "出発日を入力してください。" })}
                />
                {errors.departureDate && <p style={{ color: "red" }}>{errors.departureDate.message}</p>} */}
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
                        // placeholderText="YYYY-MM-DD HH:MM"
                        // showTimeInput
                        customInput={<CustomInput />}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="returnDate" className="col-sm-3 col-form-label">帰着日</label>
              <div className="col-sm-9">
                {/* <input type="date" className="form-control" id="returnDate" placeholder="例）2025年4月4日"
                  defaultValue={tour.returnDate}
                  {...register("returnDate", { required: "帰着日を入力してください。" })}
                />
                {errors.returnDate && <p style={{ color: "red" }}>{errors.returnDate.message}</p>} */}
                <div className='form-control'>
                  <Controller
                    name="returnDate"
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
                        // placeholderText="YYYY-MM-DD HH:MM"
                        // showTimeInput
                        customInput={<CustomInput />}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="qrCodeDestination" className="col-sm-3 col-form-label">QRコード送付先</label>
              <div className="col-sm-9">
                <input type="text" className="form-control" id="qrCodeDestination" placeholder="例）ご担当者様のメールアドレス"
                  defaultValue={tour.qrCodeDestination}
                  {...register("qrCodeDestination")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="emailCustomer" className="col-sm-3 col-form-label">メールアドレス</label>
              <div className="col-sm-9">
                <input type="email" className="form-control" id="emailCustomer" placeholder=""
                  defaultValue={tour.emailCustomer}
                  {...register("emailCustomer")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="phoneNumberCustomer" className="col-sm-3 col-form-label">電話番号</label>
              <div className="col-sm-9">
                <input type="tel" className="form-control" id="phoneNumberCustomer" placeholder=""
                  defaultValue={tour.phoneNumberCustomer}
                  {...register("phoneNumberCustomer")}
                />
              </div>
            </div>
            <div className="form-group row mb-3">
              <label htmlFor="otherRemarks" className="col-sm-3 col-form-label">その他備考欄</label>
              <div className="col-sm-9">
                <textarea className="form-control" id="otherRemarks"
                  defaultValue={tour.otherRemarks}
                  {...register("otherRemarks")}
                ></textarea>
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