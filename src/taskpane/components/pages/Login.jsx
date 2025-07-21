import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthProvider";
import msalService from "../../../api/msalService";
import Dashboard from "./Dashboard";
import Logo from "../Logo";
import Spinner from "../Spinner";
const Login = ({ onLogin }) => {
  const { auth, loginWithMicrosoft, microsoftAuthError, isLoggingIn } = useAuth();
  const [autoLoginCompleted, setAutoLoginCompleted] = useState(false);

  // Helper to safely update Office settings
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

  // Auto-login on component mount
  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        console.log("Starting auto-login attempt...");

        // Check if we already have a Microsoft account
        const account = await msalService.getAccount();

        if (account) {
          console.log("Microsoft account found, attempting to get token...");
          try {
            // Try to get a token silently first
            const token = await msalService.getToken();
            console.log("Token obtained successfully");

            // If we can get a token, we're logged in
            updateOfficeSettings(true);
            onLogin();
            return;
          } catch (tokenError) {
            console.log("Silent token acquisition failed, trying login...");
          }
        }

        // If no account or token failed, try interactive login
        console.log("Attempting interactive Microsoft login...");
        await loginWithMicrosoft();
      } catch (error) {
        console.error("Auto-login failed:", error);
      } finally {
        setAutoLoginCompleted(true);
      }
    };

    attemptAutoLogin();
  }, []);

  // When auth changes, if we have a valid token, navigate to dashboard
  useEffect(() => {
    if (auth?.accessToken) {
      updateOfficeSettings(true);
      onLogin();
    }
  }, [auth]);

  // Show loading spinner during auto-login attempt
  if (!autoLoginCompleted || isLoggingIn) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <Logo />
            <h1 className="text-2xl font-bold text-gray-900">Signing in with Microsoft...</h1>
            <Spinner />
            <p className="text-gray-500 text-sm">Please wait while we sign you in automatically</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if auto-login failed
  if (microsoftAuthError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <Logo />
            <h1 className="text-2xl font-bold text-red-600">Sign-in Failed</h1>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {microsoftAuthError}
            </div>
            <p className="text-gray-500 text-sm text-center">
              Please try refreshing the page or contact your administrator if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached if everything works correctly
  return <Dashboard />;
};

export default Login;
