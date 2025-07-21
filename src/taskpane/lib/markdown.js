/**
 * Utility functions for markdown formatting and processing
 */

/**
 * Convert markdown text to plain text for Word insertion
 * @param {string} markdown - The markdown text to convert
 * @returns {string} - Plain text version
 */
export const markdownToPlainText = (markdown) => {
  if (!markdown) return "";

  return (
    markdown
      // Remove bold formatting
      .replace(/\*\*(.*?)\*\*/g, "$1")
      // Remove italic formatting
      .replace(/\*(.*?)\*/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```\w*\n?/g, "").replace(/```/g, "");
      })
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove horizontal rules
      .replace(/^-{3,}$/gm, "")
      // Remove list markers
      .replace(/^\s*[-*+]\s+/gm, "• ")
      // Remove numbered list markers
      .replace(/^\s*\d+\.\s+/gm, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
};

/**
 * Extract structured content from markdown for Word formatting
 * @param {string} markdown - The markdown text to parse
 * @returns {Array} - Array of content blocks with formatting info
 */
export const parseMarkdownForWord = (markdown) => {
  if (!markdown) return [];

  const blocks = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      blocks.push({
        type: "header",
        level: headerMatch[1].length,
        text: headerMatch[2],
        bold: true,
        size: Math.max(16 - headerMatch[1].length * 2, 12),
      });
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code",
        text: codeLines.join("\n"),
        font: "Consolas",
        backgroundColor: "#f5f5f5",
      });
      continue;
    }

    // Regular paragraph with inline formatting
    if (line.trim()) {
      blocks.push({
        type: "paragraph",
        text: line,
        hasInlineFormatting: true,
      });
    } else {
      // Empty line
      blocks.push({
        type: "break",
      });
    }
  }

  return blocks;
};

/**
 * Apply inline formatting to text for Word
 * @param {string} text - Text with markdown formatting
 * @returns {Array} - Array of text segments with formatting
 */
export const parseInlineFormatting = (text) => {
  const segments = [];
  let currentIndex = 0;

  // Find all formatting patterns
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, format: { bold: true } },
    { regex: /\*(.*?)\*/g, format: { italic: true } },
    { regex: /`([^`]+)`/g, format: { font: "Consolas", backgroundColor: "#f5f5f5" } },
  ];

  const matches = [];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        format: pattern.format,
        fullMatch: match[0],
      });
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Process text segments
  matches.forEach((match) => {
    // Add text before this match
    if (match.start > currentIndex) {
      const beforeText = text.substring(currentIndex, match.start);
      if (beforeText) {
        segments.push({ text: beforeText, format: {} });
      }
    }

    // Add formatted text
    segments.push({
      text: match.text,
      format: match.format,
    });

    currentIndex = match.end;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      segments.push({ text: remainingText, format: {} });
    }
  }

  // If no matches found, return the whole text
  if (segments.length === 0) {
    segments.push({ text: text, format: {} });
  }

  return segments;
};

/**
 * Validate if text contains markdown formatting
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains markdown
 */
export const hasMarkdownFormatting = (text) => {
  if (!text) return false;

  const markdownPatterns = [
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /^#{1,6}\s+/m, // Headers
    /```[\s\S]*?```/, // Code blocks
    /^\s*[-*+]\s+/m, // Lists
    /^\s*\d+\.\s+/m, // Numbered lists
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
};

/**
 * Clean text for Word insertion (remove problematic characters)
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
export const cleanTextForWord = (text) => {
  if (!text) return "";

  return (
    text
      // Replace smart quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Replace em dashes
      .replace(/—/g, "-")
      // Replace ellipsis
      .replace(/…/g, "...")
      // Remove or replace other problematic Unicode characters
      .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, " ")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
};
