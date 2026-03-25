"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileAudio, X, Loader2, CheckCircle2 } from "lucide-react";

const ALLOWED_EXTENSIONS = [
  ".mp3", ".mp4", ".wav", ".webm", ".ogg", ".flac", ".m4a",
];
const MAX_SIZE_MB = 500;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = (f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (f.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size: ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = useCallback((f: File) => {
    setError(null);
    setSuccess(false);
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess(true);
      setFile(null);

      // Redirect to dashboard after 1.5s
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Upload Lesson</h1>
      <p className="text-gray-500 mb-8">
        Upload an audio or video recording of a math lesson. The AI pipeline
        will automatically transcribe, analyze, and generate homework.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-colors duration-200
          ${dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700">
          Drag & drop your lesson file here
        </p>
        <p className="text-sm text-gray-500 mt-1">
          or click to browse — MP3, MP4, WAV, WebM, OGG, FLAC, M4A (max{" "}
          {MAX_SIZE_MB}MB)
        </p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-4 border">
          <div className="flex items-center gap-3">
            <FileAudio className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
              setError(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 text-red-700 rounded-lg p-4 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mt-4 bg-green-50 text-green-700 rounded-lg p-4 text-sm border border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Lesson uploaded! Pipeline started. Redirecting to dashboard...
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`
          mt-6 w-full py-3 px-6 rounded-lg font-medium text-white
          transition-colors duration-200 flex items-center justify-center gap-2
          ${!file || uploading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
          }
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload & Start Pipeline
          </>
        )}
      </button>
    </div>
  );
}
