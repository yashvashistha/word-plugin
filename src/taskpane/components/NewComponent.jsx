"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks"; // Add this plugin
import { cn } from "../lib/utils";

const MarkdownMessage = ({ content, searchInput, name, onTableDetect }) => {
  const [thinkingText, setThinkingText] = useState("");
  const [toolArgsText, setToolArgsText] = useState("");
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const toolNameMatches = [...content.matchAll(/<tool_name>(.*?)<\/tool_name>/g)];

    if (toolNameMatches.length > 0) {
      let contentText = "";
      if (toolNameMatches[toolNameMatches.length - 1][1] != thinkingText && thinkingText !== "") {
        const match = content.match(/.*<tool_name>Text(.*?)<\/tool_name>/);
        if (match) {
          contentText = match[1]
            .replace(/<tool_args>/g, "")
            .replace(/<\/tool_args>/g, "")
            .replace(/<tool_name>(.*?)<\/tool_name>/g, "");
        }
      } else {
        contentText = content;
      }
      setToolArgsText(contentText);
      const lastToolName = toolNameMatches[toolNameMatches.length - 1][1];
      setFade(false);
      setTimeout(() => {
        setThinkingText(lastToolName);
        setFade(true);
      }, 100);
    } else {
      setThinkingText("");
      setToolArgsText(content);
    }
  }, [content]);

  const renderers = {
    code({ node, inline, className, children, ...props }) {
      try {
        const language = className ? className.replace("language-", "") : "";
        const chartdata = JSON.parse(children);
        onTableDetect(true);
        return <ChartBlock type={language} data={chartdata} />;
      } catch (err) {
        const language = className ? className.replace("language-", "") : "";
        return inline ? (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm" {...props}>
            {children}
          </code>
        ) : language !== "" ? (
          <CodeBlock language={language} value={String(children).replace(/\n$/, "")} />
        ) : (
          <>{children}</>
        );
      }
    },
  };

  const applyHighlighting = (children, tag) => {
    if (typeof children !== "string" || !searchInput) {
      return React.createElement(tag, null, children);
    }

    try {
      const escapedSearchInput = searchInput.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const parts = children.split(new RegExp(`(${escapedSearchInput})`, "gi"));

      return React.createElement(
        tag,
        null,
        parts.map((part, index) =>
          part.toLowerCase() === searchInput.toLowerCase() ? (
            <span key={index} className="bg-yellow-200 dark:bg-yellow-800">
              {part}
            </span>
          ) : (
            part
          )
        )
      );
    } catch (err) {
      console.error("Error in Highlighting", err);
      return React.createElement(tag, null, children);
    }
  };

  const TableComponent = ({ children }) => {
    onTableDetect(true);
    return (
      <div className="my-4 w-full overflow-auto">
        <table className="w-full border-collapse border border-border">{children}</table>
      </div>
    );
  };

  const customRenderers = {
    p: ({ children }) => (
      <p className="mb-4 leading-7 [&:not(:first-child)]:mt-6 whitespace-pre-wrap">
        {applyHighlighting(children, "p")}
      </p>
    ),
    h1: ({ children }) => (
      <h1 className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        {applyHighlighting(children, "h1")}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0">
        {applyHighlighting(children, "h2")}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight">
        {applyHighlighting(children, "h3")}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-8 scroll-m-20 text-lg font-semibold tracking-tight">
        {applyHighlighting(children, "h4")}
      </h4>
    ),
    h5: ({ children }) => (
      <h5 className="mt-8 scroll-m-20 text-base font-semibold tracking-tight">
        {applyHighlighting(children, "h5")}
      </h5>
    ),
    h6: ({ children }) => (
      <h6 className="mt-8 scroll-m-20 text-sm font-semibold tracking-tight">
        {applyHighlighting(children, "h6")}
      </h6>
    ),
    li: ({ children }) => <li className="mt-2">{children}</li>,
    ul: ({ children }) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2">{children}</ul>,
    ol: ({ children }) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2">{children}</ol>,
    strong: ({ children }) => (
      <strong className="font-semibold">{applyHighlighting(children, "strong")}</strong>
    ),
    pre: ({ children }) => <pre className="overflow-auto whitespace-pre-wrap">{children}</pre>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    ),
    table: ({ children }) => <TableComponent>{children}</TableComponent>,
    thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
    th: ({ children }) => (
      <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => <td className="border border-border px-4 py-2">{children}</td>,
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 border-border pl-6 italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-4 border-border" />,
    img: ({ src, alt, ...props }) => (
      <img
        src={src || "/placeholder.svg"}
        alt={alt || ""}
        className="my-4 rounded-md border border-border"
        {...props}
      />
    ),
    // Add explicit br renderer
    br: () => <br />,
  };

  return (
    <div className={cn("prose dark:prose-invert max-w-none", name)}>
      <ReactMarkdown
        children={toolArgsText}
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} // Added remarkBreaks
        rehypePlugins={[rehypeKatex]}
        components={{
          ...renderers,
          ...customRenderers,
        }}
      />
      {thinkingText && (
        <p
          className={cn(
            "mt-4 animate-pulse text-sm text-muted-foreground",
            fade ? "opacity-100 transition-opacity duration-300" : "opacity-0"
          )}
        >
          {thinkingText}
        </p>
      )}
    </div>
  );
};

function determineContentType(language) {
  switch (language.toLowerCase()) {
    case "html":
      return "html";
    case "js":
    case "javascript":
      return "javascript";
    case "svg":
      return "svg";
    case "md":
    case "markdown":
      return "markdown";
    case "mermaid":
      return "mermaid";
    default:
      return "text";
  }
}

export default MarkdownMessage;
