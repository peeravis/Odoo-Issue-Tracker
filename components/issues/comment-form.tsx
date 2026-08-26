"use client";

import { useRef, useState, useTransition } from "react";
import { addComment, uploadCommentImage } from "@/app/actions/issues";

interface Props {
  issueId: string;
  avatarLetter: string;
}

export function CommentForm({ issueId, avatarLetter }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    }, 0);
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (!imageItem) return;

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await uploadCommentImage(issueId, fd);
      insertAtCursor(`![image](${url})`);
    } catch (err) {
      console.error("[comment-form] paste upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || uploading || pending) return;
    const snapshot = content;
    setContent("");
    const fd = new FormData();
    fd.append("content", snapshot);
    startTransition(async () => {
      await addComment(issueId, fd);
    });
  }

  const busy = uploading || pending;

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
        {avatarLetter}
      </div>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder={uploading ? "กำลังอัปโหลดรูป..." : "เพิ่ม comment... (Ctrl+V วางรูปได้เลย)"}
          rows={2}
          disabled={busy}
          className="input-base w-full resize-none"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 dark:bg-gray-800/70 text-xs text-gray-500">
            กำลังอัปโหลด...
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={busy || !content.trim()}
        className="btn-primary self-end flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "..." : "Send"}
      </button>
    </form>
  );
}
