export function insertFormattedMarkdownToWord(markdownText, insertLocation = "replace") {
  try {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();

      // CRITICAL: Clear everything first
      selection.clear();

      // Clean and process the text more thoroughly
      let cleanText = markdownText
        .replace(/<Response>/g, "")
        .replace(/<\/Response>/g, "")
        .replace(/\\n\\t/g, "\n") // Handle escaped newline+tab
        .replace(/\\n/g, "\n") // Handle escaped newlines
        .replace(/\n\t/g, "\n") // Handle actual newline+tab
        .replace(/\t/g, "") // Remove tabs
        .replace(/\*\*/g, "") // Remove markdown bold markers
        .replace(/^\*/g, "") // Remove leading asterisks
        .replace(/\*$/g, "") // Remove trailing asterisks
        .replace(/\\\\/g, "\\") // Fix double backslashes
        .trim();

      console.log("Cleaned text:", cleanText.substring(0, 200));

      // Split into meaningful sections
      const sections = parseTextIntoSections(cleanText);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        try {
          await insertSection(context, selection, section, i > 0);
        } catch (sectionError) {
          console.error("Section insertion error:", sectionError);
          // Fallback: insert as plain text
          if (i > 0) {
            selection.insertParagraph("", Word.InsertLocation.end);
          }
          selection.insertText(section.text, Word.InsertLocation.end);
        }
      }

      await context.sync();
      return true;
    });
  } catch (error) {
    console.error("Word formatting error:", error);
    return false;
  }
}

function parseTextIntoSections(text) {
  const sections = [];
  const lines = text.split("\n").filter((line) => line.trim());

  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Detect section types
    if (isMainHeader(trimmedLine)) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: "header",
        text: trimmedLine.replace(":", "").trim(),
        items: [],
      };
    } else if (isSubHeader(trimmedLine)) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: "subheader",
        text: trimmedLine.replace(":", "").trim(),
        items: [],
      };
    } else if (isBulletPoint(trimmedLine)) {
      if (!currentSection) {
        currentSection = { type: "list", text: "", items: [] };
      }
      currentSection.items.push(trimmedLine.substring(2).trim());
    } else {
      // Regular paragraph
      if (currentSection && currentSection.type !== "paragraph") {
        sections.push(currentSection);
        currentSection = null;
      }
      if (!currentSection) {
        currentSection = { type: "paragraph", text: "", items: [] };
      }
      currentSection.text += (currentSection.text ? " " : "") + trimmedLine;
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function isMainHeader(line) {
  // Main headers: end with colon, don't start with bullet, are substantial
  return (
    line.endsWith(":") &&
    !line.startsWith("-") &&
    !line.startsWith("*") &&
    line.length > 3 &&
    /^[A-Z]/.test(line)
  );
}

function isSubHeader(line) {
  // Known subheaders or patterns
  const subHeaders = [
    "analysis",
    "recommendations",
    "conclusion",
    "key information",
    "potential actions",
    "document content",
    "main points",
    "identification",
    "name",
    "format",
    "completeness",
    "improvement",
    "additional information",
    "clarification request",
    "formatting",
  ];

  const cleanLine = line.replace(":", "").toLowerCase().trim();
  return subHeaders.includes(cleanLine) || /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:?$/.test(line);
}

function isBulletPoint(line) {
  return line.startsWith("- ") || line.startsWith("* ");
}

async function insertSection(context, selection, section, addSpacing) {
  try {
    // Add spacing between sections
    if (addSpacing) {
      selection.insertParagraph("", Word.InsertLocation.end);
    }

    switch (section.type) {
      case "header":
        await insertHeader(selection, section.text, 16, true);
        break;

      case "subheader":
        await insertHeader(selection, section.text, 14, false);
        break;

      case "list":
        await insertBulletList(selection, section.items);
        break;

      case "paragraph":
        await insertParagraph(selection, section.text);
        break;
    }

    // Add items if any
    if (section.items && section.items.length > 0 && section.type !== "list") {
      await insertBulletList(selection, section.items);
    }
  } catch (error) {
    console.error("Section formatting error:", error);
    throw error;
  }
}

async function insertHeader(selection, text, fontSize, isMain) {
  try {
    const paragraph = selection.insertParagraph(text, Word.InsertLocation.end);
    paragraph.font.bold = true;
    paragraph.font.size = fontSize;

    if (isMain) {
      paragraph.spaceAfter = 12;
      paragraph.spaceBefore = 6;
    } else {
      paragraph.spaceAfter = 8;
      paragraph.spaceBefore = 12;
    }
  } catch (error) {
    // Fallback: just insert bold text
    const range = selection.insertText(text, Word.InsertLocation.end);
    range.font.bold = true;
    selection.insertParagraph("", Word.InsertLocation.end);
  }
}

async function insertBulletList(selection, items) {
  for (const item of items) {
    try {
      const paragraph = selection.insertParagraph(`• ${item}`, Word.InsertLocation.end);
      paragraph.leftIndent = 20;
      paragraph.spaceAfter = 3;
    } catch (error) {
      // Fallback: plain text with bullet
      selection.insertText(`• ${item}`, Word.InsertLocation.end);
      selection.insertParagraph("", Word.InsertLocation.end);
    }
  }
}

async function insertParagraph(selection, text) {
  try {
    const paragraph = selection.insertParagraph(text, Word.InsertLocation.end);
    paragraph.spaceAfter = 6;
  } catch (error) {
    // Fallback: plain text
    selection.insertText(text, Word.InsertLocation.end);
    selection.insertParagraph("", Word.InsertLocation.end);
  }
}

// Alternative ultra-safe version
export function insertSafeFormattedMarkdownToWord(markdownText, insertLocation = "replace") {
  try {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.clear();

      // Ultra-clean text processing
      let cleanText = markdownText
        .replace(/<\/?Response>/g, "")
        .replace(/\\n\\t/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\n\t/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\*+/g, "")
        .replace(/\\\\/g, "\\")
        .trim();

      const lines = cleanText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Simple spacing
        if (i > 0) {
          selection.insertParagraph("", Word.InsertLocation.end);
        }

        try {
          // Detect and format different line types
          if (line.endsWith(":") && !line.startsWith("-")) {
            // Header
            const headerText = line.slice(0, -1);
            const paragraph = selection.insertParagraph(headerText, Word.InsertLocation.end);
            paragraph.font.bold = true;
            paragraph.font.size = 14;
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            // Bullet point
            const bulletText = line.substring(2);
            const paragraph = selection.insertParagraph(`• ${bulletText}`, Word.InsertLocation.end);
            paragraph.leftIndent = 15;
          } else {
            // Regular text
            selection.insertParagraph(line, Word.InsertLocation.end);
          }
        } catch (lineError) {
          console.error("Line formatting error, using plain text:", lineError);
          selection.insertText(line, Word.InsertLocation.end);
          selection.insertParagraph("", Word.InsertLocation.end);
        }
      }

      await context.sync();
      return true;
    });
  } catch (error) {
    console.error("Safe formatting error:", error);
    return false;
  }
}

export function insertProcessingIndicator() {
  try {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();

      // Clear any existing content and insert processing indicator
      selection.clear();
      const processingRange = selection.insertText(
        "🤖 Processing your request...",
        Word.InsertLocation.replace
      );

      // Style the processing text
      processingRange.font.color = "#6B7280"; // Gray color
      processingRange.font.italic = true;

      await context.sync();
      return true;
    });
  } catch (error) {
    console.error("Error inserting processing indicator:", error);
    return false;
  }
}

export function removeProcessingIndicator() {
  try {
    return Word.run(async (context) => {
      // Find and remove any processing indicator text
      const body = context.document.body;
      const searchResults = body.search("🤖 Processing your request...");
      searchResults.load("text");
      await context.sync();

      // Delete each instance of the processing text
      searchResults.items.forEach((range) => {
        range.delete();
      });

      await context.sync();
      return true;
    });
  } catch (error) {
    console.error("Error removing processing indicator:", error);
    return false;
  }
}

export function insertTextToWord(text, insertLocation = "replace") {
  try {
    return Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.clear();

      // Clean and process the text
      let cleanText = text
        .replace(/<\/?Response>/g, "")
        .replace(/\\n\\t/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\n\t/g, "\n")
        .replace(/\t/g, " ")
        .replace(/\*+/g, "")
        .replace(/\\\\/g, "\\")
        .trim();

      const textRange = selection.insertText(cleanText, Word.InsertLocation.replace);
      textRange.font.color = "#374151";
      textRange.font.size = 11;

      await context.sync();
      return true;
    });
  } catch (error) {
    console.error("Text insertion error:", error);
    return false;
  }
}
