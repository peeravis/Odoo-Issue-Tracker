"use client";

import { useState, useRef } from "react";
import { Paperclip, X, FileText, ZoomIn } from "lucide-react";

interface FilePreview {
  name: string;
  url: string | null;
  type: string;
}

interface DescriptionWithAttachmentsProps {
  defaultDescription?: string;
}

export function DescriptionWithAttachments({ defaultDescription = "" }: DescriptionWithAttachmentsProps) {
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const dtRef = useRef<DataTransfer | null>(null);

  const getDataTransfer = () => {
    if (!dtRef.current) dtRef.current = new DataTransfer();
    return dtRef.current;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const dt = getDataTransfer();
    files.forEach((f) => dt.items.add(f));
    if (hiddenInputRef.current) hiddenInputRef.current.files = dt.files;

    const newPreviews: FilePreview[] = files.map((f) => ({
      name: f.name,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      type: f.type,
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    const dt = getDataTransfer();
    const newDt = new DataTransfer();
    Array.from(dt.files)
      .filter((_, i) => i !== index)
      .forEach((f) => newDt.items.add(f));
    dtRef.current = newDt;
    if (hiddenInputRef.current) hiddenInputRef.current.files = newDt.files;

    setPreviews((prev) => {
      const removed = prev[index];
      if (removed.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
          <button className="absolute top-4 right-4 text-white hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {/* Description textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Issue Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            rows={4}
            required
            defaultValue={defaultDescription}
            className="input-base w-full"
            placeholder="รายละเอียดของ issue..."
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            แนบไฟล์ / รูปภาพ
          </label>

          {/* Hidden input that holds accumulated files for form submission */}
          <input ref={hiddenInputRef} type="file" name="attachments" multiple className="hidden" />

          {/* Trigger input */}
          <input ref={triggerRef} type="file" multiple className="hidden" onChange={handleFileChange} />

          <button
            type="button"
            onClick={() => triggerRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          >
            <Paperclip className="h-4 w-4" />
            เลือกไฟล์
          </button>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((p, i) =>
                p.url ? (
                  <div key={i} className="relative group">
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                      onClick={() => setLightbox(p.url)}
                      title={p.name}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightbox(p.url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <div key={i} className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm group">
                    <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 max-w-[140px] truncate">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
