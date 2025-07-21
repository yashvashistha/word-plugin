import React, { useState, createContext, useContext } from "react";
interface PageContextType {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}

const PageContext = createContext<PageContextType | undefined>(undefined);
export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const handleNextPage = () => page < totalPages && setPage(page + 1);
  const handlePrevPage = () => page > 1 && setPage(page - 1);
  return (
    <PageContext.Provider value={{ page, setPage, handleNextPage, handlePrevPage, totalPages, setTotalPages }}>{children}</PageContext.Provider>
  );
};

export const usePage = () => {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error("usePage must be used within an PageProvider");
  }
  return context;
};
export default PageContext;
