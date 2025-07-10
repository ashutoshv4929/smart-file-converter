import { ConversionProgress } from '@/types/conversion';
import { Button } from '@/components/ui/button';

interface ProgressModalProps {
  isOpen: boolean;
  progress: ConversionProgress;
  onCancel: () => void;
}

export function ProgressModal({ isOpen, progress, onCancel }: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-surface dark:bg-surface-dark rounded-2xl p-8 w-full max-w-sm text-center">
          
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Converting File</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progress.status}
            </p>
            {progress.currentStep && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {progress.currentStep}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {Math.round(progress.percentage)}% Complete
          </div>

          <Button variant="outline" onClick={onCancel} className="text-gray-500 dark:text-gray-400">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
