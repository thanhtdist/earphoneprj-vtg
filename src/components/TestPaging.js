import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ReactPaginate from 'react-paginate';

function TestPaging() {
  const [tours, setTours] = useState([]);
  const [keyword, setKeyword] = useState('Vietnam');
  const [startDate, setStartDate] = useState('2025-05-01');
  const [pageKeys, setPageKeys] = useState([null]); // Index 0 = page 1
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const LIMIT = 5;

  const fetchPage = async (pageIndex) => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/tours', {
        params: {
          keyword,
          startDate,
          limit: LIMIT,
          lastKey: pageKeys[pageIndex] || undefined,
        },
      });

      setTours(res.data.items);

      // Nếu page tiếp theo tồn tại và chưa lưu key
      if (res.data.nextPageKey && pageKeys.length === pageIndex + 1) {
        setPageKeys(prev => [...prev, res.data.nextPageKey]);
        setPageCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(0);
    // eslint-disable-next-line
  }, []);

  const handlePageClick = (event) => {
    const pageIndex = event.selected;
    setCurrentPage(pageIndex);
    fetchPage(pageIndex);
  };

  return (
    <div className="container">
      <h2>Tour Search with Pagination</h2>

      <div className="search-bar">
        <input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Search by tour name"
        />
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
        <button onClick={() => {
          setPageKeys([null]);
          setCurrentPage(0);
          setPageCount(1);
          fetchPage(0);
        }}>
          Search
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <ul>
            {tours.map((tour, idx) => (
              <li key={idx}>
                <strong>{tour.tourName}</strong> — {tour.startDate}
              </li>
            ))}
          </ul>

          <ReactPaginate
            breakLabel="..."
            nextLabel="Next >"
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={pageCount}
            previousLabel="< Prev"
            forcePage={currentPage}
            renderOnZeroPageCount={null}
            containerClassName="pagination"
            activeClassName="active"
          />
        </>
      )}
    </div>
  );
}

export default TestPaging;
