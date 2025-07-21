import React, { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthProvider";
import msalService from "../../../api/msalService";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardTitle, CardHeader } from "../../../../@/components/ui/card";
import { useBridgeAi } from "../../../hooks/use-ai";
import StreamingResponsePanel from "../AIStreamingPanel";
import ChatInterface from "../Chat";
import {
  insertProcessingIndicator,
  removeProcessingIndicator,
} from "../../lib/wordUtils";
import { formatAndInsertToWord } from "../../lib/wordFormatter";
import Header from "../Header";

const Dashboard = ({ onLogout }) => {
  const { logoutWithMicrosoft } = useAuth();
  const [microsoftAccount, setMicrosoftAccount] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [contentToProcess, setContentToProcess] = useState("");
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [eventType, setEventType] = useState(null);
  const [status, setStatus] = useState("");
  const [isInserting, setIsInserting] = useState(false);

  const {
    isLoading,
    error,
    streamingResponse,
    isStreaming,
    sendAIRequest,
    clearResponse,
    logout,
    stopStreaming,
  } = useBridgeAi();
  console.log("Streaming response:", streamingResponse);
  // Initialize Microsoft account
  useEffect(() => {
    msalService.getAccount().then(setMicrosoftAccount).catch(console.error);
  }, []);

  // Handle storage events for Word input
  useEffect(() => {
    const handleChange = () => {
      const data = JSON.parse(localStorage.getItem("selectedTextForProcessing") || "{}");
      if (data?.type) {
        setEventType(data.type);
        setContentToProcess(data.text || "");
        setIsContentLoading(true);
        setStatus("Received text from Word...");
      }
    };
    handleChange();
    window.addEventListener("storage", handleChange);
    return () => window.removeEventListener("storage", handleChange);
  }, []);

  // Process events
  useEffect(() => {
    if (eventType && contentToProcess) processEvent(eventType);
  }, [eventType, contentToProcess]);

  // Handle response completion
  useEffect(() => {
    console.log("Stream check:", { isStreaming, response: streamingResponse?.slice(0, 50) });
    if (!isStreaming && streamingResponse) {
      const cleaned = streamingResponse.replace(/<\/?Response>/g, "").trim();
      if (cleaned && eventType === "textToProcess") {
        console.log("Processing response:", cleaned);
        handleResponseComplete(cleaned);
      }
      // Remove processing indicator when streaming ends
      removeProcessingIndicator().catch((err) =>
        console.error("Failed to remove processing indicator:", err)
      );
      setIsContentLoading(false);
    }
  }, [isStreaming, streamingResponse, eventType]);

  const processEvent = (type) => {
    const actions = {
      textToProcess: () => handleTextProcessing(contentToProcess),
      summarizeDocument: () => handleAISummarize(),
      validateStructure: () => handleStructureValidation(),
    };
    (actions[type] || (() => console.log("Unknown event:", type)))();
  };

  const handleTextProcessing = async (text) => {
    setStatus("Processing...");

    // IMMEDIATELY show processing indicator in Word
    try {
      await insertProcessingIndicator();
      console.log("Processing indicator inserted");
    } catch (err) {
      console.error("Failed to insert processing indicator:", err);
    }

    try {
      await sendAIRequest("selectedText", text.replace("📝 Process Text", "").trim(), {
        streaming: true,
      });
      setStatus("AI processing...");
    } catch (err) {
      console.error("AI error:", err);
      setStatus("Error: AI failed");
    }
  };

  const handleAISummarize = async () => {
    setStatus("Summarizing...");

    try {
      await sendAIRequest("documentSummary", contentToProcess, { streaming: true });
    } catch (err) {
      console.error("Summarization error:", err);
      setStatus("Error: Summarization failed");
    }
  };

  const handleStructureValidation = async () => {
    setStatus("Validating...");

    try {
      await sendAIRequest("structureValidation", contentToProcess, { streaming: true });
    } catch (err) {
      console.error("Validation error:", err);
      setStatus("Error: Validation failed");
    }
  };

  const handleResponseComplete = async (response) => {
    // Don’t try to format until streaming has finished
    if (!response || isStreaming) return;

    setStatus("Formatting response...");
    setIsInserting(true);

    // Strip out any <Response> wrappers and trim whitespace
    const cleanedResponse = response.replace(/<\/?Response>/g, "").trim();

    console.log("Original response (first 200 chars):", response.substring(0, 200));
    console.log("Cleaned response (first 200 chars):", cleanedResponse.substring(0, 200));

    try {
      const success = await formatAndInsertToWord(cleanedResponse, setStatus);
      if (!success) {
        console.warn("formatAndInsertToWord returned false");
        setStatus("❌ Failed to format response");
      }
    } catch (error) {
      console.error("Error during formatAndInsertToWord:", error);
      setStatus("❌ Failed to format response");
    } finally {
      setIsInserting(false);
      // Clear status after a short delay
      setTimeout(() => setStatus(""), 3000);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutWithMicrosoft();
      logout();
      setMicrosoftAccount(null);
      setContentToProcess("");
      setStatus("");
      if (onLogout) onLogout();
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
      alert("Logout failed. Try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {microsoftAccount && (
        <Header
          isLoggingOut={isLoggingOut}
          microsoftAccount={microsoftAccount}
          onLogout={handleLogout}
        />
      )}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {isLoading && !isStreaming && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 flex items-center space-x-2">
                {/* <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> */}
                <span className="text-sm text-blue-800">Connecting to AI...</span>
              </CardContent>
            </Card>
          )}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">Error: {error}</span>
              </CardContent>
            </Card>
          )}
          {/* {contentToProcess && isContentLoading && (
            <Card>
              <CardHeader>
                <CardTitle>Document Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{contentToProcess}</p>
                </div>
              </CardContent>
            </Card>
          )} */}
          {eventType !== "textToProcess" && (
            <StreamingResponsePanel
              streamingResponse={streamingResponse}
              isStreaming={isStreaming}
              isLoading={isLoading}
              error={error}
              onStop={() => {
                stopStreaming();
                removeProcessingIndicator();
              }}
              onClear={clearResponse}
            />
          )}
          {/* {status && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4 flex items-center space-x-2">
                {isInserting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                ) : (
                  <FileText className="h-4 w-4 text-gray-600" />
                )}
                <span className="text-sm text-gray-800">{status}</span>
              </CardContent>
            </Card>
          )} */}
          {/* {!contentToProcess && !streamingResponse && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No content available.</p>
              </CardContent>
            </Card>
          )} */}
        </div>
        {/* <ChatInterface /> */}
      </main>
    </div>
  );
};

export default Dashboard;
