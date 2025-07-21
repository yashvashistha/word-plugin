import { PublicClientApplication, InteractionType } from "@azure/msal-browser";
import { msalConfig, loginRequest, tokenRequest } from "./msalConfig";

// Initialize MSAL client
const msalInstance = new PublicClientApplication(msalConfig);

// Track initialization state
let isInitialized = false;

// Initialize MSAL instance
async function initializeMsalInstance() {
  if (!isInitialized) {
    try {
      await msalInstance.initialize();
      isInitialized = true;
      console.log("MSAL instance initialized successfully");

      // Handle redirect after login
      const response = await msalInstance.handleRedirectPromise();
      if (response) {
        console.log("Redirect response:", response);
      }
    } catch (error) {
      console.error("MSAL Initialization Error:", error);
      throw error;
    }
  }
  return msalInstance;
}

const msalService = {
  /**
   * Get Microsoft account if available
   */
  getAccount: async () => {
    try {
      await initializeMsalInstance();
      const accounts = await msalInstance.getAllAccounts();
      return accounts?.[0] || null;
    } catch (error) {
      console.error("Error getting account:", error);
      return null;
    }
  },

  /**
   * Get token silently if possible
   */
  getToken: async () => {
    try {
      await initializeMsalInstance();
      const account = await msalService.getAccount();

      if (!account) {
        throw new Error("No account found");
      }

      const response = await msalInstance.acquireTokenSilent({
        ...tokenRequest,
        account: account,
      });

      return response.accessToken;
    } catch (error) {
      console.error("Error getting token:", error);
      throw error;
    }
  },

  /**
   * Login with Microsoft account
   */
  login: async (method = "redirect") => {
    try {
      await initializeMsalInstance();
      console.log(`Starting Microsoft login with method: ${method}`);

      if (method === "popup") {
        const response = await msalInstance.loginPopup(loginRequest);
        console.log("Login popup successful:", response);
        return response;
      } else {
        await msalInstance.loginRedirect(loginRequest);
        console.log("Login redirect initiated");
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error(`Microsoft login failed: ${error.message}`);
    }
  },

  /**
   * Logout from Microsoft account
   */
  logoutRedirect: async () => {
    try {
      await initializeMsalInstance();
      const account = await msalService.getAccount();

      if (account) {
        console.log("Logging out account:", account.username);
        const logoutRequest = {
          account: account,
          postLogoutRedirectUri: window.location.origin,
        };

        // Clear cache before logout
        await msalInstance.clearCache();

        // Perform logout
        await msalInstance.logoutRedirect(logoutRequest);
      } else {
        console.log("No account to logout");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      throw new Error(`Microsoft logout failed: ${error.message}`);
    }
  },

  /**
   * Check if authenticated with Microsoft account
   */
  isAuthenticated: async () => {
    try {
      const account = await msalService.getAccount();
      return !!account;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  },

  /**
   * Get the MSAL instance
   */
  getMsalInstance: async () => {
    return await initializeMsalInstance();
  },
};

export default msalService;
