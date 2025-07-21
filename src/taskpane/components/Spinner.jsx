import React from "react";

const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-10 h-10 border-4 border-t-transparent border-b-transparent border-r-transparent border-l-blue-600 rounded-full animate-spin"></div>
    </div>
  );
};

export default Spinner;
