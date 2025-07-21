class BridgeAuthService {
  constructor() {
    this.baseUrl = "https://dev.bridge.wassel.ai/api/v1";
    this.baseUrl2 = "https://dev.bridge.wassel.ai/api/v2";
    this.credentials = {
      user_login_id: "bridge_plugin",
      password: "AAAAAAAAAAAAAAAAAAAAAJMO2C2JSwl6VTF0c6tz5dI=",
    };
    this.accessToken = null;
    this.csrfToken = null;
    this.csrfCookie = null;
    this.currentWebSocket = null;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem("bridge_access_token");
    }
    return this.accessToken;
  }

  setAccessToken(token) {
    this.accessToken = token;
    localStorage.setItem("bridge_access_token", token);
  }

  clearTokens() {
    this.accessToken = null;
    this.csrfToken = null;
    this.csrfCookie = null;
    localStorage.removeItem("bridge_access_token");

    if (this.currentWebSocket && typeof this.currentWebSocket.close === "function") {
      try {
        this.currentWebSocket.close();
      } catch (e) {
        console.warn("Error closing WebSocket during cleanup:", e);
      }
      this.currentWebSocket = null;
    }
  }

  async getCsrfToken() {
    try {
      const response = await fetch(`${this.baseUrl}/get-csrf-token`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }
      const data = await response.json();
      this.csrfToken = data.csrf_token;
      console.log(this.csrfToken);

      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        const csrfCookieMatch = setCookieHeader.match(/csrf_cookie=([^;]+)/);
        if (csrfCookieMatch) {
          this.csrfCookie = csrfCookieMatch[1];
        }
      }

      console.log("CSRF Token obtained:", this.csrfToken);
    } catch (error) {
      console.error("Error getting CSRF token:", error);
      throw error;
    }
  }

  async login() {
    if (!this.csrfToken) {
      throw new Error("CSRF token not available");
    }

    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken,
          ...(this.csrfCookie && { Cookie: `csrf_cookie=${this.csrfCookie}` }),
        },
        body: JSON.stringify(this.credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      console.log("Login successful");
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  }

  async validateOtp() {
    if (!this.csrfToken) {
      throw new Error("CSRF token not available");
    }

    try {
      const response = await fetch(`${this.baseUrl}/validate_login_otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrfToken,
          ...(this.csrfCookie && { Cookie: `csrf_cookie=${this.csrfCookie}` }),
        },
        body: JSON.stringify({
          user_login_id: this.credentials.user_login_id,
          otp: "123456",
        }),
      });

      if (!response.ok) {
        throw new Error(`OTP validation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(result);
      const accessToken = result.data.result.access_token;
      if (!accessToken) {
        throw new Error("No access token received");
      }

      this.setAccessToken(accessToken);
      console.log("Access token obtained and stored");
      return accessToken;
    } catch (error) {
      console.error("Error validating OTP:", error);
      throw error;
    }
  }

  async authenticate() {
    try {
      const existingToken = this.getAccessToken();
      if (existingToken) {
        console.log("Using existing access token");
        return existingToken;
      }

      console.log("Starting authentication flow...");

      await this.getCsrfToken();
      await this.login();
      const accessToken = await this.validateOtp();

      return accessToken;
    } catch (error) {
      console.error("Authentication flow failed:", error);
      this.clearTokens();
      throw error;
    }
  }

  generateSessionId() {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  async sendAIRequest(prompt, documentContent, onMessage, onError, onComplete, streaming = true) {
    await this.authenticate();
  
    // Close existing WebSocket if any
    if (this.currentWebSocket && typeof this.currentWebSocket.close === "function") {
      try {
        this.currentWebSocket.close();
      } catch (e) {
        console.warn("Error closing existing WebSocket:", e);
      }
      this.currentWebSocket = null;
    }
  
    const sessionId = this.generateSessionId();
  
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://dev.bridge.wassel.ai/api/v2/ws/${sessionId}?token=Bearer%20${encodeURIComponent(this.accessToken)}`;
        console.log("Creating WebSocket connection to:", wsUrl);
        this.currentWebSocket = new WebSocket(wsUrl);
  
        if (!this.currentWebSocket) {
          reject(new Error("Failed to create WebSocket connection"));
          return;
        }
  
        let responseText = "";
        let isCompleted = false;
        let timeoutId;
  
        this.currentWebSocket.onopen = () => {
          console.log("WebSocket connected, sending AI request...");
  
          // Set a 60-second timeout to close the WebSocket if no response is received
          timeoutId = setTimeout(() => {
            console.warn("WebSocket response timeout, closing connection");
            if (this.currentWebSocket && typeof this.currentWebSocket.close === "function") {
              this.currentWebSocket.close();
            }
          }, 60000);
  
          const formattedContent = `
  DOCUMENT ANALYSIS REQUEST:
  
  ${prompt}
  
  DOCUMENT CONTENT TO ANALYZE:
  ${documentContent}
  
  Please provide a detailed analysis based on the above document content.
  `;
  
          const payload = {
            metadata: {
              persona: "general",
              model_name: "GPT 4o",
              streaming: streaming,
              assistant_type: "Others",
              temperature: 0,
              k: 3,
            },
            message_text: formattedContent,
            messages: [],
            app_id: "932032423a2e11f08815320489d79279",
          };
  
          console.log("Sending payload:", payload);
  
          try {
            this.currentWebSocket.send(JSON.stringify(payload));
          } catch (sendError) {
            console.error("Error sending WebSocket message:", sendError);
            if (onError) onError("Failed to send message");
            reject(new Error("Failed to send message"));
          }
        };
  
        this.currentWebSocket.onmessage = (event) => {
          try {
            const chunk = event.data;
            responseText += chunk;
  
            console.log("Received chunk:", chunk);
  
            // Check if "<Response>" appears anywhere in the accumulated text
            if (responseText.includes("<Response>")) {
              const [responsePart] = responseText.split("<Response>");
              responseText = responsePart.trim();
              isCompleted = true;
  
              if (onComplete) {
                onComplete(responseText);
              }
  
              resolve({
                response: responseText,
                status: "completed",
                sessionId: sessionId,
              });
  
              // Clear the timeout and close the WebSocket
              clearTimeout(timeoutId);
              if (this.currentWebSocket && typeof this.currentWebSocket.close === "function") {
                this.currentWebSocket.close();
              }
              this.currentWebSocket = null;
            } else {
              // Handle streaming chunks
              if (onMessage) {
                onMessage(chunk, responseText);
              }
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
            if (onError) onError("Failed to process response");
            clearTimeout(timeoutId);
            reject(error);
          }
        };
  
        this.currentWebSocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          if (onError) onError("WebSocket connection error");
          clearTimeout(timeoutId);
          reject(new Error("WebSocket connection failed"));
        };
  
        this.currentWebSocket.onclose = (event) => {
          console.log("WebSocket closed:", event.code, event.reason);
          this.currentWebSocket = null;
          clearTimeout(timeoutId);
  
          if (event.code !== 1000 && !isCompleted && responseText.trim() === "") {
            if (onError) onError("Connection closed unexpectedly");
            reject(new Error("Connection closed unexpectedly"));
          } else if (!isCompleted && responseText.trim() !== "") {
            if (onComplete) onComplete(responseText);
            resolve({
              response: responseText,
              status: "completed",
              sessionId: sessionId,
            });
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        if (onError) onError(error.message);
        reject(error);
      }
    });
  }

  closeAIConnection() {
    if (this.currentWebSocket && typeof this.currentWebSocket.close === "function") {
      try {
        this.currentWebSocket.close();
      } catch (e) {
        console.warn("Error closing WebSocket:", e);
      }
      this.currentWebSocket = null;
    }
  }
}

export default new BridgeAuthService();
