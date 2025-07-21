import React from "react";
import Logo from "./Logo";
import { Button } from "./ui/button";

const Header = ({ microsoftAccount, isLoggingOut, onLogout }) => (
  <header className="bg-white shadow-sm p-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="flex flex-col items-center  ">
          <Logo />
          <p className="text-sm font-medium">V 1.0</p>
        </div>
        <div className="">
          <div>
            {/* <p className="text-sm font-medium">
              Signed in as: 
            </p> */}
            <p className="text-xs text-gray-500  flex flex-col">
              <span className="font-bold">Signed in as: </span> {microsoftAccount.username}
            </p>
          </div>
        </div>
      </div>
      <Button
        variant="link"
        size="sm"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="text-red-600 mt-3 mb-auto border-red-200 hover:bg-red-50"
      >
        {isLoggingOut ? "Signing Out..." : "Sign Out"}
      </Button>
    </div>
  </header>
);

export default Header;
