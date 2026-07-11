import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface UploadZoneProps {
  onFileAccepted: (file: File) => void;
  isProcessing: boolean;
}

export function UploadZone({ onFileAccepted, isProcessing }: UploadZoneProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);

      if (rejectedFiles && (rejectedFiles as Array<unknown>).length > 0) {
        setError('Invalid file type. Please upload an .xlsx or .xls file.');
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setFileName(file.name);
      onFileAccepted(file);
    },
    [onFileAccepted]
  );

  const clearFile = useCallback(() => {
    setFileName(null);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer rounded-lg border-2 border-dashed 
          transition-all duration-300 ease-out
          ${isDragActive
            ? 'border-blue-500/60 bg-blue-500/5'
            : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} id="xlsx-upload-input" />

        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          {fileName ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-200">{fileName}</p>
                <p className="text-xs text-zinc-500">
                  {isProcessing ? 'Processing…' : 'File loaded successfully'}
                </p>
              </div>
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="ml-2 rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-full border border-zinc-700/50 bg-zinc-800/50 p-3 transition-colors group-hover:border-zinc-600">
                <Upload
                  className={`h-6 w-6 transition-colors ${
                    isDragActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'
                  }`}
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-sm font-medium text-zinc-300">
                {isDragActive ? 'Drop your file here' : 'Drop your broker statement here'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                or <span className="text-zinc-400 underline underline-offset-2">browse files</span>
                {' · '}.xlsx / .xls
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-red-400" />
          {error}
        </p>
      )}
    </div>
  );
}
