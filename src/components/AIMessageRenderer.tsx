import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot } from "lucide-react";

interface AIMessageRendererProps {
  content: string;
}

export function AIMessageRenderer({ content }: AIMessageRendererProps) {
  return (
    <div className="flex justify-start group animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-3 w-full max-w-[95%] md:max-w-[88%]">
        {/* Avatar */}
        <div className="mt-1 h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-md ring-2 ring-blue-100 dark:ring-blue-900/40">
          <Bot size={15} className="text-white" />
        </div>

        {/* Message card */}
        <div className="flex-1 min-w-0">
          <div
            className="
              bg-white dark:bg-zinc-900 
              border border-zinc-100 dark:border-zinc-800 
              rounded-2xl rounded-tl-none 
              shadow-sm overflow-hidden
            "
          >
            <div
              className="
                px-5 py-4
                prose prose-sm dark:prose-invert max-w-none
                [&>*:first-child]:mt-0
                [&>*:last-child]:mb-0

                /* Headings */
                [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-zinc-900 dark:[&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:border-b [&_h1]:border-zinc-100 dark:[&_h1]:border-zinc-800 [&_h1]:pb-2
                [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-zinc-800 dark:[&_h2]:text-zinc-100 [&_h2]:mb-2 [&_h2]:mt-4
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-700 dark:[&_h3]:text-zinc-200 [&_h3]:mb-1.5 [&_h3]:mt-3

                /* Paragraphs */
                [&_p]:text-[14px] [&_p]:leading-relaxed [&_p]:text-zinc-700 dark:[&_p]:text-zinc-300 [&_p]:mb-3

                /* Bold */
                [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-white

                /* Lists */
                [&_ul]:my-2 [&_ul]:space-y-1.5 [&_ul]:list-none [&_ul]:pl-0
                [&_ol]:my-2 [&_ol]:space-y-1.5 [&_ol]:list-none [&_ol]:pl-0 [&_ol]:counter-reset-[item]

                [&_li]:relative [&_li]:pl-5 [&_li]:text-[13.5px] [&_li]:leading-relaxed [&_li]:text-zinc-700 dark:[&_li]:text-zinc-300

                /* Custom bullet: subtle blue dash */
                [&_ul>li]:before:content-['–'] [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-blue-400 [&_ul>li]:before:font-bold

                /* Ordered list numbers */
                [&_ol>li]:counter-increment-[item] [&_ol>li]:before:content-[counter(item)'.'] [&_ol>li]:before:absolute [&_ol>li]:before:left-0 [&_ol>li]:before:text-blue-500 [&_ol>li]:before:text-[11px] [&_ol>li]:before:font-bold [&_ol>li]:before:top-0.5

                /* Code */
                [&_code]:bg-zinc-100 dark:[&_code]:bg-zinc-800 [&_code]:text-blue-600 dark:[&_code]:text-blue-400 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12px] [&_code]:font-mono

                /* Blockquote - used for key insights */
                [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:bg-blue-50 dark:[&_blockquote]:bg-blue-950/30 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:pr-3 [&_blockquote]:rounded-r-xl [&_blockquote]:my-3 [&_blockquote]:not-italic
                [&_blockquote_p]:text-blue-800 dark:[&_blockquote_p]:text-blue-200 [&_blockquote_p]:text-[13px] [&_blockquote_p]:mb-0 [&_blockquote_p]:font-medium

                /* Horizontal rule as section divider */
                [&_hr]:border-zinc-100 dark:[&_hr]:border-zinc-800 [&_hr]:my-4

                /* Tables */
                [&_table]:w-full [&_table]:text-[12.5px] [&_table]:border-collapse [&_table]:my-3
                [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:bg-zinc-50 dark:[&_th]:bg-zinc-800 [&_th]:text-zinc-600 dark:[&_th]:text-zinc-300 [&_th]:font-semibold [&_th]:border-b [&_th]:border-zinc-200 dark:[&_th]:border-zinc-700
                [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-zinc-100 dark:[&_td]:border-zinc-800 [&_td]:text-zinc-700 dark:[&_td]:text-zinc-300
                [&_tr:last-child_td]:border-0
                [&_tr:hover_td]:bg-zinc-50 dark:[&_tr:hover_td]:bg-zinc-800/50
              "
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Emoji-aware paragraph: detect if line is mostly emoji/title
                  p: ({ children }) => {
                    const text = String(children);
                    const isEmojiHeader =
                      /^[\p{Emoji}\s]{1,4}[A-Z]/u.test(text) &&
                      text.length < 80;
                    if (isEmojiHeader) {
                      return (
                        <p className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-100 mb-2 leading-snug">
                          {children}
                        </p>
                      );
                    }
                    return (
                      <p className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300 mb-3">
                        {children}
                      </p>
                    );
                  },

                  // Section headers get accent pill
                  h2: ({ children }) => (
                    <div className="flex items-center gap-2 mt-5 mb-2.5 first:mt-0">
                      <span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shrink-0" />
                      <h2 className="text-[13.5px] font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wide">
                        {children}
                      </h2>
                    </div>
                  ),

                  h3: ({ children }) => (
                    <h3 className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 mt-3 mb-1.5">
                      {children}
                    </h3>
                  ),

                  // List items get a soft card background on hover
                  li: ({ children, ...props }) => (
                    <li
                      className="
                        relative pl-5 py-1 px-3 
                        text-[13.5px] leading-relaxed 
                        text-zinc-700 dark:text-zinc-300
                        rounded-lg
                        hover:bg-zinc-50 dark:hover:bg-zinc-800/60
                        transition-colors duration-150
                        cursor-default
                        before:absolute before:left-1.5 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-blue-400
                      "
                    >
                      {children}
                    </li>
                  ),

                  ul: ({ children }) => (
                    <ul className="my-2 space-y-0.5 list-none pl-0">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="my-2 space-y-0.5 list-none pl-0 counter-reset">
                      {children}
                    </ol>
                  ),

                  // Blockquotes as insight callouts
                  blockquote: ({ children }) => (
                    <div className="my-3 flex gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3.5">
                      <span className="text-lg shrink-0 mt-0.5">💡</span>
                      <div className="text-[13px] leading-relaxed text-blue-800 dark:text-blue-200 font-medium [&_p]:mb-0">
                        {children}
                      </div>
                    </div>
                  ),

                  // HR as visual section break
                  hr: () => (
                    <div className="my-4 flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                      <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                  ),

                  // Tables with zebra striping
                  table: ({ children }) => (
                    <div className="my-3 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                      <table className="w-full text-[12.5px] border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="text-left px-3.5 py-2.5 font-semibold text-zinc-600 dark:text-zinc-300 text-[11.5px] uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3.5 py-2.5 text-zinc-700 dark:text-zinc-300 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                      {children}
                    </td>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      {children}
                    </tr>
                  ),

                  // Inline code
                  code: ({ children }) => (
                    <code className="bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md text-[12px] font-mono">
                      {children}
                    </code>
                  ),

                  // Strong text
                  strong: ({ children }) => (
                    <strong className="font-semibold text-zinc-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}