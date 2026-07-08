"use client";

import { useState } from "react";
import { Paperclip, Download, ChevronDown, ChevronUp } from "lucide-react";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { formatDate } from "@/lib/utils";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function getExt(url: string) {
  return url.substring(url.lastIndexOf(".")).toLowerCase();
}

type Attachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: Date;
  uploadedById: string;
  uploadedBy: { name: string };
};

interface AttachmentListProps {
  attachments: Attachment[];
  sessionUserId: string;
  canManage: boolean;
  deleteAction: (id: string) => Promise<void>;
}

export function AttachmentList({ attachments, sessionUserId, canManage, deleteAction }: AttachmentListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (attachments.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-400 italic">ยังไม่มีไฟล์แนบ</p>;
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {attachments.map((a) => {
        const ext = getExt(a.fileUrl);
        const isImage = IMAGE_EXTS.has(ext);
        const isPreviewOpen = expanded.has(a.id);
        const canDelete = a.uploadedById === sessionUserId || canManage;

        return (
          <div key={a.id} className="group">
            <div className="px-6 py-3 flex items-center gap-3">
              <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{a.fileName}</p>
                <p className="text-xs text-gray-400">{a.uploadedBy.name} · {formatDate(a.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isImage && (
                  <button
                    onClick={() => toggleExpand(a.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded transition-colors"
                    title={isPreviewOpen ? "Hide preview" : "Show preview"}
                  >
                    {isPreviewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:text-indigo-600 p-1 rounded transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canDelete && (
                  <DeleteConfirmButton action={deleteAction.bind(null, a.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded transition-opacity" iconClassName="h-3.5 w-3.5" />
                )}
              </div>
            </div>
            {isImage && isPreviewOpen && (
              <div className="px-6 pb-3">
                <img
                  src={a.fileUrl}
                  alt={a.fileName}
                  className="max-h-60 rounded-lg border border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-900/30"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
