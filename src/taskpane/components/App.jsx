import React, { useState, useEffect } from "react";
import msalService from "../../api/msalService";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { AuthProvider } from "../../context/AuthProvider";
// Helper to safely access Office object
const updateOfficeSettings = (isLoggedIn) => {
  try {
    // @ts-ignore - Office is available at runtime but TypeScript doesn't know about it
    if (typeof Office !== "undefined" && Office?.context?.document?.settings) {
      // @ts-ignore
      Office.context.document.settings.set("isLoggedIn", isLoggedIn);
      // @ts-ignore
      Office.context.document.settings.saveAsync();
    }
  } catch (error) {
    console.error("Error updating Office settings:", error);
  }
};

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("login");
  useEffect(() => {
    // Listen for logout events from Office commands
    const handleLogout = (event) => {
      console.log("Logout event received:", event);
      setIsLoggedIn(false);
      setUser(null);
      // Force re-render or redirect to login
      window.location.reload();
    };

    // Listen for custom logout event
    window.addEventListener("userLoggedOut", handleLogout);

    // Listen for postMessage events
    const handleMessage = (event) => {
      if (event.data.type === "LOGOUT_SUCCESS") {
        console.log("Logout message received");
        handleLogout(event);
      }
    };
    window.addEventListener("message", handleMessage);

    // Check login state on component mount
    checkLoginState();

    // Cleanup listeners
    return () => {
      window.removeEventListener("userLoggedOut", handleLogout);
      window.removeEventListener("message", handleMessage);
    };
  }, []);
  const checkLoginState = async () => {
    try {
      // Check Office settings
      if (Office.context?.document?.settings) {
        const officeLoginState = Office.context.document.settings.get("isLoggedIn");
        if (!officeLoginState) {
          setIsLoggedIn(false);
          setUser(null);
          return;
        }
      }

      // Check MSAL state
      const account = await msalService.getAccount();
      if (account) {
        setIsLoggedIn(true);
        setUser(account);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking login state:", error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  const navigate = (page) => {
    setCurrentPage(page);

    // Update Office settings when navigating to dashboard (logged in)
    if (page === "dashboard") {
      localStorage.setItem("isLoggedIn", "true");
      updateOfficeSettings(true);
    } else {
      localStorage.removeItem("isLoggedIn");
      updateOfficeSettings(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkLoginState, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!isLoggedIn) {
    return <Login onLogin={() => checkLoginState()} />;
  }
  const renderContent = () => {
    if (currentPage === "login") {
      return <Login onLogin={() => navigate("dashboard")} />;
    } else {
      return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-rose-50">
      {renderContent()}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
