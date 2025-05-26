import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function TourDatePicker() {
  const [startDate, setStartDate] = useState(new Date());

  console.log("Selected date:", startDate);
  console.log("Selected local date:", startDate.toLocaleDateString());

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h2 className="text-xl font-bold mb-4">ガイド専用ページ</h2>

      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        placeholderText="出発日"
        className="border border-gray-300 rounded px-4 py-2 w-full max-w-xs text-center"
        dateFormat="yyyy-MM-dd"
      />

      <p className="mt-4 text-gray-600">選択された日付: {startDate.toLocaleDateString()}</p>
    </div>
  );
}

export default TourDatePicker;
