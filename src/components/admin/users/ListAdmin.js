import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import Sidebar from '../common/Sidebar';
import { Link } from 'react-router-dom';
import { deleteAdmin, listAdmins, activeAdmin } from '../../../apis/admin';
import { toast } from 'react-toastify';
import ConfirmModal from '../../popup/ConfirmModal';
import Loading from '../../Loading';
import ReactPaginate from 'react-paginate';
// import './../../../styles/Admin.css';
import Config from '../../../utils/config'; // Importing the configuration file

const ListAdmin = () => {
    const navigate = useNavigate();
    const [listAdmin, setListAdmin] = useState([]);
    const [query, setQuery] = useState('');
    const [countList, setCountList] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showActiveConfirm, setShowActiveConfirm] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState({ userId: null, userName: null });
    const [selectActiveAdmin, setSelectActiveAdmin] = useState({ userId: null, userName: null, password: null, active: null });
    const [isLoading, setIsLoading] = useState(false);
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const countPage = Math.ceil(countList / itemsPerPage);
    // function get all list admin
    const handleGetListAdmin = useCallback(async (data, page = 1) => {
        try {
            setIsLoading(true);
            console.log("pageeeee", page);
            console.log("dataaaaaa", data);
            const registerResponse = await listAdmins({
                page: page,
                pageSize: 10,
                query: data
            });
            console.log("responeLIST", registerResponse.data);
            setListAdmin(registerResponse.data);
            setCountList(registerResponse.count);
            setIsLoading(false);
        } catch (error) {
            console.log("error get list admin ", error);
        }

    }, []);
    useEffect(() => {
        handleGetListAdmin('');
    }, [handleGetListAdmin]);

    //function search admin by name 
    const handleSearchClick = () => {
        handleGetListAdmin(query);
        setCurrentPage(1);
    }
    // Handle search change
    const handleSearchChange = (e) => {
        setQuery(e.target.value);
    };

    // function display popup confirm delete message
    const displayCofirmDelete = async (userId, userName) => {
        setShowDeleteConfirm(true);
        setSelectedAdmin({ userId: userId, userName: userName });
    }

    //function delete admin with update flag delete = 1
    const handleDeleteAdmin = async () => {
        try {
            setIsLoading(true);
            setShowDeleteConfirm(false);
            const deleteResponse = await deleteAdmin(selectedAdmin.userId);
            console.log("Call API delete success:", deleteResponse);
            toast.success(`User ${selectedAdmin.userName} was deleted successfully.`, {
                onClose: () => {
                    console.log("deleteResponse", Config.pathNames.user);
                    navigate(0); // Redirect to admin list page after deletion
                },
            });
        } catch (error) {
            alert("Call API delete false:", error);
        } finally {
            setIsLoading(false);
        }
    }

    //function close popup confirm delete message
    const handleCloseDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setShowActiveConfirm(false);
    };
    // const [currentPage, setCurrentPage] = useState(1);
    // Invoke when user click to request another page.
    const handlePageClick = (event) => {
        const newPage = event.selected + 1;
        setCurrentPage(newPage);
        handleGetListAdmin(query, newPage);
    };

    const [nameActive, setNameActive] = useState('');
    const displayActivePopup = async (userId, active, userName) => {
        if (active === 1) {
            setSelectActiveAdmin({ userId: userId, active: 0, userName });
            setNameActive('Active');
        }
        else if (active === 0) {
            setSelectActiveAdmin({ userId: userId, active: 1, userName });
            setNameActive('Inactive');
        }
        // setSelectActiveAdmin({ userId: userId, active: active });
        setShowActiveConfirm(true);
    }
    const handleClickActive = async () => {
        try {
            const updateResponse = await activeAdmin(selectActiveAdmin);
            console.log("Call API update active success:", updateResponse);
            toast.success(`User  was ${nameActive} successfully.`, {
                onClose: () => {
                    navigate(0); // Redirect to admin list page after activation
                },
            });
        } catch (error) {
            console.log("error click active error ", error);
        }
    }
    return (
        <div>
            <div className="container-fluid">
                <div className="row py-4"></div>
                {/* <div id="sidebar"></div> */}
                <Sidebar />
                <nav></nav>
                <main className="px-4 px-sm-5 my-2">
                    <h1>管理者一覧</h1>
                    <Link to={`${Config.pathNames.registerUser}`} className="btn btn-danger mt-3 mx-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 30 28" fill="none">
                            <path d="M1.5625 21.875C1.5625 21.875 0 21.875 0 20.3125C0 18.75 1.5625 14.0625 9.375 14.0625C17.1875 14.0625 18.75 18.75 18.75 20.3125C18.75 21.875 17.1875 21.875 17.1875 21.875H1.5625ZM9.375 12.5C10.6182 12.5 11.8105 12.0061 12.6896 11.1271C13.5686 10.248 14.0625 9.0557 14.0625 7.8125C14.0625 6.5693 13.5686 5.37701 12.6896 4.49794C11.8105 3.61886 10.6182 3.125 9.375 3.125C8.1318 3.125 6.93951 3.61886 6.06044 4.49794C5.18136 5.37701 4.6875 6.5693 4.6875 7.8125C4.6875 9.0557 5.18136 10.248 6.06044 11.1271C6.93951 12.0061 8.1318 12.5 9.375 12.5Z" fill="white" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M21.0938 7.8125C21.301 7.8125 21.4997 7.89481 21.6462 8.04132C21.7927 8.18784 21.875 8.38655 21.875 8.59375V10.9375H24.2188C24.426 10.9375 24.6247 11.0198 24.7712 11.1663C24.9177 11.3128 25 11.5115 25 11.7188C25 11.926 24.9177 12.1247 24.7712 12.2712C24.6247 12.4177 24.426 12.5 24.2188 12.5H21.875V14.8438C21.875 15.051 21.7927 15.2497 21.6462 15.3962C21.4997 15.5427 21.301 15.625 21.0938 15.625C20.8865 15.625 20.6878 15.5427 20.5413 15.3962C20.3948 15.2497 20.3125 15.051 20.3125 14.8438V12.5H17.9688C17.7615 12.5 17.5628 12.4177 17.4163 12.2712C17.2698 12.1247 17.1875 11.926 17.1875 11.7188C17.1875 11.5115 17.2698 11.3128 17.4163 11.1663C17.5628 11.0198 17.7615 10.9375 17.9688 10.9375H20.3125V8.59375C20.3125 8.38655 20.3948 8.18784 20.5413 8.04132C20.6878 7.89481 20.8865 7.8125 21.0938 7.8125Z" fill="white" />
                        </svg>
                        管理者登録
                    </Link>

                    <div className="search-box mt-4 d-flex col-4">
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

                    <div className="mt-4 overscroll">
                        <table className="table table-striped table-bordered mx-auto">
                            <thead className="text-center">
                                <tr>
                                    <th scope="col" className="sticky"></th>
                                    <th scope="col" className="sticky2"></th>
                                    <th scope="col">名前</th>
                                    <th scope="col">メールアドレス</th>
                                    <th scope="col">権限</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listAdmin.map((admin, index) => (
                                    <tr key={index}>
                                        <th className="sticky">
                                            <Link to={admin.active === 1 ? "#" : `${Config.pathNames.user}/${admin.userId}`}
                                                className={admin.active === 1 ? "disabled-link" : ""}
                                            >
                                                {/* <button value={admin.userId} onClick={clickEdit} type="button" className="btn edit"> */}
                                                <button type="button" className="btn edit" >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 20" fill="none">
                                                        <path d="M12.8538 0.146271C12.76 0.0525356 12.6329 -0.00012207 12.5003 -0.00012207C12.3677 -0.00012207 12.2406 0.0525356 12.1468 0.146271L10.4998 1.79327L14.2068 5.50027L15.8538 3.85427C15.9004 3.80783 15.9373 3.75265 15.9625 3.6919C15.9877 3.63116 16.0007 3.56604 16.0007 3.50027C16.0007 3.4345 15.9877 3.36938 15.9625 3.30864C15.9373 3.24789 15.9004 3.19272 15.8538 3.14627L12.8538 0.146271ZM13.4998 6.20727L9.79281 2.50027L3.29281 9.00027H3.49981C3.63241 9.00027 3.75959 9.05295 3.85336 9.14672C3.94713 9.24049 3.99981 9.36766 3.99981 9.50027V10.0003H4.49981C4.63241 10.0003 4.75959 10.0529 4.85336 10.1467C4.94713 10.2405 4.99981 10.3677 4.99981 10.5003V11.0003H5.49981C5.63241 11.0003 5.75959 11.0529 5.85336 11.1467C5.94713 11.2405 5.99981 11.3677 5.99981 11.5003V12.0003H6.49981C6.63241 12.0003 6.75959 12.0529 6.85336 12.1467C6.94713 12.2405 6.99981 12.3677 6.99981 12.5003V12.7073L13.4998 6.20727ZM6.03181 13.6753C6.01076 13.6193 5.99993 13.56 5.99981 13.5003V13.0003H5.49981C5.3672 13.0003 5.24002 12.9476 5.14625 12.8538C5.05248 12.7601 4.99981 12.6329 4.99981 12.5003V12.0003H4.49981C4.3672 12.0003 4.24002 11.9476 4.14625 11.8538C4.05248 11.7601 3.99981 11.6329 3.99981 11.5003V11.0003H3.49981C3.3672 11.0003 3.24002 10.9476 3.14625 10.8538C3.05248 10.7601 2.99981 10.6329 2.99981 10.5003V10.0003H2.49981C2.44003 10.0002 2.38075 9.98933 2.32481 9.96827L2.14581 10.1463C2.09816 10.1943 2.06073 10.2514 2.03581 10.3143L0.0358061 15.3143C-0.000564594 15.4051 -0.0094681 15.5047 0.0101994 15.6006C0.0298668 15.6964 0.0772403 15.7844 0.146447 15.8536C0.215653 15.9228 0.303649 15.9702 0.399526 15.9899C0.495402 16.0095 0.594942 16.0006 0.685806 15.9643L5.68581 13.9643C5.74867 13.9393 5.80582 13.9019 5.85381 13.8543L6.03181 13.6763V13.6753Z" fill="#0D6EFD" />
                                                    </svg>
                                                    編集
                                                </button>
                                            </Link>
                                        </th>
                                        <th className="sticky2">
                                            <button type="button" className="btn remove"
                                                onClick={() => displayCofirmDelete(admin.userId, admin.userName)}
                                                disabled={admin.active === 1 ? true : false}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 16 20" fill="none">
                                                    <path d="M5.50098 1H8.50098C8.63358 1 8.76076 1.05268 8.85453 1.14645C8.9483 1.24021 9.00098 1.36739 9.00098 1.5V2.5H5.00098V1.5C5.00098 1.36739 5.05366 1.24021 5.14742 1.14645C5.24119 1.05268 5.36837 1 5.50098 1ZM10.001 2.5V1.5C10.001 1.10218 9.84294 0.720644 9.56164 0.43934C9.28033 0.158035 8.8988 0 8.50098 0L5.50098 0C5.10315 0 4.72162 0.158035 4.44032 0.43934C4.15901 0.720644 4.00098 1.10218 4.00098 1.5V2.5H1.50698C1.50364 2.49997 1.50031 2.49997 1.49698 2.5H0.500977C0.368368 2.5 0.241191 2.55268 0.147423 2.64645C0.053655 2.74021 0.000976563 2.86739 0.000976562 3C0.000976563 3.13261 0.053655 3.25979 0.147423 3.35355C0.241191 3.44732 0.368368 3.5 0.500977 3.5H1.03898L1.89198 14.16C1.9322 14.6612 2.15973 15.1289 2.52925 15.4698C2.89877 15.8108 3.38317 16.0001 3.88598 16H10.116C10.6188 16.0001 11.1032 15.8108 11.4727 15.4698C11.8422 15.1289 12.0698 14.6612 12.11 14.16L12.963 3.5H13.501C13.6336 3.5 13.7608 3.44732 13.8545 3.35355C13.9483 3.25979 14.001 3.13261 14.001 3C14.001 2.86739 13.9483 2.74021 13.8545 2.64645C13.7608 2.55268 13.6336 2.5 13.501 2.5H12.506C12.5026 2.49997 12.4993 2.49997 12.496 2.5H10.001ZM11.959 3.5L11.113 14.08C11.0929 14.3306 10.9791 14.5644 10.7943 14.7349C10.6096 14.9054 10.3674 15.0001 10.116 15H3.88598C3.63457 15.0001 3.39237 14.9054 3.20761 14.7349C3.02285 14.5644 2.90909 14.3306 2.88898 14.08L2.04298 3.5H11.959ZM4.47198 4.5C4.60431 4.49235 4.73426 4.53756 4.83327 4.6257C4.93228 4.71383 4.99224 4.83767 4.99998 4.97L5.49998 13.47C5.50523 13.6008 5.45899 13.7284 5.37119 13.8255C5.28339 13.9225 5.16103 13.9813 5.03039 13.9892C4.89974 13.997 4.77122 13.9533 4.67242 13.8675C4.57362 13.7816 4.51243 13.6605 4.50198 13.53L4.00098 5.03C3.99692 4.96431 4.00586 4.89847 4.02731 4.83625C4.04875 4.77403 4.08226 4.71665 4.12593 4.66741C4.1696 4.61817 4.22255 4.57804 4.28176 4.54931C4.34098 4.52058 4.40528 4.50382 4.47098 4.5H4.47198ZM9.52998 4.5C9.59568 4.50382 9.65998 4.52058 9.71919 4.54931C9.7784 4.57804 9.83136 4.61817 9.87502 4.66741C9.91869 4.71665 9.9522 4.77403 9.97365 4.83625C9.99509 4.89847 10.004 4.96431 9.99998 5.03L9.49998 13.53C9.49731 13.5964 9.48141 13.6617 9.45322 13.7219C9.42502 13.7821 9.3851 13.8361 9.33578 13.8807C9.28647 13.9254 9.22875 13.9597 9.166 13.9817C9.10326 14.0037 9.03675 14.013 8.97037 14.009C8.90399 14.005 8.83908 13.9878 8.77943 13.9585C8.71977 13.9291 8.66658 13.8881 8.62296 13.8379C8.57935 13.7877 8.54618 13.7293 8.5254 13.6661C8.50463 13.603 8.49667 13.5363 8.50198 13.47L9.00198 4.97C9.00971 4.83767 9.06967 4.71383 9.16868 4.6257C9.26769 4.53756 9.39764 4.49235 9.52998 4.5ZM7.00098 4.5C7.13358 4.5 7.26076 4.55268 7.35453 4.64645C7.4483 4.74021 7.50098 4.86739 7.50098 5V13.5C7.50098 13.6326 7.4483 13.7598 7.35453 13.8536C7.26076 13.9473 7.13358 14 7.00098 14C6.86837 14 6.74119 13.9473 6.64742 13.8536C6.55366 13.7598 6.50098 13.6326 6.50098 13.5V5C6.50098 4.86739 6.55366 4.74021 6.64742 4.64645C6.74119 4.55268 6.86837 4.5 7.00098 4.5Z" fill="#DC3545" />
                                                </svg>
                                                削除
                                            </button>
                                        </th>
                                        <td><a href="manager_detail.html"
                                            style={{ color: 'black', textDecoration: 'none' }}>{admin.userName}</a></td>
                                        <td className='email-admin'>{admin.email}</td>
                                        <td>{admin.active === 0 ? 'Active' : 'Inactive'}</td>
                                        <td>
                                            <button type="button" className="btn btn-primary" onClick={() => displayActivePopup(admin.userId, admin.active, admin.userName)}>{admin.active === 0 ? 'Inactive' : 'Active'}</button>

                                        </td>
                                    </tr>
                                ))}
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
                            <p>全{countList}件</p>
                        </div>
                    </div>
                    <div className="mt-4">

                    </div>
                    {isLoading && <Loading />}
                </main>
            </div>
            {showDeleteConfirm === true && (
                <ConfirmModal
                    show={showDeleteConfirm}
                    bodyText={`Are you sure you want to delete this user: ${selectedAdmin.userName} ?`}
                    confirmName="Delete"
                    handleConfirmed={handleDeleteAdmin}
                    handleCloseConfirm={handleCloseDeleteConfirm}
                />
            )}
            {showActiveConfirm === true && (
                <ConfirmModal
                    show={showActiveConfirm}
                    bodyText={`Are you sure you want to ${nameActive} this user: ${selectActiveAdmin.userName} ?`}
                    confirmName={nameActive}
                    handleConfirmed={handleClickActive}
                    handleCloseConfirm={handleCloseDeleteConfirm}
                />
            )}
        </div>
    );
};

export default ListAdmin;