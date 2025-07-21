"use client";

import { useState, useCallback, useRef } from "react";
import bridgeAuthService from "../api/authservice";

const AI_PROMPTS = {
  documentSummary:
    "Please provide a comprehensive summary of this document, highlighting the main points and key information.",
  selectedText: "",
  structureValidation:
    "Please validate the structure of this document and provide a detailed response based on its content.",
};

const cleanStreamingText = (text) => {
  if (!text) return "";
  return text


    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")


    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
};

export const useBridgeAi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const shouldStopStreaming = useRef(false);
  const rawResponse = useRef("");

  const authenticate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await bridgeAuthService.authenticate();
      setIsAuthenticated(true);
      console.log("Bridge AI authentication successful");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendAIRequest = useCallback(
    async (action, documentContent, options = {}) => {
      const { streaming = true } = options;
      try {
        setError(null);
        setStreamingResponse("");
        setIsStreaming(streaming);

        shouldStopStreaming.current = false;
        rawResponse.current = "";

        if (!bridgeAuthService.isAuthenticated()) {
          setIsLoading(true);
          await authenticate();
          setIsLoading(false);
        }

        const prompt = AI_PROMPTS[action] || AI_PROMPTS.documentSummary;
        const handleMessage = (chunk) => {
          if (shouldStopStreaming.current) return;
          rawResponse.current += chunk;
          const cleanedText = cleanStreamingText(rawResponse.current);
          setStreamingResponse(cleanedText);
        };

        const handleError = (errorMsg) => {
          setError(errorMsg);
          setIsStreaming(false);
        };

        const handleComplete = (finalResponse) => {
          if (finalResponse) {
            const cleanedFinal = cleanStreamingText(finalResponse);
            setStreamingResponse(cleanedFinal);
          }
          setIsStreaming(false);
        };

        await bridgeAuthService.sendAIRequest(
          prompt,
          documentContent,
          handleMessage,
          handleError,
          handleComplete,
          streaming
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "AI request failed";
        setError(errorMessage);
        setIsStreaming(false);
        throw err;
      }
    },
    [authenticate]
  );

  const clearResponse = useCallback(() => {
    setStreamingResponse("");
    rawResponse.current = "";
    setError(null);
    setIsStreaming(false);
    shouldStopStreaming.current = false;
  }, []);

  const stopStreaming = useCallback(() => {
    shouldStopStreaming.current = true;
    bridgeAuthService.closeAIConnection();
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    bridgeAuthService.clearTokens();
    setIsAuthenticated(false);
    setError(null);
    setStreamingResponse("");
    rawResponse.current = "";
    setIsStreaming(false);
    shouldStopStreaming.current = false;
  }, []);

  return {
    isLoading,
    error,
    isAuthenticated: isAuthenticated || bridgeAuthService.isAuthenticated(),
    streamingResponse,
    isStreaming,
    authenticate,
    sendAIRequest,
    clearResponse,
    stopStreaming,
    logout,
  };
};
