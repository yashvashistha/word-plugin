import React, { useState, createContext, useContext, useEffect } from "react";
import msalService from "../api/msalService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [isPersist, setIsPersist] = useState(true); // Always persist by default
  const [microsoftAuthError, setMicrosoftAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Helper to update Office settings
  const updateOfficeSettings = (isLoggedIn) => {
    try {
      if (typeof Office !== "undefined" && Office?.context?.document?.settings) {
        Office.context.document.settings.set("isLoggedIn", isLoggedIn);
        Office.context.document.settings.saveAsync();
      }
      // Also update localStorage for cross-session persistence
      if (isLoggedIn) {
        localStorage.setItem("isLoggedIn", "true");
      } else {
        localStorage.removeItem("isLoggedIn");
      }
    } catch (error) {
      console.error("Error updating Office settings:", error);
    }
  };

  // Function to login with Microsoft
  const loginWithMicrosoft = async () => {
    setIsLoggingIn(true);
    setMicrosoftAuthError(null);

    try {
      console.log("Starting Microsoft login...");

      // Start Microsoft login flow (will use popup)
      await msalService.login("popup");

      // Try to get account info after login
      const account = await msalService.getAccount();

      if (account) {
        console.log("Account obtained, getting token...");
        // Get token from Microsoft
        const msToken = await msalService.getToken();
        console.log("Microsoft token obtained, calling backend...", msToken);
        if (msToken) {
          updateOfficeSettings(true);

          // Set basic auth info
          setAuth({
            accessToken: msToken,
            user: {
              name: account.name,
              email: account.username,
            },
            isFirstLogin: !localStorage.getItem("isLoggedIn"),
          });
        }
      } else {
        throw new Error("No account found after login");
      }
    } catch (error) {
      console.error("Microsoft login failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Microsoft login failed. Please try again.";
      setMicrosoftAuthError(errorMessage);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Function to logout with Microsoft
  const logoutWithMicrosoft = async () => {
    try {
      // Clear local auth state
      setAuth(null);

      // Clear all localStorage items
      localStorage.clear();

      // Clear session storage
      sessionStorage.clear();

      // Update Office settings
      updateOfficeSettings(false);

      // Logout from Microsoft using logoutRedirect
      await msalService.logoutRedirect();

      // Clear MSAL cache and Office credentials if available
      if (
        typeof Office !== "undefined" &&
        Office.context &&
        typeof Office.context.auth !== "undefined"
      ) {
        try {
          await Office.context.auth.clearClientCredentials();
        } catch (e) {
          console.warn("Could not clear Office credentials:", e);
        }
      }
    } catch (error) {
      console.error("Microsoft logout failed:", error);
      throw error;
    }
  };

  // Update localStorage when auth changes
  useEffect(() => {
    if (isPersist && auth) {
      if (auth.user) {
        localStorage.setItem("user", JSON.stringify(auth.user));
      }
      localStorage.setItem("isFirstLogin", String(auth.isFirstLogin));
    }
  }, [auth, isPersist]);

  const value = {
    auth,
    setAuth,
    isPersist,
    setIsPersist,
    loginWithMicrosoft,
    logoutWithMicrosoft,
    microsoftAuthError,
    setMicrosoftAuthError,
    isLoggingIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
