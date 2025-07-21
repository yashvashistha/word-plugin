/* global Office, Word, localStorage, window */

console.log("=".repeat(50));
console.log("🔍 COMMANDS.JS LOADED AND RUNNING");
console.log("=".repeat(50));

// Global variables for AI command detection
let aiCommandButton = null;
let isProcessingAI = false;
let debugMode = false;

// Debug logging function
async function debugLog(message) {
  console.log(message); // Log to console for visibility in command runtime

  if (debugMode) {
    try {
      await Word.run(async (context) => {
        const body = context.document.body;
        const timestamp = new Date().toLocaleTimeString();
        const debugText = `[${timestamp}] ${message}\n`;
        const range = body.insertText(debugText, Word.InsertLocation.end);
        range.font.size = 8;
        range.font.color = "#888888";
        await context.sync();
      });
    } catch (error) {
      // Ignore debug errors
    }
  }
}

Office.onReady(() => {
  debugLog("[DEBUG] Office.onReady called");

  if (Office.context.host === Office.HostType.Word) {
    debugLog("[DEBUG] Word host detected, checking API support");
    if (!Office.context.requirements.isSetSupported("WordApi", "1.3")) {
      console.error("[DEBUG] WordApi 1.3 not supported");
      alert("This Word version does not support required APIs. Please use Word 2016 or later.");
      return;
    }
    initializeButton();
  } else {
    debugLog("[DEBUG] Not a Word host: " + Office.context.host);
  }
});

/**
 * Initialize the button management
 */
async function initializeButton() {
  setTimeout(() => {
    checkForAICommand(); // Initial check after 1 second
    setInterval(checkForAICommand, 500); // Then every 2 seconds
  }, 1000);
}

/**
 * Periodic check for /ai in the document
 */
async function checkForAICommand() {
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      context.load(body, "text");

      // Load all content controls with the tag
      const controls = context.document.contentControls.getByTag("process-text-button");
      context.load(controls, "items");
      await context.sync();

      const documentText = body.text;
      const aiPresent = documentText.toLowerCase().includes("/ai");

      debugLog(
        `[DEBUG] Checking for /ai: aiPresent=${aiPresent}, controls.length=${controls.items.length}`
      );

      if (aiPresent && controls.items.length === 0) {
        const buttonControl = body.insertContentControl();
        buttonControl.title = "Process Text";
        buttonControl.tag = "process-text-button";
        buttonControl.insertText("📝 Process Text", Word.InsertLocation.end);
        buttonControl.font.color = "#ffffff";
        buttonControl.font.bold = true;
        buttonControl.style = "Intense Reference";

        // Add click handler
        try {
          buttonControl.onClicked.add(() => {
            debugLog("[DEBUG] Process Text button clicked");
            processText();
          });
        } catch (error) {
          debugLog("[DEBUG] onClicked not supported: " + error.message);
          setupButtonClickDetection();
        }

        await context.sync();
        aiCommandButton = buttonControl;
        debugLog("[DEBUG] Process Text button inserted");
      } else if (!aiPresent && controls.items.length > 0) {
        for (const control of controls.items) {
          control.delete(false);
        }
        await context.sync();
        aiCommandButton = null;
        debugLog("[DEBUG] Removed existing Process Text button(s)");
      } else {
        // Optional debug if nothing changed
        debugLog("[DEBUG] No action needed: AI command and button state unchanged");
      }
    });
  } catch (error) {
    debugLog("[DEBUG] Error in checkForAICommand: " + error.message);
  }
}


/**
 * Fallback button click detection
 */
function setupButtonClickDetection() {
  const checkForButtonClick = async () => {
    try {
      await Word.run(async (context) => {
        const selection = context.document.getSelection();
        context.load(selection, "text");
        await context.sync();

        if (selection.text.includes("📝 Process Text")) {
          debugLog("[DEBUG] Process Text button clicked (fallback)");
          await processText();
        }
      });
    } catch (error) {
      debugLog("[DEBUG] Button click detection error: " + error.message);
    }
  };

  const buttonCheckInterval = setInterval(() => {
    if (!aiCommandButton) {
      clearInterval(buttonCheckInterval);
      return;
    }
    checkForButtonClick();
  }, 500);
}

/**
 * Process the text following /ai and send to frontend
 */
async function processText() {
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      context.load(body, "text");
      await context.sync();

      let selectedText = body.text.trim();
      if (selectedText.startsWith("/ai") || selectedText.startsWith("/AI ")) {
        selectedText = selectedText.replace(/^\/ai\s+|^\/AI\s+/i, "").trim();
      }
      debugLog("[DEBUG] Processed text: " + selectedText);

      localStorage.setItem(
        "selectedTextForProcessing",
        JSON.stringify({ type: "textToProcess", text: selectedText })
      );
      debugLog("[DEBUG] Stored textToProcess in localStorage");

      window.dispatchEvent(new Event("storage"));
    });
  } catch (error) {
    debugLog("[DEBUG] Error in processText: " + error.message);
  }
}

/**
 * Shows a notification when the add-in command is executed.
 */
function action(event) {
  const message = {
    type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
    message: "Performed action.",
    icon: "Icon.80x80",
    persistent: true,
  };

  Office.context.mailbox.item?.notificationMessages.replaceAsync(
    "ActionPerformanceNotification",
    message
  );

  event.completed();
}

/**
 * Gets the selected text and sends it to the taskpane
 */
async function getSelectedText(event) {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      context.load(selection, "text");
      await context.sync();

      localStorage.setItem(
        "selectedText",
        JSON.stringify({ type: "selectedText", text: selection.text })
      );
      debugLog("[DEBUG] Stored selected text: " + selection.text);

      window.dispatchEvent(new Event("storage"));
    });
  } catch (error) {
    debugLog("[DEBUG] Error in getSelectedText: " + error.message);
  }

  event.completed();
}

/**
 * Summarize document (separate from /ai)
 */
async function summarizeDocument(event) {
  debugLog("[DEBUG] summarizeDocument called");
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      const body = context.document.body;

      context.load(selection, "text");
      context.load(body, "text");
      await context.sync();

      const selectedText = selection.text.trim();
      const textToUse = selectedText || body.text.trim();

      debugLog("[DEBUG] Text to summarize: " + textToUse);

      localStorage.setItem(
        "selectedTextForProcessing",
        JSON.stringify({ type: "summarizeDocument", text: textToUse })
      );
      debugLog("[DEBUG] Stored text in localStorage");

      window.dispatchEvent(new Event("storage"));
    });
  } catch (error) {
    debugLog("[DEBUG] Error in summarizeDocument: " + error.message);
  }

  event.completed();
}

async function validateStructure(event) {
  debugLog("[DEBUG] validateStructure called");
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      context.load(body, "text");
      await context.sync();

      const documentContent = body.text.trim();
      debugLog("[DEBUG] Document content retrieved: " + documentContent);

      localStorage.setItem(
        "selectedTextForProcessing",
        JSON.stringify({ type: "validateStructure", text: documentContent })
      );
      debugLog("[DEBUG] Stored validateStructure in localStorage");

      window.dispatchEvent(new Event("storage"));
    });
  } catch (error) {
    debugLog("[DEBUG] Error in validateStructure: " + error.message);
  }

  event.completed();
}

// Register all functions with Office
Office.actions.associate("action", action);
Office.actions.associate("getSelectedText", getSelectedText);
Office.actions.associate("summarizeDocument", summarizeDocument);
Office.actions.associate("validateStructure", validateStructure);
