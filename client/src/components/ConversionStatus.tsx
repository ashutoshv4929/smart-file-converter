import React from 'react';

interface ConversionStatusProps {
  status: 'idle' | 'converting' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

const ConversionStatus: React.FC<ConversionStatusProps> = ({ 
  status, 
  progress = 0, 
  message 
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'converting':
        return 'कनवर्ट हो रहा है...';
      case 'completed':
        return 'कनवर्जन सफल!';
      case 'failed':
        return 'त्रुटि: कनवर्जन विफल';
      default:
        return 'फाइल अपलोड करें';
    }
  };

  return (
    <div className='mt-4'>
      <div className='flex items-center justify-between mb-1'>
        <span className='text-sm font-medium text-gray-700'>{getStatusText()}</span>
        {status === 'converting' && (
          <span className='text-sm font-medium text-gray-700'>{Math.round(progress)}%</span>
        )}
      </div>
      
      {status === 'converting' && (
        <div className='w-full bg-gray-200 rounded-full h-2.5'>
          <div 
            className='bg-blue-600 h-2.5 rounded-full transition-all duration-300' 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      {message && (
        <div className={`mt-2 text-sm ${
          status === 'completed' ? 'text-green-600' : 
          status === 'failed' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default ConversionStatus;
