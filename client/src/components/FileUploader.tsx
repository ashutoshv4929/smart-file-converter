import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
        isDragActive || isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className='flex flex-col items-center justify-center gap-2'>
        <svg 
          xmlns='http://www.w3.org/2000/svg' 
          className='h-12 w-12 text-gray-400' 
          fill='none' 
          viewBox='0 0 24 24' 
          stroke='currentColor'
        >
          <path 
            strokeLinecap='round' 
            strokeLinejoin='round' 
            strokeWidth={2} 
            d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' 
          />
        </svg>
        <p className='text-gray-600'>
          {isDragActive || isDragging 
            ? 'फाइल को यहाँ छोड़ें'
            : 'फाइल अपलोड करने के लिए क्लिक करें या खींचें और छोड़ें'}
        </p>
        <p className='text-sm text-gray-500'>PDF, DOCX, JPG, PNG फाइलें</p>
      </div>
    </div>
  );
};

export default FileUploader;
