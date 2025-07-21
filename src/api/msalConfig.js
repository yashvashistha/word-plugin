// Configuration for Microsoft Authentication Library (MSAL)
export const msalConfig = {
  auth: {
    clientId: "fd4d6a28-4f7b-4356-af5a-452ec92c7e81",
    authority: "https://login.microsoftonline.com/organizations",
    //https://localhost:3000
    redirectUri: "https://localhost:3000",
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            console.error(message);
            return;
          case 1:
            console.warn(message);
            return;
          case 2:
            console.info(message);
            return;
          case 3:
            console.debug(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

// Scopes required by the application
export const loginRequest = {
  scopes: ["openid", "profile", "User.Read"],
};

// Function to get token for API calls
export const tokenRequest = {
  scopes: ["User.Read"],
};

export default msalConfig;
