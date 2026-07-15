"use client";

import { Upload } from "lucide-react";
import { uploadLogo } from "@/app/actions/config";

export function LogoUploadForm({ hasLogo }: { hasLogo: boolean }) {
  return (
    <form action={uploadLogo}>
      <label className="cursor-pointer btn-secondary inline-flex items-center gap-2 text-sm">
        <Upload className="h-4 w-4" />
        {hasLogo ? "เปลี่ยน Logo" : "อัปโหลด Logo"}
        <input
          type="file"
          name="logo"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
      </label>
    </form>
  );
}
