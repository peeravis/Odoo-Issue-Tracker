"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1 text-gray-900 dark:text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1 text-gray-900 dark:text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-800 dark:text-gray-200">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="block bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto my-2 whitespace-pre">
              {children}
            </code>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-700 pl-3 my-2 text-gray-600 dark:text-gray-400 italic text-sm">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800">
            {children}
          </a>
        ),
        hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-200 dark:border-gray-700 px-2 py-1 bg-gray-50 dark:bg-gray-800 font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 dark:border-gray-700 px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
