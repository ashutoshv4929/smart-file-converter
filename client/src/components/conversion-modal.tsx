import React, { useState, ForwardRefExoticComponent, RefAttributes } from 'react';
import { X, Upload, FileText, File, FileImage, FileInput, FileOutput, Image as ImageIcon, Text, FileType, FileJson } from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConversionType } from '@/types/conversion';

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversionType: ConversionType;
  onStartConversion: (file: File, outputFormat: string) => void;
}

interface OutputOption {
  format: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

const conversionConfigs: Record<ConversionType, {
  title: string;
  acceptTypes: string;
  outputOptions: OutputOption[];
}> = {
  'pdf-to-word': {
    title: 'PDF to Word Converter',
    acceptTypes: '.pdf',
    outputOptions: [
      { format: 'docx', icon: FileText, label: 'Word (.docx)', description: 'Editable format' },
      { format: 'txt', icon: File, label: 'Text (.txt)', description: 'Plain text' }
    ]
  },
  'word-to-pdf': {
    title: 'Word to PDF Converter',
    acceptTypes: '.doc,.docx',
    outputOptions: [
      { format: 'pdf', icon: File, label: 'PDF (.pdf)', description: 'Portable format' }
    ]
  },
  'text-to-pdf': {
    title: 'Text to PDF Converter',
    acceptTypes: '.txt',
    outputOptions: [
      { format: 'pdf', icon: File, label: 'PDF (.pdf)', description: 'Portable format' }
    ]
  },
  'image-to-pdf': {
    title: 'Image to PDF Converter',
    acceptTypes: '.jpg,.jpeg,.png',
    outputOptions: [
      { format: 'pdf', icon: File, label: 'PDF (.pdf)', description: 'Multi-page PDF' }
    ]
  },
  'ocr-extract': {
    title: 'OCR Text Extractor',
    acceptTypes: '.jpg,.jpeg,.png',
    outputOptions: [
      { format: 'txt', icon: File, label: 'Text (.txt)', description: 'Plain text' },
      { format: 'docx', icon: FileText, label: 'Word (.docx)', description: 'Editable document' }
    ]
  },
  'pdf-to-text': {
    title: "PDF to Text",
    acceptTypes: ".pdf",
    outputOptions: [
      { format: "txt", icon: FileText, label: "Text File", description: "Convert to plain text" }
    ]
  }
};

export function ConversionModal({ isOpen, onClose, conversionType, onStartConversion }: ConversionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  const config = conversionConfigs[conversionType];

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (config.outputOptions.length === 1) {
        setSelectedFormat(config.outputOptions[0].format);
      }
    }
  };

  const handleStartConversion = () => {
    if (selectedFile && selectedFormat) {
      onStartConversion(selectedFile, selectedFormat);
      setSelectedFile(null);
      setSelectedFormat('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div className="flex items-end justify-center min-h-screen">
        <div className="bg-surface dark:bg-surface-dark w-full max-w-md rounded-t-3xl p-6 transform transition-transform">
          
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">{config.title}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center mb-6">
            <div className="bg-primary-light dark:bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="text-primary text-2xl" size={24} />
            </div>
            <h4 className="font-medium mb-2">
              Select {conversionType.includes('image') ? 'Image' : conversionType.includes('pdf') ? 'PDF' : 'Document'} File
            </h4>
            {selectedFile ? (
              <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                Selected: {selectedFile.name}
              </p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Tap to browse or drag and drop
              </p>
            )}
            <input
              type="file"
              accept={config.acceptTypes}
              onChange={handleFileSelect}
              className="hidden"
              id="fileInput"
              multiple={conversionType === 'image-to-pdf'}
            />
            <Button onClick={() => document.getElementById('fileInput')?.click()}>
              Browse Files
            </Button>
          </div>

          {/* Output Format Selection */}
          {config.outputOptions.length > 1 && (
            <div className="space-y-3 mb-6">
              <h4 className="font-medium">Convert to:</h4>
              <div className="grid grid-cols-2 gap-3">
                {config.outputOptions.map((outputOption: OutputOption) => (
                  <button
                    key={outputOption.format}
                    onClick={() => setSelectedFormat(outputOption.format)}
                    className={`border rounded-lg p-3 text-left transition-colors ${
                      selectedFormat === outputOption.format
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                    }`}
                  >
                    <outputOption.icon className="mb-2" size={16} />
                    <div className="font-medium text-sm">{outputOption.label}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{outputOption.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert Button */}
          <Button
            onClick={handleStartConversion}
            disabled={!selectedFile || !selectedFormat}
            className="w-full"
          >
            Start Conversion
          </Button>

        </div>
      </div>
    </div>
  );
}
