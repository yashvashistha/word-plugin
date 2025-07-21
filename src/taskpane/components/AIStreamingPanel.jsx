import React from "react";
import { marked } from "marked";
import { Card, CardContent, CardHeader, CardTitle } from "../../../@/components/ui/card";
import { Button } from "../../components/ui/button";
import { Loader2, Bot, Square, Trash2, Copy, CheckCircle } from "lucide-react";

const StreamingResponsePanel = ({
  streamingResponse,
  isStreaming,
  isLoading,
  error,
  onClear,
  onStop,
}) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(streamingResponse);
      console.log("Response copied to clipboard");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const getWordCount = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  // Configure marked options
  marked.setOptions({
    breaks: true, // Enable line breaks
    gfm: true, // Enable GitHub Flavored Markdown
    headerIds: false, // Disable header IDs
    mangle: false, // Disable mangling
    sanitize: false, // Allow HTML
  });

  // Process the response to preserve line breaks and convert to HTML
  const unescapeString = (text) =>
    text
      .replace(/\\n/g, '\n')        // newlines
      .replace(/\\'/g, "'")         // escaped single quotes
      .replace(/\\"/g, '"')         // escaped double quotes
      .replace(/\\\\/g, '\\')       // escaped backslashes
      .replace(/\\([^\n\\]+)\\/g, '_$1_'); // \text\ → _text_ (for italics)
  

  const processedResponse = streamingResponse ? marked(unescapeString(streamingResponse)) : "";

  return (
    <Card className="border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-green-600" />
            
            <span>AI Analysis</span>
            {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-green-600" />}
            {!isStreaming && streamingResponse && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
          <div className="flex sm:flex-row flex-col items-center space-x-2">
            {streamingResponse && (
              <div className="flex flex-row items-center space-x-2">
                {/* <span className="text-xs text-gray-500">
                  {getWordCount(streamingResponse)} words
                </span> */}
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={onClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
            {isStreaming && (
              <Button variant="outline" size="sm" onClick={onStop} className="text-red-600">
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {isLoading && !isStreaming && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-800">Connecting to AI...</span>
            </div>
          </div>
        )}

        {isStreaming && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              {/* <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> */}
              <span className="text-sm text-blue-800">
                AI is analyzing your document... ({getWordCount(streamingResponse)} words so far)
              </span>
            </div>
          </div>
        )}

        {streamingResponse ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div
              className="prose prose-sm max-w-none text-green-800 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processedResponse }}
            />
            {isStreaming && <span className="animate-pulse ml-1 text-green-600 font-bold">▊</span>}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">
              Click a ribbon button to start processing your document with AI.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamingResponsePanel;
