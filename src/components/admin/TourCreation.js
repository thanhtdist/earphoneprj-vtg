import React from 'react';
import {
    createTour,
    createMeeting,
    createAppInstanceUsers,
    createChannel
} from '../../apis/api';
import '../../styles/Admin.css';
import { v4 as uuidv4 } from 'uuid';
import Sidebar from './Sidebar';
import { useForm } from "react-hook-form";
import { Link } from 'react-router-dom';

const TourCreation = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = (data) => {
        alert(JSON.stringify(data, null, 2)); // Display form data in an alert
        bookTour(data);
    };

    // Book a new tour
    const bookTour = async (data) => {
        try {
            const response = await createMeetingAndChannel();
            console.log('Meeting and channel created:', response);
            data.meetingId = response.meetingId;
            data.channelId = response.channelID;
            console.log('Tour data:', data);
            // Create the tour with meetingId and channelId
            const createTourResponse = await createTour(data);
            console.log('Tour created:', createTourResponse);
            // Redirect to the tour list page
            window.location.href = "/tour_list";
        } catch (error) {
            console.error('Error creating meeting, channel, or tour:', error);
        }
    };

    // Create a new meeting and channel
    const createMeetingAndChannel = async () => {
        const meeting = await createMeeting();
        const meetingId = meeting.MeetingId;
        console.log('Meeting created:', meeting);
        const userID = uuidv4();
        const userName = 'channelAdmin';
        const userArn = await createAppInstanceUsers(userID, userName);
        console.log('channelAdmin created:', userArn);
        const channelArn = await createChannel(userArn);
        console.log('channelArn created:', userArn);
        const channelID = channelArn.split('/').pop();
        console.log('channelID:', channelID);
        return { meetingId, channelID };
    }

    // const handleReturn = () => {

    // };

    return (
        <div className="container-fluid">
            <div className="row py-4"></div>
            <Sidebar />
            <main className="px-4 px-sm-5 my-2">
                <h1>ツアー登録</h1>
                <div className="col-8 mx-auto my-5 p-5 bg-white">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="form-group row mb-3">
                            <label htmlFor="tourNumber" className="col-sm-3 col-form-label">チャットの制限</label>
                            <div className="col-sm-9">
                                <select  className="form-control">
                                    <option value="allChat">誰でもチャット可能</option>
                                    <option value="guideOnly">ガイドのみチャット可能</option>
                                    <option value="nochat">チャット無効</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="tourNumber" className="col-sm-3 col-form-label">ツアー番号</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="tourNumber" placeholder="例）X9411111"
                                    {...register("tourNumber", { required: "ツアー番号を入力してください。" })}
                                />
                                {errors.tourNumber && <p style={{ color: "red" }}>{errors.tourNumber.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="processingNumber" className="col-sm-3 col-form-label">処理番号</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="processingNumber" placeholder="例）W0001"
                                    {...register("processingNumber", { required: "" })}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="tourName" className="col-sm-3 col-form-label">ツアー名</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="tourName" placeholder="例）浅草寺ツアー"
                                    {...register("tourName", { required: "ツアー名を入力してください。" })}
                                />
                                {errors.tourName && <p style={{ color: "red" }}>{errors.tourName.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="acceptanceDate" className="col-sm-3 col-form-label">申込受付日時</label>
                            <div className="col-sm-9">
                                <input type="datetime-local" className="form-control" id="acceptanceDate" placeholder="例）2025/1/1/15:42"
                                    {...register("acceptanceDate")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="planningOfficeName" className="col-sm-3 col-form-label">企画営業所名</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="planningOfficeName" placeholder="例）スポーツ旅行センター"
                                    {...register("planningOfficeName")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="planningSalesOfficeName" className="col-sm-3 col-form-label">企画営業所<br />（その他を選択された方）</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="planningSalesOfficeName" placeholder=""
                                    {...register("planningSalesOfficeName")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="planningSalesOfficeTeamName" className="col-sm-3 col-form-label">企画営業所 <br />チーム名</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="planningSalesOfficeTeamName" placeholder="例）スポーツ"
                                    {...register("planningSalesOfficeTeamName")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="contactPersonName" className="col-sm-3 col-form-label">ご担当者様<br />お名前</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="contactPersonName" placeholder="例）山田花子"
                                    {...register("contactPersonName")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="contactPersonEmail" className="col-sm-3 col-form-label">ご担当者様<br />メールアドレス</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="contactPersonEmail" placeholder="例）kinoshita@ken-net.net"
                                    {...register("contactPersonEmail")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="numberOfDevices" className="col-sm-3 col-form-label">利用端末数</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="numberOfDevices" placeholder="例）30"
                                    {...register("numberOfDevices")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="numberOfTransmitters" className="col-sm-3 col-form-label">送信機必要端末数</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="numberOfTransmitters" placeholder="例）2"
                                    {...register("numberOfTransmitters")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="departureDate" className="col-sm-3 col-form-label">出発日</label>
                            <div className="col-sm-9">
                                <input type="date" className="form-control" id="departureDate" placeholder="例）2025年4月4日"
                                    {...register("departureDate", { required: "出発日を入力してください。" })}
                                />
                                {errors.departureDate && <p style={{ color: "red" }}>{errors.departureDate.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="returnDate" className="col-sm-3 col-form-label">帰着日</label>
                            <div className="col-sm-9">
                                <input type="date" className="form-control" id="returnDate" placeholder="例）2025年4月4日"
                                    {...register("returnDate", { required: "帰着日を入力してください。" })}
                                />
                                {errors.returnDate && <p style={{ color: "red" }}>{errors.returnDate.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="qrCodeDestination" className="col-sm-3 col-form-label">QRコード送付先</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="qrCodeDestination" placeholder="例）ご担当者様のメールアドレス"
                                    {...register("qrCodeDestination")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="emailCustomer" className="col-sm-3 col-form-label">メールアドレス</label>
                            <div className="col-sm-9">
                                <input type="text" className="form-control" id="emailCustomer" placeholder=""
                                    {...register("emailCustomer")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="phoneNumberCustomer" className="col-sm-3 col-form-label">電話番号</label>
                            <div className="col-sm-9">
                                <input type="tel" className="form-control" id="phoneNumberCustomer" placeholder=""
                                    {...register("phoneNumberCustomer")}
                                />
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="otherRemarks" className="col-sm-3 col-form-label">その他備考欄</label>
                            <div className="col-sm-9">
                                <textarea className="form-control" id="otherRemarks"
                                    {...register("otherRemarks")}
                                ></textarea>
                            </div>
                        </div>
                        <div className="text-center mt-5">
                            <Link href="/tour_list" type="submit" className="btn btn-outline-danger" style={{ "marginRight": "50px" }}>戻る</Link>
                            <button type="submit" className="btn btn-danger">登録</button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default TourCreation;