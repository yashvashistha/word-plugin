/* global Office, Word */

// wordFormatter.js

export async function formatAndInsertToWord(response, setStatus) {
  if (!response) return false;

  try {
    setStatus?.("Formatting response…");

    const success = await Word.run(async (context) => {
      // 1) Clear the entire document
      context.document.body.clear();
      await context.sync();

      // 2) Build your paragraph objects
      const paragraphs = processContent(response);

      // 3) Insert them one by one
      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];

        // Add a blank line before everything except the very first
        if (i > 0) {
          context.document.body.insertParagraph("", "End");
          await context.sync();
        }

        if (para.type === "heading") {
          // Insert heading
          const headingPara = context.document.body.insertParagraph(para.text, "End");
          await context.sync();

          // Font styling
          headingPara.font.name = "Calibri";
          headingPara.font.size = 16;
          headingPara.font.bold = true;
          headingPara.font.color = "#2B579A";

          // Paragraph spacing
          headingPara.paragraphFormat.spaceAfter = 12;
          await context.sync();
        } else if (para.type === "list") {
          // Handle each list item
          for (let j = 0; j < para.items.length; j++) {
            const li = context.document.body.insertParagraph(`• ${para.items[j]}`, "End");
            await context.sync();

            // Font styling
            li.font.name = "Calibri";

            // Indent formatting
            li.paragraphFormat.leftIndent = 36;
            await context.sync();
          }
        } else {
          // Plain paragraph
          const p = context.document.body.insertParagraph(para.text, "End");
          await context.sync();

          // Font styling
          p.font.name = "Calibri";
          await context.sync();
        }
      }

      return true;
    });

    setStatus?.("✅ Response formatted and inserted!");
    return success;
  } catch (error) {
    console.error("Word formatting error:", error);
    setStatus?.("❌ Failed to format response");
    return false;
  }
}

function processContent(rawText) {
  const clean = rawText
    .replace(/<\/?Response>/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\*\*/g, "")
    .trim();

  const lines = clean.split("\n").filter((l) => l.trim());
  const paras = [];
  let curr = null;

  lines.forEach((ln) => {
    const t = ln.trim();
    if (isHeading(t)) {
      if (curr) paras.push(curr);
      paras.push({ type: "heading", text: t });
      curr = null;
    } else if (isListItem(t)) {
      if (!curr || curr.type !== "list") {
        if (curr) paras.push(curr);
        curr = { type: "list", items: [] };
      }
      curr.items.push(t.replace(/^[-*]\s+/, ""));
    } else {
      if (!curr || curr.type === "list") {
        if (curr) paras.push(curr);
        curr = { type: "paragraph", text: "" };
      }
      curr.text += (curr.text ? " " : "") + t;
    }
  });

  if (curr) paras.push(curr);
  return paras;
}

function isHeading(text) {
  return (
    text &&
    /^[A-Z][A-Za-z0-9 ]+[:.]?$/.test(text) &&
    !text.startsWith("-") &&
    text.split(" ").length <= 5
  );
}

function isListItem(text) {
  return /^[-*]\s+.+$/.test(text);
}
