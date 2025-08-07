import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import Config from '../../../utils/config';

import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import GenerateQRCode from '../tours/GenerateQRCode';
const TourForm = ({ onSubmit, defaultValues }) => {
    // const bookTourFunc = false;
    // const updateTourFunc = false;
    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        reset
    } = useForm({ defaultValues });
    useEffect(() => {
        console.log('defaultValuesTour', defaultValues);

        if (defaultValues) {
            reset(defaultValues);
        }
    }, [defaultValues, reset]);
    // const onSubmit = (data) => {
    //     console.log('data',data);

    // };

    // Book a new tour
    // const bookTour = async (data) => {
    //     try {
    //         // Create the tour with meetingId and channelId
    //         const createTourResponse = await createTour(data);
    //         console.log('Tour created:', createTourResponse);
    //         // Show success message
    //         toast.success(`Tour ${data.tourNumber} was created successfully.`, {
    //             onClose: () => {
    //                 navigate(Config.pathNames.tour);
    //             },
    //         });
    //     } catch (error) {
    //         console.error('Error creating tour:', error.message);
    //         console.error('Error creating tour:', error.statusCode);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

    const CustomInput = React.forwardRef(({ value, onClick, lable }, ref) => (
        <input
            className='date-picker'
            type="text"
            onClick={onClick}
            value={value}
            readOnly
            ref={ref}
            placeholder={lable === "acceptanceDate" ? "" : ""}
        />
    ));

    return (

        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group row mb-3">
                <label htmlFor="chatRestriction" className="col-sm-4 col-form-label">チャットの制限</label>
                <div className="col-sm-8">
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
                <label htmlFor="tourNumber" className="col-sm-4 col-form-label">ツアー番号</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="tourNumber" placeholder=""
                        {...register("tourNumber", { required: "ツアー番号を入力してください。" })}
                    />
                    {errors.tourNumber && <p style={{ color: "red" }}>{errors.tourNumber.message}</p>}
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="courseName" className="col-sm-4 col-form-label">コース名</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="courseName" placeholder=""
                        {...register("courseName", { required: "" })}
                    />
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="planningAndSalesSignature" className="col-sm-4 col-form-label">企画営業署名</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="planningAndSalesSignature" placeholder=""
                        {...register("planningAndSalesSignature")}
                    />
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="planningSalesOfficeTeamName" className="col-sm-4 col-form-label">企画営業所チーム名</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="planningSalesOfficeTeamName" placeholder=""
                        {...register("planningSalesOfficeTeamName")}
                    />
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="departureDate" className="col-sm-4 col-form-label">出発日</label>
                <div className="col-sm-8">
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
                <label htmlFor="returnDate" className="col-sm-4 col-form-label">帰着日</label>
                <div className="col-sm-8">
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
                <label htmlFor="nameOfCoursePersonInCharge" className="col-sm-4 col-form-label">コースご担当者様氏名</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="nameOfCoursePersonInCharge" placeholder=""
                        {...register("nameOfCoursePersonInCharge")}
                    />

                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="tourConductorName" className="col-sm-4 col-form-label">添乗員様氏名</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="tourConductorName" placeholder=""
                        {...register("tourConductorName")}
                    />

                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="numberOfReceiversInUse" className="col-sm-4 col-form-label">受信機側利用台数</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="numberOfReceiversInUse" placeholder=""
                        {...register("numberOfReceiversInUse")}
                    />

                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="numberOfSendingDevices" className="col-sm-4 col-form-label">送信側利用台数</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="numberOfSendingDevices" placeholder=""
                        {...register("numberOfSendingDevices")}
                    />

                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="subGuideFunctionAvailable" className="col-sm-4 col-form-label">サブガイド機能利用（有・無）</label>
                <div className="col-sm-8">
                    <input type="checkbox" id="subGuideFunctionAvailable"
                        {...register("subGuideFunctionAvailable",)}
                    />
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="useTheTranslationFunction" className="col-sm-4 col-form-label">翻訳機能利用</label>
                <div className="col-sm-8">
                    <input type="checkbox" id="useTheTranslationFunction" placeholder=""
                        {...register("useTheTranslationFunction",)}
                    />
                </div>
            </div>
            <div className="form-group row mb-3">
                <label htmlFor="coSponsoredCourseNumber" className="col-sm-4 col-form-label">共催コース番号</label>
                <div className="col-sm-8">
                    <input type="text" className="form-control" id="coSponsoredCourseNumber" placeholder=""
                        {...register("coSponsoredCourseNumber",)}
                    />

                </div>
            </div>
            {defaultValues && <>
                <GenerateQRCode tourId={defaultValues.tourId} />
            </>
            }
            <div className="text-center mt-5">
                <Link to={`${Config.pathNames.tour}`} type="submit" className="btn btn-outline-danger" style={{ "marginRight": "50px" }}>戻る</Link>
                <button type="submit" className="btn btn-danger">{(defaultValues && defaultValues.tourId) ? '更新' : '登録'}</button>
            </div>
        </form>
    );
};

export default TourForm;