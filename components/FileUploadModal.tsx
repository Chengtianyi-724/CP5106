'use client'
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FileUploadModal = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const onDrop = (acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    const fileType = uploadedFile.type;
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (validTypes.includes(fileType)) {
      setFile(uploadedFile);
      setError("");
    } else {
      setError("Please upload only CSV or Excel files.");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleUpload = () => {
    if (file) {
      // Implement your file upload logic here
      console.log("Uploading file:", file);
      // Reset state after upload
      setFile(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Upload File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Upload CSV or Excel File</DialogTitle>
        </DialogHeader>
        <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-center">Drop the file here ...</p>
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p>Drag 'n' drop a file here, or click to select a file</p>
              <em className="text-xs text-gray-500">(Only CSV and Excel files are accepted)</em>
            </div>
          )}
        </div>
        {file && (
          <div className="mt-4 p-2 bg-gray-100 rounded flex items-center justify-between">
            <span className="text-sm truncate">{file.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button onClick={handleUpload} disabled={!file}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;