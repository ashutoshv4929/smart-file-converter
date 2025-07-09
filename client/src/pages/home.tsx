import React, { useState, useEffect } from 'react';
import { FileText, FileImage, File, Upload, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ConversionType, ConversionProgress, ConversionStats, RecentFile } from '@/types/conversion';
import { ConversionModal } from '@/components/conversion-modal';
import { ProgressModal } from '@/components/progress-modal';
import { FileConverter } from '@/lib/file-converter';
import { LocalStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [conversionType, setConversionType] = useState<ConversionType>('pdf-to-word');
  const [progress, setProgress] = useState<ConversionProgress>({ percentage: 0, status: 'Initializing...' });
  const [stats, setStats] = useState<ConversionStats>({ conversionsToday: 0, totalConversions: 0, savedFiles: 0 });
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversions from server
  const { data: serverConversions } = useQuery({
    queryKey: ['/api/conversions'],
  });

  // Create conversion mutation
  const createConversionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/conversions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversions'] });
    },
  });

  // Load local data on mount
  useEffect(() => {
    setStats(LocalStorage.getStats());
    setRecentFiles(LocalStorage.getRecentFiles());
  }, []);

  const openConversionModal = (type: ConversionType) => {
    setConversionType(type);
    setModalOpen(true);
  };

  const handleStartConversion = async (file: File, outputFormat: string) => {
    setModalOpen(false);
    setProgressModalOpen(true);
    setProgress({ percentage: 0, status: 'Uploading file...', currentStep: 'Preparing request' });

    try {
      let fileName = file.name;
      // Call backend for conversion
      setProgress({ percentage: 20, status: 'Converting file on server...', currentStep: 'Processing' });
      const resultBlob = await FileConverter.convertViaBackend(file, conversionType, outputFormat, (percent) => {
        setProgress({ percentage: 20 + percent * 0.7, status: 'Server processing...', currentStep: 'Converting' });
      });
      setProgress({ percentage: 95, status: 'Preparing download...', currentStep: 'Finishing up' });

      // Download the file
      FileConverter.downloadFile(resultBlob, fileName, outputFormat);

      // Update local storage
      LocalStorage.incrementConversion();
      LocalStorage.addRecentFile({
        name: fileName.replace(/\.[^/.]+$/, "") + "_converted." + (outputFormat === 'word' ? 'docx' : outputFormat),
        date: 'Just now',
        size: `${(resultBlob.size / 1024 / 1024).toFixed(1)} MB`,
        type: outputFormat,
        originalFormat: file.type,
        targetFormat: outputFormat
      });

      // Create server record
      await createConversionMutation.mutateAsync({
        fileName: fileName,
        originalFormat: file.type,
        targetFormat: outputFormat,
        fileSize: file.size,
        status: 'completed'
      });

      // Update local state
      setStats(LocalStorage.getStats());
      setRecentFiles(LocalStorage.getRecentFiles());

      toast({
        title: "Success!",
        description: "File converted successfully and saved to your device.",
      });

    } catch (error) {
      console.error('Conversion failed:', error);
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setProgressModalOpen(false);
    }
  };

  const handleDeleteFile = (id: number) => {
    LocalStorage.removeRecentFile(id);
    setRecentFiles(LocalStorage.getRecentFiles());
    const newStats = LocalStorage.getStats();
    newStats.savedFiles = Math.max(0, newStats.savedFiles - 1);
    LocalStorage.updateStats(newStats);
    setStats(newStats);
    
    toast({
      title: "File Removed",
      description: "File removed from recent files list.",
    });
  };

  const handleShareFile = async (file: RecentFile) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          text: `Converted file: ${file.name}`,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(`Converted file: ${file.name}`);
      toast({
        title: "Copied to Clipboard",
        description: "File information copied to clipboard.",
      });
    }
  };

  return (
    <div className="pb-20 px-4 pt-6">
      
      {/* Welcome Section */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white mb-4">
          <h2 className="text-xl font-medium mb-2">Welcome back!</h2>
          <p className="text-primary-light text-sm mb-4">Convert your files offline with ease</p>
          <div className="flex justify-between text-center">
            <div>
              <div className="text-2xl font-bold">{stats.conversionsToday}</div>
              <div className="text-xs text-primary-light">Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
              <div className="text-xs text-primary-light">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.savedFiles}</div>
              <div className="text-xs text-primary-light">Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Options */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Choose Conversion</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div 
            onClick={() => openConversionModal('pdf-to-word')}
            className="bg-surface dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-3">
              <FileText className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <h4 className="font-medium text-sm mb-1">PDF Converter</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">To Word or Text</p>
          </div>

          <div 
            onClick={() => openConversionModal('word-to-pdf')}
            className="bg-surface dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-3">
              <File className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h4 className="font-medium text-sm mb-1">Doc to PDF</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Word & Text files</p>
          </div>

          <div 
            onClick={() => openConversionModal('image-to-pdf')}
            className="bg-surface dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-3">
              <FileImage className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h4 className="font-medium text-sm mb-1">Image to PDF</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Multi-page PDF</p>
          </div>

          <div 
            onClick={() => openConversionModal('ocr-extract')}
            className="bg-surface dark:bg-gray-800 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-xl flex items-center justify-center mb-3">
              <FileText className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <h4 className="font-medium text-sm mb-1">Extract Text</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">OCR from images</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Quick Actions</h3>
        
        <div className="space-y-3">
          <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors cursor-pointer">
            <div className="bg-orange-100 dark:bg-orange-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
              <FileImage className="text-orange-600 dark:text-orange-400" size={16} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Scan Document</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Camera → PDF</p>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </div>

          <div className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 active:bg-gray-50 dark:active:bg-gray-700 transition-colors cursor-pointer">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 w-10 h-10 rounded-lg flex items-center justify-center">
              <File className="text-indigo-600 dark:text-indigo-400" size={16} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm">Batch Convert</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Multiple files at once</p>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Recent Files</h3>
          <button className="text-primary text-sm font-medium">View All</button>
        </div>

        <div className="space-y-3">
          {recentFiles.slice(0, 3).map((file) => (
            <div key={file.id} className="bg-surface dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  file.type === 'pdf' ? 'bg-red-100 dark:bg-red-900/30' :
                  file.type === 'docx' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}>
                  {file.type === 'pdf' ? (
                    <FileText className={`${
                      file.type === 'pdf' ? 'text-red-600 dark:text-red-400' :
                      file.type === 'docx' ? 'text-blue-600 dark:text-blue-400' :
                      'text-green-600 dark:text-green-400'
                    }`} size={16} />
                  ) : file.type === 'docx' ? (
                    <File className="text-blue-600 dark:text-blue-400" size={16} />
                  ) : (
                    <FileImage className="text-green-600 dark:text-green-400" size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{file.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{file.date}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{file.size}</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleShareFile(file)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                  >
                    <Upload size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {recentFiles.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No recent conversions</p>
              <p className="text-sm">Start converting files to see them here</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConversionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        conversionType={conversionType}
        onStartConversion={handleStartConversion}
      />

      <ProgressModal
        isOpen={progressModalOpen}
        progress={progress}
        onCancel={() => setProgressModalOpen(false)}
      />
    </div>
  );
}
