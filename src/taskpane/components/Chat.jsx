import { useState } from "react";
import React from "react";

const ChatInterface = () => {
  const [message, setMessage] = useState("");

  const navLinks = [
    { name: "Review", action: "Document Review" },
    { name: "Compliance", action: "Run Compliance Check" },
    { name: "Ask AI", action: "Ask Question" },
    { name: "Insights", action: "View Insights" },
  ];

  const sendMessage = () => {
    // Add your send logic here
    console.log("Sending:", message);
    setMessage("");
  };

  return (
    <div className="  mt-auto w-full flex flex-col ">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-rose-50">
        {/* Add your chat messages here */}
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-white">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about your document..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600"
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            aria-label="Send message"
            title="Send message"
            className="p-2 bg-rose-600 text-rose-500 rounded-lg hover:bg-rose-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
