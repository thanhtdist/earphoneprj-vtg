import { useState, useRef, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import {
    listTours,
    createBatchTour,
    deleteTour
} from '../../../apis/admin';
import { useEffect } from 'react';
import Sidebar from '../common/Sidebar';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
//import { createMeetingAndChannel } from '../../utils/MeetingUtils';
import ConfirmModal from '../../popup/ConfirmModal';
import { toast } from "react-toastify";
import Loading from '../../Loading';
import ReactPaginate from 'react-paginate';
import Config from '../../../utils/config'; // Importing the configuration file
import { FaCheck } from "react-icons/fa6";
import Encoding from 'encoding-japanese';
import ErrorDetailModal from './ErrorDetailModal';

const ListTour = () => {
    // Show error detail modal when there are errors in the uploaded CSV
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorRows, setErrorRows] = useState([]);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [tours, setTours] = useState([]);
    const [totalTours, setTotalTours] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    // handle upload csv
    const [showUploadConfirm, setShowUploadConfirm] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedTour, setSelectedTour] = useState({ tourId: null, tourNumber: null });
    const [query, setQuery] = useState('');
    const itemsPerPage = 10;
    const countPage = Math.ceil(totalTours / itemsPerPage);
    // Get list tours
    const getListTour = useCallback(async (data, page = 1) => {
        setIsLoading(true);
        const listoursResponse = await listTours({
            page: page,
            pageSize: 10,
            query: data,
        });
        console.log("listoursResponse xxx", listoursResponse);
        setTours(listoursResponse.data.items);
        setTotalTours(listoursResponse.data.count);
        setIsLoading(false);
    }, []);

    // Get list tours
    useEffect(() => {
        getListTour('');
    }, [getListTour]);

    // Handle search change
    const handleSearchChange = (e) => {
        setQuery(e.target.value);
    };

    // Handle search click
    const handleSearchClick = () => {
        console.log("Search query:", query);
        // Call API to search tours
        // setItemOffset(0);
        getListTour(query);
        setCurrentPage(1);
    };

    // export tours to csv
    const handleExportToCSV = () => {
        try {
            if (tours.length === 0) {
                alert("No data found to export!");
                return;
            }

            console.log("Tour export???", tours);

            const csvRows = [];
            const headers = [
                "Tour Number",
                "Course Name",
                "Planning and sales signature",
                "Planning Sales Office Team Name",
                "Departure Date",
                "Return date",
                "Name of course person in charge",
                "Tour conductor's name",
                "Number of receivers in use",
                "Number of sending devices",
                "Sub-guide function available (yes/no)",
                "Use the translation function",
                "Co-sponsored course number",
            ];
            csvRows.push(headers.join(",")); // Add headers

            tours.forEach((tour) => {
                const values = [
                    tour.tourNumber,
                    tour.courseName,
                    tour.planningAndSalesSignature,
                    tour.planningSalesOfficeTeamName,
                    tour.departureDate,
                    tour.returnDate,
                    tour.nameOfCoursePersonInCharge,
                    tour.tourConductorName,
                    tour.numberOfReceiversInUse,
                    tour.numberOfSendingDevices,
                    tour.subGuideFunctionAvailable,
                    tour.useTheTranslationFunction,
                    tour.coSponsoredCourseNumber,
                ];
                csvRows.push(values.join(","));
            });

            const csvString = csvRows.join("\n");
            const blob = new Blob([csvString], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "tours.csv";
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.log("Error exporting tours:", error); // Log error
        }

    };

    // Upload CSV file to create batch tours
    const handleUploadCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setShowUploadConfirm(true);
        fileInputRef.current.value = null;
    };

    const confirmUploadCSV = (e) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            // Step 1: convert file to byte array
            const arrayBuffer = event.target.result;
            const uint8Array = new Uint8Array(arrayBuffer);

            // Step 2: Detect encoding
            const encoding = Encoding.detect(uint8Array); // Usually Shift_JIS or CP932

            // Step 3: Convert to Unicode string (UTF-8)
            const utf8String = Encoding.convert(uint8Array, {
                to: 'UNICODE',
                from: encoding,
                type: 'string',
            });

            // Step 4: Parse CSV content with PapaParse
            Papa.parse(utf8String, {
                skipEmptyLines: true,
                complete: async (results) => {
                    console.log("Parsed CSV:", results.data);

                    try {
                        const cleanedRows = results.data.filter(
                            (row) => row.some(cell => String(cell).trim() !== "")
                        );

                        const parsedData = cleanedRows.slice(1).map((cols) => ({
                            tourNumber: cols[0] || "",
                            courseName: cols[1] || "",
                            planningAndSalesSignature: cols[2] || "",
                            planningSalesOfficeTeamName: cols[3] || "",
                            departureDate: cols[4] || "",
                            returnDate: cols[5] || "",
                            nameOfCoursePersonInCharge: cols[6] || "",
                            tourConductorName: cols[7] || "",
                            numberOfReceiversInUse: cols[8] || "",
                            numberOfSendingDevices: cols[9] || "",
                            subGuideFunctionAvailable: cols[10] || "",
                            useTheTranslationFunction: cols[11] || "",
                            coSponsoredCourseNumber: cols[12] || "",
                            chatRestriction: cols[13] || "allChat",
                        }));

                        callCreateBatchTour(parsedData);
                    } catch (error) {
                        console.log("Error uploading CSV:", error);
                    }
                },
            });

            setShowUploadConfirm(false);
        };

        // ✅ Read file as ArrayBuffer (for encoding detection)
        reader.readAsArrayBuffer(selectedFile);
    };


    // Handle CSV button click
    const handleCSVButtonClick = () => {
        fileInputRef.current.click(); // Gọi click trên input file ẩn
    };

    // Handle delete tour
    const handleDeleteTour = async (tourId, tourNumber) => {
        setSelectedTour({ tourId: tourId, tourNumber: tourNumber });
        setShowDeleteConfirm(true);
    };

    const handleCloseDeleteConfirm = () => {
        setShowDeleteConfirm(false);
    };

    const handleDeleteConfirmed = async () => {
        try {
            setIsLoading(true);
            setShowDeleteConfirm(false);
            console.log("Deleting tour:", selectedTour.tourNumber);
            const deleteTourResponse = await deleteTour(selectedTour);
            console.log(deleteTourResponse);
            toast.success(`Tour ${selectedTour.tourNumber} was deleted successfully.`, {
                onClose: () => {
                    navigate(0); // Reload the page to see the updated tours
                },
            });
        } catch (error) {
            console.log("Error deleting tour:", error); // Log error
        } finally {
            setIsLoading(false);
        }
    };

    // Call create batch tour API
    const callCreateBatchTour = async (tours) => {
        try {
            setIsLoading(true);
            console.log("createBatchTour", tours);
            const createBatchTourResponse = await createBatchTour(tours);
            console.log("createBatchTourResponse", createBatchTourResponse);
            // Show success message
            toast.success(`File ${selectedFile?.name} was uploaded successfully.`, {
                onClose: () => {
                    navigate(0); // Reload the page to see the new tours    
                },
            });
        } catch (error) {
            console.error("Error creating batch tour:", error); // Log error
            setErrorRows(error.data);
            setShowErrorModal(true);

        } finally {
            setIsLoading(false);
        }

    };
    const handlePageClick = (event) => {
        const newPage = event.selected + 1; // `selected` starts from 0
        //setCurrentPage(newPage);
        console.log("handlePageClick Current query:", query);
        console.log("handlePageClick Page clicked:", newPage);
        // Call API to get tours for the selected page
        setCurrentPage(newPage);
        getListTour(query, newPage);
        //const newOffset = event.selected * itemsPerPage % tours.length;
        //setItemOffset(newOffset);
    };
    return (
        <div>
            <div className="container-fluid">
                <div className="row py-4"></div>
                <Sidebar />
                <main className="px-4 px-sm-5 my-2">
                    <h1>ツアー管理</h1>
                    <Link to={`${Config.pathNames.registerTour}`} className="btn btn-danger mt-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
                            <g clipPath="url(#clip0_127_5011)">
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.25 17.0328C17.5172 15.9797 20.3125 12.2453 20.3125 7.8125C20.3125 5.7405 19.4894 3.75336 18.0243 2.28823C16.5591 0.8231 14.572 0 12.5 0C10.428 0 8.44086 0.8231 6.97573 2.28823C5.5106 3.75336 4.6875 5.7405 4.6875 7.8125C4.6875 12.2453 7.48281 15.9797 11.75 17.0328L11.3688 17.7937C11.3458 17.8397 11.3321 17.8898 11.3284 17.941C11.3248 17.9923 11.3313 18.0437 11.3475 18.0925C11.3803 18.191 11.4509 18.2723 11.5437 18.3188C11.6366 18.3652 11.744 18.3728 11.8425 18.34C11.941 18.3072 12.0223 18.2366 12.0687 18.1438L12.1312 18.0187C12.1453 18.2844 12.1688 18.5109 12.2109 18.7219C12.3172 19.2594 12.5359 19.6938 12.9109 20.4437L12.9312 20.4875C13.2625 21.1469 13.2156 21.8156 13.0094 22.4344C12.7984 23.0625 12.4375 23.6078 12.175 24.0016C12.1174 24.0878 12.0964 24.1933 12.1166 24.295C12.1368 24.3967 12.1966 24.4861 12.2828 24.5438C12.369 24.6014 12.4746 24.6224 12.5762 24.6021C12.6779 24.5819 12.7674 24.5221 12.825 24.4359L12.8313 24.425C13.0906 24.0375 13.5047 23.4156 13.75 22.6828C14 21.9344 14.0813 21.0406 13.6313 20.1375C13.2281 19.3328 13.0609 18.9937 12.9766 18.5688C12.9481 18.4196 12.9288 18.2687 12.9187 18.1172L12.9312 18.1438C12.9777 18.2366 13.059 18.3072 13.1575 18.34C13.256 18.3728 13.3634 18.3652 13.4563 18.3188C13.5491 18.2723 13.6197 18.191 13.6525 18.0925C13.6853 17.994 13.6777 17.8866 13.6313 17.7937L13.25 17.0328ZM6.8 5.24375C7.2408 4.26753 7.92485 3.42084 8.78664 2.78475C9.64844 2.14866 10.6591 1.74449 11.7219 1.61094C12.1469 1.55781 12.5 1.9125 12.5 2.34375C12.5 2.775 12.1469 3.11875 11.7219 3.19063C10.2375 3.44375 8.98906 4.40937 8.32656 5.71719C8.25344 5.87229 8.13885 6.00415 7.99546 6.09818C7.85206 6.19221 7.68546 6.24476 7.51406 6.25C6.97344 6.25 6.57813 5.73594 6.8 5.24375Z" fill="white" />
                            </g>
                            <defs>
                                <clipPath id="clip0_127_5011">
                                    <rect width="25" height="25" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                        ツアー登録
                    </Link>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleUploadCSV}
                        style={{ display: 'none' }} // Hidden input file
                    />
                    <button className="btn btn-danger mt-3 mx-3" onClick={handleCSVButtonClick}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12.5 15.6C16.2547 14.8531 18.75 11.6875 18.75 7.8125C18.75 6.1549 18.0915 4.56519 16.9194 3.39308C15.7473 2.22098 14.1576 1.5625 12.5 1.5625C10.8424 1.5625 9.25268 2.22098 8.08058 3.39308C6.90848 4.56519 6.25 6.1549 6.25 7.8125C6.25 11.6875 8.74531 14.8531 12.5 15.6ZM20.3125 7.8125C20.3125 12.2453 17.5172 15.9797 13.25 17.0328L13.6313 17.7937C13.6777 17.8866 13.6853 17.994 13.6525 18.0925C13.6197 18.191 13.5491 18.2723 13.4563 18.3188C13.3634 18.3652 13.256 18.3728 13.1575 18.34C13.059 18.3072 12.9777 18.2366 12.9312 18.1438L12.9187 18.1172C12.9312 18.2891 12.95 18.4328 12.9766 18.5703C13.0609 18.9922 13.2281 19.3328 13.6313 20.1375C14.0813 21.0406 13.9984 21.9344 13.75 22.6828C13.5047 23.4156 13.0906 24.0375 12.8313 24.425L12.825 24.4359C12.7965 24.4786 12.7598 24.5153 12.7171 24.5438C12.6745 24.5723 12.6266 24.5921 12.5762 24.6021C12.5259 24.6121 12.4741 24.6121 12.4237 24.6021C12.3734 24.5921 12.3255 24.5723 12.2828 24.5438C12.2401 24.5152 12.2035 24.4786 12.175 24.4359C12.1465 24.3932 12.1266 24.3453 12.1166 24.295C12.1066 24.2446 12.1066 24.1928 12.1166 24.1425C12.1266 24.0921 12.1465 24.0442 12.175 24.0016C12.4375 23.6078 12.8 23.0641 13.0078 22.4344C13.2156 21.8156 13.2625 21.1469 12.9312 20.4875L12.9109 20.4437C12.5359 19.6938 12.3172 19.2594 12.2109 18.7219C12.1672 18.4897 12.14 18.2548 12.1297 18.0187L12.0672 18.1438C12.0444 18.19 12.0128 18.2313 11.974 18.2653C11.9352 18.2993 11.8901 18.3252 11.8412 18.3417C11.7924 18.3581 11.7408 18.3647 11.6893 18.3611C11.6379 18.3575 11.5877 18.3438 11.5416 18.3207C11.4955 18.2976 11.4545 18.2656 11.4208 18.2266C11.3871 18.1875 11.3615 18.1422 11.3454 18.0932C11.3294 18.0442 11.3232 17.9925 11.3272 17.9412C11.3312 17.8898 11.3453 17.8397 11.3688 17.7937L11.75 17.0328C7.48281 15.9797 4.6875 12.2453 4.6875 7.8125C4.6875 5.7405 5.5106 3.75336 6.97573 2.28823C8.44086 0.8231 10.428 0 12.5 0C14.572 0 16.5591 0.8231 18.0243 2.28823C19.4894 3.75336 20.3125 5.7405 20.3125 7.8125ZM9.47187 7.03906C9.61114 6.49567 9.8939 5.9997 10.2906 5.60305C10.6872 5.2064 11.1832 4.92364 11.7266 4.78438C12.1453 4.67812 12.5 4.3375 12.5 3.90625C12.5 3.475 12.1469 3.11875 11.7219 3.18906C10.7613 3.35164 9.87507 3.8092 9.18629 4.49826C8.49751 5.18732 8.04031 6.07369 7.87812 7.03437C7.80625 7.45937 8.1625 7.8125 8.59375 7.8125C9.025 7.8125 9.36562 7.45781 9.47187 7.03906Z" fill="white" />
                        </svg>
                        CSV一括登録
                    </button>

                    <div className="d-flex mt-4 justify-content-between">
                        <div className="search-box d-flex col-4">
                            <input type="text" className="form-control" id="search" onChange={handleSearchChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearchClick();
                                    }
                                }}
                            ></input>
                            <button type="button" className="btn btn-secondary" onClick={handleSearchClick}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 18" fill="none">
                                    <g clipPath="url(#clip0_2002_3291)">
                                        <path d="M11.7419 10.3431C12.7102 9.02181 13.1439 7.38361 12.9562 5.75627C12.7685 4.12893 11.9733 2.63246 10.7297 1.56625C9.48604 0.500045 7.88567 -0.0572725 6.24876 0.00580065C4.61184 0.0688738 3.05911 0.747686 1.90119 1.90643C0.743273 3.06518 0.0655718 4.6184 0.00366997 6.25536C-0.0582319 7.89231 0.500231 9.49228 1.56733 10.7352C2.63443 11.9781 4.13147 12.7722 5.75894 12.9587C7.38641 13.1452 9.0243 12.7104 10.3449 11.7411H10.3439C10.3739 11.7811 10.4059 11.8191 10.4419 11.8561L14.2919 15.7061C14.4794 15.8938 14.7338 15.9992 14.9991 15.9993C15.2643 15.9994 15.5188 15.8941 15.7064 15.7066C15.8941 15.5191 15.9995 15.2647 15.9996 14.9995C15.9997 14.7342 15.8944 14.4798 15.7069 14.2921L11.8569 10.4421C11.8212 10.4059 11.7827 10.3725 11.7419 10.3421V10.3431ZM11.9999 6.49912C11.9999 7.22139 11.8577 7.93659 11.5813 8.60388C11.3049 9.27117 10.8997 9.87749 10.389 10.3882C9.87829 10.8989 9.27197 11.3041 8.60468 11.5805C7.93739 11.8569 7.22219 11.9991 6.49992 11.9991C5.77765 11.9991 5.06245 11.8569 4.39516 11.5805C3.72787 11.3041 3.12156 10.8989 2.61083 10.3882C2.10011 9.87749 1.69498 9.27117 1.41858 8.60388C1.14218 7.93659 0.999921 7.22139 0.999921 6.49912C0.999921 5.04043 1.57938 3.64149 2.61083 2.61004C3.64228 1.57859 5.04123 0.999124 6.49992 0.999124C7.95861 0.999124 9.35756 1.57859 10.389 2.61004C11.4205 3.64149 11.9999 5.04043 11.9999 6.49912Z" fill="white" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_2002_3291">
                                            <rect width="16" height="16" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                        <div>
                            <button className="btn btn-outline-dark" onClick={handleExportToCSV}>CSV出力</button>
                        </div>
                    </div>

                    <div className="mt-4 overscroll">
                        <table className="table table-striped table-bordered mx-auto">
                            <thead className="text-center">
                                <tr>
                                    <th scope="col" className="sticky"></th>
                                    <th scope="col" className="sticky2"></th>
                                    <th scope="col">ツアー番号</th>
                                    <th scope="col">コース名</th>
                                    <th scope="col">企画営業署名</th>
                                    <th scope="col">企画営業所チーム名</th>
                                    <th scope="col">出発日</th>
                                    <th scope="col">帰着日</th>
                                    <th scope="col">コースご担当者様氏名</th>
                                    <th scope="col">添乗員様氏名</th>
                                    <th scope="col">受信機側利用台数</th>
                                    <th scope="col">送信側利用台数</th>
                                    <th scope="col">サブガイド機能利用(有・無）</th>
                                    <th scope="col">翻訳機能利用</th>
                                    <th scope="col">共催コース番号</th>

                                </tr>
                            </thead>
                            <tbody>
                                {tours && tours.map((tour, index) => (
                                    <tr key={index}>
                                        <th className="sticky">
                                            <Link to={`${Config.pathNames.tour}/${tour.tourId}`}>
                                                <button type="button" className="btn edit">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 20" fill="none">
                                                        <path d="M12.8538 0.146271C12.76 0.0525356 12.6329 -0.00012207 12.5003 -0.00012207C12.3677 -0.00012207 12.2406 0.0525356 12.1468 0.146271L10.4998 1.79327L14.2068 5.50027L15.8538 3.85427C15.9004 3.80783 15.9373 3.75265 15.9625 3.6919C15.9877 3.63116 16.0007 3.56604 16.0007 3.50027C16.0007 3.4345 15.9877 3.36938 15.9625 3.30864C15.9373 3.24789 15.9004 3.19272 15.8538 3.14627L12.8538 0.146271ZM13.4998 6.20727L9.79281 2.50027L3.29281 9.00027H3.49981C3.63241 9.00027 3.75959 9.05295 3.85336 9.14672C3.94713 9.24049 3.99981 9.36766 3.99981 9.50027V10.0003H4.49981C4.63241 10.0003 4.75959 10.0529 4.85336 10.1467C4.94713 10.2405 4.99981 10.3677 4.99981 10.5003V11.0003H5.49981C5.63241 11.0003 5.75959 11.0529 5.85336 11.1467C5.94713 11.2405 5.99981 11.3677 5.99981 11.5003V12.0003H6.49981C6.63241 12.0003 6.75959 12.0529 6.85336 12.1467C6.94713 12.2405 6.99981 12.3677 6.99981 12.5003V12.7073L13.4998 6.20727ZM6.03181 13.6753C6.01076 13.6193 5.99993 13.56 5.99981 13.5003V13.0003H5.49981C5.3672 13.0003 5.24002 12.9476 5.14625 12.8538C5.05248 12.7601 4.99981 12.6329 4.99981 12.5003V12.0003H4.49981C4.3672 12.0003 4.24002 11.9476 4.14625 11.8538C4.05248 11.7601 3.99981 11.6329 3.99981 11.5003V11.0003H3.49981C3.3672 11.0003 3.24002 10.9476 3.14625 10.8538C3.05248 10.7601 2.99981 10.6329 2.99981 10.5003V10.0003H2.49981C2.44003 10.0002 2.38075 9.98933 2.32481 9.96827L2.14581 10.1463C2.09816 10.1943 2.06073 10.2514 2.03581 10.3143L0.0358061 15.3143C-0.000564594 15.4051 -0.0094681 15.5047 0.0101994 15.6006C0.0298668 15.6964 0.0772403 15.7844 0.146447 15.8536C0.215653 15.9228 0.303649 15.9702 0.399526 15.9899C0.495402 16.0095 0.594942 16.0006 0.685806 15.9643L5.68581 13.9643C5.74867 13.9393 5.80582 13.9019 5.85381 13.8543L6.03181 13.6763V13.6753Z" fill="#0D6EFD" />
                                                    </svg>
                                                    編集
                                                </button>
                                            </Link>
                                        </th>
                                        <th className="sticky2">
                                            <button type="button" className="btn remove" onClick={() => handleDeleteTour(tour.tourId, tour.tourNumber)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 16 20" fill="none">
                                                    <path d="M5.50098 1H8.50098C8.63358 1 8.76076 1.05268 8.85453 1.14645C8.9483 1.24021 9.00098 1.36739 9.00098 1.5V2.5H5.00098V1.5C5.00098 1.36739 5.05366 1.24021 5.14742 1.14645C5.24119 1.05268 5.36837 1 5.50098 1ZM10.001 2.5V1.5C10.001 1.10218 9.84294 0.720644 9.56164 0.43934C9.28033 0.158035 8.8988 0 8.50098 0L5.50098 0C5.10315 0 4.72162 0.158035 4.44032 0.43934C4.15901 0.720644 4.00098 1.10218 4.00098 1.5V2.5H1.50698C1.50364 2.49997 1.50031 2.49997 1.49698 2.5H0.500977C0.368368 2.5 0.241191 2.55268 0.147423 2.64645C0.053655 2.74021 0.000976563 2.86739 0.000976562 3C0.000976563 3.13261 0.053655 3.25979 0.147423 3.35355C0.241191 3.44732 0.368368 3.5 0.500977 3.5H1.03898L1.89198 14.16C1.9322 14.6612 2.15973 15.1289 2.52925 15.4698C2.89877 15.8108 3.38317 16.0001 3.88598 16H10.116C10.6188 16.0001 11.1032 15.8108 11.4727 15.4698C11.8422 15.1289 12.0698 14.6612 12.11 14.16L12.963 3.5H13.501C13.6336 3.5 13.7608 3.44732 13.8545 3.35355C13.9483 3.25979 14.001 3.13261 14.001 3C14.001 2.86739 13.9483 2.74021 13.8545 2.64645C13.7608 2.55268 13.6336 2.5 13.501 2.5H12.506C12.5026 2.49997 12.4993 2.49997 12.496 2.5H10.001ZM11.959 3.5L11.113 14.08C11.0929 14.3306 10.9791 14.5644 10.7943 14.7349C10.6096 14.9054 10.3674 15.0001 10.116 15H3.88598C3.63457 15.0001 3.39237 14.9054 3.20761 14.7349C3.02285 14.5644 2.90909 14.3306 2.88898 14.08L2.04298 3.5H11.959ZM4.47198 4.5C4.60431 4.49235 4.73426 4.53756 4.83327 4.6257C4.93228 4.71383 4.99224 4.83767 4.99998 4.97L5.49998 13.47C5.50523 13.6008 5.45899 13.7284 5.37119 13.8255C5.28339 13.9225 5.16103 13.9813 5.03039 13.9892C4.89974 13.997 4.77122 13.9533 4.67242 13.8675C4.57362 13.7816 4.51243 13.6605 4.50198 13.53L4.00098 5.03C3.99692 4.96431 4.00586 4.89847 4.02731 4.83625C4.04875 4.77403 4.08226 4.71665 4.12593 4.66741C4.1696 4.61817 4.22255 4.57804 4.28176 4.54931C4.34098 4.52058 4.40528 4.50382 4.47098 4.5H4.47198ZM9.52998 4.5C9.59568 4.50382 9.65998 4.52058 9.71919 4.54931C9.7784 4.57804 9.83136 4.61817 9.87502 4.66741C9.91869 4.71665 9.9522 4.77403 9.97365 4.83625C9.99509 4.89847 10.004 4.96431 9.99998 5.03L9.49998 13.53C9.49731 13.5964 9.48141 13.6617 9.45322 13.7219C9.42502 13.7821 9.3851 13.8361 9.33578 13.8807C9.28647 13.9254 9.22875 13.9597 9.166 13.9817C9.10326 14.0037 9.03675 14.013 8.97037 14.009C8.90399 14.005 8.83908 13.9878 8.77943 13.9585C8.71977 13.9291 8.66658 13.8881 8.62296 13.8379C8.57935 13.7877 8.54618 13.7293 8.5254 13.6661C8.50463 13.603 8.49667 13.5363 8.50198 13.47L9.00198 4.97C9.00971 4.83767 9.06967 4.71383 9.16868 4.6257C9.26769 4.53756 9.39764 4.49235 9.52998 4.5ZM7.00098 4.5C7.13358 4.5 7.26076 4.55268 7.35453 4.64645C7.4483 4.74021 7.50098 4.86739 7.50098 5V13.5C7.50098 13.6326 7.4483 13.7598 7.35453 13.8536C7.26076 13.9473 7.13358 14 7.00098 14C6.86837 14 6.74119 13.9473 6.64742 13.8536C6.55366 13.7598 6.50098 13.6326 6.50098 13.5V5C6.50098 4.86739 6.55366 4.74021 6.64742 4.64645C6.74119 4.55268 6.86837 4.5 7.00098 4.5Z" fill="#DC3545" />
                                                </svg>
                                                削除
                                            </button>
                                        </th>
                                        <td><Link to={`${Config.pathNames.tour}/${tour.tourId}`}>{tour.tourNumber}</Link></td>
                                        <td>{tour.courseName}</td>
                                        <td>{tour.planningAndSalesSignature}</td>
                                        <td>{tour.planningSalesOfficeTeamName}</td>
                                        <td>{tour.departureDate}</td>
                                        <td>{tour.returnDate}</td>
                                        <td>{tour.nameOfCoursePersonInCharge}</td>
                                        <td>{tour.tourConductorName}</td>
                                        <td>{tour.numberOfReceiversInUse}</td>
                                        <td>{tour.numberOfSendingDevices}</td>
                                        <td>{tour.subGuideFunctionAvailable && <FaCheck />}</td>
                                        <td>{tour.useTheTranslationFunction && <FaCheck />}</td>
                                        <td>{tour.coSponsoredCourseNumber}</td>
                                    </tr>
                                ))}
                                {/* {tours.length === 0 && (
                                    <tr>
                                        <td colSpan="18" className="text-center">データがありません。</td>
                                    </tr>
                                )} */}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4">
                        <nav aria-label="Page navigation example">
                            <ul className="pagination justify-content-center">
                                <ReactPaginate
                                    nextLabel=">"
                                    onPageChange={handlePageClick}
                                    pageRangeDisplayed={3}
                                    marginPagesDisplayed={2}
                                    pageCount={countPage}
                                    previousLabel="<"
                                    pageClassName="page-item"
                                    pageLinkClassName="page-link"
                                    previousClassName="page-item"
                                    previousLinkClassName="page-link"
                                    nextClassName="page-item"
                                    nextLinkClassName="page-link"
                                    breakLabel="..."
                                    breakClassName="page-item"
                                    breakLinkClassName="page-link"
                                    containerClassName="pagination"
                                    activeClassName="active"
                                    renderOnZeroPageCount={null}
                                    forcePage={currentPage - 1}
                                />
                            </ul>
                        </nav>

                        <div className="count text-center">
                            <p>全{totalTours}件</p>
                        </div>
                        {isLoading && <Loading />}
                    </div>
                </main>
            </div>
            {showUploadConfirm && (
                <ConfirmModal
                    show={showUploadConfirm}
                    bodyText={`Are you sure you want to upload this CSV: ${selectedFile?.name}?`}
                    confirmName="Upload"
                    handleConfirmed={confirmUploadCSV}
                    handleCloseConfirm={() => setShowUploadConfirm(false)}
                />
            )}
            {showDeleteConfirm === true && (
                <ConfirmModal
                    show={showDeleteConfirm}
                    bodyText={`Are you sure you want to delete this tour: ${selectedTour?.tourNumber}?`}
                    confirmName="Delete"
                    handleConfirmed={handleDeleteConfirmed}
                    handleCloseConfirm={handleCloseDeleteConfirm}
                />
            )}
            {showErrorModal && (
                <ErrorDetailModal
                    show={showErrorModal}
                    errors={errorRows}
                    onClose={() => setShowErrorModal(false)}
                />
            )}

        </div>

    );
};

export default ListTour;