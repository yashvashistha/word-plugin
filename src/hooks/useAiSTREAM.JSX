"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import aiWebSocketService from "../services/ai-websocket-service.js";
import bridgeAuthService from "../services/bridge-auth-service.js";
import { getPromptByAction } from "../config/ai-prompts.js";

export const useAIStreaming = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const responseRef = useRef("");
  const unsubscribeRefs = useRef([]);

  // Check authentication status
  useEffect(() => {
    setIsAuthenticated(bridgeAuthService.isAuthenticated());
  }, []);

  // Setup WebSocket event handlers
  useEffect(() => {
    const handleMessage = (data) => {
      if (data.type === "text_chunk" || data.content) {
        const chunk = data.content || data.text || "";
        responseRef.current += chunk;
        setStreamingResponse(responseRef.current);
      } else if (data.type === "end" || data.finished) {
        setIsProcessing(false);
        console.log("Streaming completed");
      }
    };

    const handleError = (error) => {
      setError(`WebSocket error: ${error.message || "Connection failed"}`);
      setIsProcessing(false);
      setIsConnected(false);
    };

    const handleClose = () => {
      setIsConnected(false);
      setIsProcessing(false);
    };

    // Subscribe to WebSocket events
    const unsubscribeMessage = aiWebSocketService.onMessage(handleMessage);
    const unsubscribeError = aiWebSocketService.onError(handleError);
    const unsubscribeClose = aiWebSocketService.onClose(handleClose);

    unsubscribeRefs.current = [unsubscribeMessage, unsubscribeError, unsubscribeClose];

    return () => {
      unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const authenticate = useCallback(async () => {
    try {
      setError(null);
      await bridgeAuthService.authenticate();
      setIsAuthenticated(true);
      console.log("Authentication successful");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      setIsAuthenticated(false);
      throw err;
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!bridgeAuthService.isAuthenticated()) {
        await authenticate();
      }

      await aiWebSocketService.connect();
      setIsConnected(true);
      console.log("WebSocket connected");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection failed";
      setError(errorMessage);
      setIsConnected(false);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [authenticate]);

  const sendAIRequest = useCallback(
    async (action, documentContent) => {
      try {
        setError(null);
        setIsProcessing(true);
        setStreamingResponse("");
        responseRef.current = "";

        // Ensure WebSocket is connected
        if (!aiWebSocketService.isWebSocketConnected()) {
          await connectWebSocket();
        }

        // Get prompt for the action
        const promptConfig = getPromptByAction(action);
        const combinedMessage = `${promptConfig.prompt}\n\nDocument Content:\n${documentContent}`;

        // Prepare the payload
        const payload = {
          metadata: {
            persona: "general",
            model_name: "GPT 4o",
            streaming: true,
            assistant_type: "Others",
            temperature: 0,
            k: 3,
          },
          message_text: combinedMessage,
          messages: [],
          app_id: "932032423a2e11f08815320489d79279",
        };

        // Send the message
        aiWebSocketService.sendMessage(payload);
        console.log(`AI request sent for action: ${action}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "AI request failed";
        setError(errorMessage);
        setIsProcessing(false);
        throw err;
      }
    },
    [connectWebSocket]
  );

  const disconnect = useCallback(() => {
    aiWebSocketService.disconnect();
    setIsConnected(false);
    setIsProcessing(false);
    setStreamingResponse("");
    responseRef.current = "";
  }, []);

  const clearResponse = useCallback(() => {
    setStreamingResponse("");
    responseRef.current = "";
    setError(null);
  }, []);

  const logout = useCallback(() => {
    disconnect();
    bridgeAuthService.clearTokens();
    setIsAuthenticated(false);
  }, [disconnect]);

  return {
    isConnecting,
    isConnected,
    isProcessing,
    isAuthenticated,
    error,
    streamingResponse,
    authenticate,
    connectWebSocket,
    sendAIRequest,
    disconnect,
    clearResponse,
    logout,
  };
};
