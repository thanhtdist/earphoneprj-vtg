import React, { 
    //useState 
} from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
// import '../styles/StartFindTour.css';
import Header from './Header';

const StartFindTour = () => {
    // const [tourNumber, setTourNumber] = useState('');
    // const [departureDate, setDepartureDate] = useState('');

    // const handleTourNumberChange = (e) => setTourNumber(e.target.value);
    // const handleDateChange = (e) => setDepartureDate(e.target.value);
    // const handleDisplayClick = () => {
    //     alert(`Tour Number: ${tourNumber}, Departure Date: ${departureDate}`);
    // };

    return (
        <>
            <Header />
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12">
                        <div className="">
                            <h3 className="text-center text-danger mb-4">ガイド専用ページ</h3>
                            <form>
                                <div className="mb-3">
                                    <label htmlFor="tourNumber" className="form-label">
                                        ツアー番号
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="tourNumber"
                                        placeholder="ツアー番号"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="departureDate" className="form-label">
                                        出発日
                                    </label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        id="departureDate"
                                    />
                                </div>
                                <button type="submit" className="btn btn-danger w-100">
                                    表示
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StartFindTour;