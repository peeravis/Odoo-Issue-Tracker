"use client";

import { useState } from "react";
import { Paperclip, Download, Eye, X } from "lucide-react";
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

type PreviewState = { url: string; type: "image" | "pdf"; name: string } | null;

export function AttachmentList({ attachments, sessionUserId, canManage, deleteAction }: AttachmentListProps) {
  const [preview, setPreview] = useState<PreviewState>(null);

  if (attachments.length === 0) {
    return <p className="px-6 py-4 text-sm text-gray-400 italic">ยังไม่มีไฟล์แนบ</p>;
  }

  return (
    <>
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative w-full max-w-4xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-white text-sm font-medium truncate pr-4">{preview.name}</p>
              <button onClick={() => setPreview(null)} className="text-white hover:text-gray-300 flex-shrink-0 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            {preview.type === "image" ? (
              <img
                src={preview.url}
                alt={preview.name}
                className="max-h-[85vh] w-full object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <iframe
                src={preview.url}
                className="w-full h-[85vh] rounded-lg bg-white"
                title={preview.name}
              />
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {attachments.map((a) => {
          const ext = getExt(a.fileUrl);
          const isImage = IMAGE_EXTS.has(ext);
          const isPdf = ext === ".pdf";
          const canPreview = isImage || isPdf;
          const canDelete = a.uploadedById === sessionUserId || canManage;

          const openPreview = () =>
            setPreview({ url: a.fileUrl, type: isImage ? "image" : "pdf", name: a.fileName });

          return (
            <div key={a.id} className="group px-6 py-3 flex items-center gap-3">
              <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm text-gray-900 dark:text-white truncate ${canPreview ? "cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" : ""}`}
                  onClick={canPreview ? openPreview : undefined}
                >
                  {a.fileName}
                </p>
                <p className="text-xs text-gray-400">{a.uploadedBy.name} · {formatDate(a.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {canPreview && (
                  <button
                    onClick={openPreview}
                    className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 p-1 rounded transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                <a
                  href={a.fileUrl}
                  download={a.fileName}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canDelete && (
                  <DeleteConfirmButton
                    action={deleteAction.bind(null, a.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded transition-opacity"
                    iconClassName="h-3.5 w-3.5"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
