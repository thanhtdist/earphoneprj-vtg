import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
//import { useTranslation } from 'react-i18next';
import { getMeetingByTourId } from '../../apis/api';
import NotFound from '../NotFound';
import JapaneseAudio from './JapaneseAudio';
import MultiLangAudio from './MultiLangAudio';
import Loading from '../Loading';

function LiveViewer() {
  const { tourId } = useParams();
  const [tour, setTour] = useState(undefined); // undefined = loading, null = not found, object = found
  // const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const checkTour = useCallback(async () => {
    try {
      const tourResponse = await getMeetingByTourId(tourId);
      if (tourResponse?.statusCode === 200) {
        setTour(tourResponse.data);
      } else {
        setTour(null);
      }
    } catch (error) {
      console.error('Error fetching tour:', error);
      setTour(null);
    } finally {
      setIsLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    setIsLoading(true);
    checkTour();
  }, [checkTour]);

  if (tour === undefined) {
    return (
      <>{isLoading && (
        // <div style={{ height: '100vh'}}>
        //   <div className="loading">
        //     <div className="spinner"></div>
        //     <p>{t('loading')}</p>
        //   </div>
        // </div>
        <Loading />
      )}</>
    );
  }

  if (tour === null) {
    return <NotFound />;
  }

  console.log('Tour data:', tour);

  return (
    <>
      {tour.useTheTranslationFunction === true ? (
        <MultiLangAudio />
      ) : (
        <JapaneseAudio />
      )}
    </>
  );
}

export default LiveViewer;
