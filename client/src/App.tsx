import React, { useState } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomNavigation } from "@/components/bottom-navigation";
import { useTheme } from "@/components/theme-provider";
import { RefreshCw } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Files from "@/pages/files";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import FileUploader from './components/FileUploader';
import ConversionStatus from './components/ConversionStatus';

function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-primary text-on-primary px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-3">
        <RefreshCw className="text-xl" size={20} />
        <h1 className="text-lg font-medium">Smart File Converter</h1>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-primary-dark transition-colors"
        >
          {theme === 'dark' ? (
            <i className="fas fa-sun text-sm"></i>
          ) : (
            <i className="fas fa-moon text-sm"></i>
          )}
        </button>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/files" component={Files} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [status, setStatus] = useState<'idle' | 'converting' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (file: File) => {
    setStatus('converting');
    setProgress(0);
    setMessage('');

    // Simulate conversion progress
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // In a real app, you would make an API call here
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(interval);
      setProgress(100);
      setStatus('completed');
      setMessage(`फाइल ${file.name} सफलतापूर्वक कनवर्ट हो गई है!`);
    } catch (error) {
      clearInterval(interval);
      setStatus('failed');
      setMessage('कनवर्जन प्रक्रिया में त्रुटि आई। कृपया पुनः प्रयास करें।');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-surface dark:bg-surface-dark min-h-screen shadow-lg">
      <AppHeader />
      <main>
        <Router />
        <div className='py-12 px-4 sm:px-6 lg:px-8'>
          <div className='max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8'>
            <h1 className='text-2xl font-bold text-center text-gray-800 mb-6'>स्मार्ट फाइल कनवर्टर</h1>
            
            <FileUploader 
              onFileUpload={handleFileUpload} 
              disabled={status === 'converting'}
            />
            
            <ConversionStatus 
              status={status} 
              progress={progress} 
              message={message} 
            />
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="font-roboto bg-background dark:bg-background-dark text-on-background dark:text-white min-h-screen">
            <AppContent />
            <Toaster />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
