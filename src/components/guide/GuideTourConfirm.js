import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import Config from '../../utils/config';

const GuideTourConfirm = ({ tour }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="text-center mb-4">
            <span className='titleLiveSession'
            >
              {t('pageTitles.guide')}
            </span>
          </div>
          {tour?.meetingId && (
            <div className="text-center mb-4"
              style={{
                color: "#C60226",
                background: "#C602260D"
              }}>
              <img
                src="/images/exclamation-circle-fill.svg"
                alt="Exclamation Icon"
                style={{ width: "1.5rem", marginRight: "0.5rem" }}
              />
              <strong>{t('startGuidePage.joinedGuide')}</strong>
            </div>
          )}

          <div className="mb-3">
            <h5 className="fw-bold">{t('startGuidePage.courseName')}</h5>
            <div className="border-bottom pb-2">{tour?.courseName}</div>
          </div>

          <div className="mb-3">
            <h5 className="fw-bold">{t('startGuidePage.startDate')}</h5>
            <div className="border-bottom pb-2">{tour?.departureDate}</div>
          </div>

          <div className="mb-4">
            <h5 className="fw-bold">{t('startGuidePage.endDate')}</h5>
            <div className="border-bottom pb-2">{tour?.returnDate}</div>
          </div>
          <div className="my-4">
            <p className="mb-1">{t('startGuidePage.tourConfirm.isTourSetting')}</p>
            <p>{t('startGuidePage.tourConfirm.customerScanQRCode')}</p>
          </div>

          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="agreeCheck"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
            />
            <label className="form-check-label" htmlFor="agreeCheck">
              {t('startGuidePage.tourConfirm.iUnderstand')}
            </label>
          </div>

          <div className="text-center">
            <button
              className="btn btn-danger w-100"
              disabled={!agreed}
              onClick={() => {
                // Handle the button click event here
                // For example, navigate to the guide screen or perform an action
                navigate(`${Config.pathNames.guide}/${tour?.tourId}`);
              }}
            >
              {t('startGuidePage.startBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuideTourConfirm;
