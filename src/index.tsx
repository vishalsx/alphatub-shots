import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind CSS

interface ApiResponse {
  object_name_en?: string;
  object_name_translated?: string;
  translated_to?: string;
  object_description_en?: string;
  object_description_translated?: string;
  object_hint_en?: string;
  object_hint_translated?: string;
  error?: string;
  raw_output?: string;
  exception?: string;
  detail?: string;
}

const API_URL = process.env.REACT_APP_FASTAPI_URL || 'http://localhost:8000/identify-object/';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('Hindi');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languageOptions = [
    'Hindi', 'Punjabi', 'Khasi', 'Garo', 'Marathi', 'Kokborok', 'Gujrati', 'Bengali', 'Tamil', 'Telugu',
    'Spanish', 'French', 'German', 'Vietnamese', 'Japanese'
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileChange = (selectedFile: File) => {
    if (!isValidFileType(selectedFile)) {
      setError('Unsupported file type. Please upload a valid image (jpg, jpeg, png, heic, heif, webp, gif, bmp, tiff).');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    resizeImage(selectedFile);
  };

  const resizeImage = (file: File) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 800;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            setFile(new File([blob], file.name, { type: file.type }));
            setPreviewUrl(canvas.toDataURL());
          }
        }, file.type);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/heic', 'image/heif',
      'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
    ];
    return validTypes.includes(file.type);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleIdentify = async () => {
    if (!file) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('language', language);

    try {
      console.log('Sending API request to:', API_URL);
      console.log('File:', file.name, 'Type:', file.type, 'Size:', file.size);
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Fetch Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      const data = await response.json();
      console.log('Fetch Response Data:', data);

      if (response.ok && data && typeof data === 'object') {
        setResult(data);
        setError(null);
      } else {
        setError(`Unexpected response: ${response.status} - ${response.statusText}${data.detail ? `: ${data.detail}` : ''}`);
        setResult(null);
      }
    } catch (err) {
      console.error('Fetch Error:', {
        message: (err as Error).message,
        name: (err as Error).name,
        stack: (err as Error).stack,
      });
      setError(`Network Error: ${String(err)}. Verify that the backend is running at ${API_URL} and CORS is configured.`);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFFFF] via-[#E6F7FC] to-[#FDE6E0] text-gray-900 font-sans antialiased">
      <header className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="p-2 rounded-lg bg-gradient-to-r from-[#E6F7FC] to-[#FDE6E0] shadow-md">
          <img
            src="/AlphaTub_logo.jpeg"
            alt="alphaTUB - TUBShots with AI"
            className="h-16 sm:h-20 object-contain"
          />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Image Upload Section */}
          <div className="col-span-1 flex flex-col items-center bg-gray-900 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div
              className="border-2 border-dashed border-teal-500 p-6 text-center bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors duration-300 w-full"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={handleClick}
            >
            <p className="text-4xl font-extrabold tracking-wide text-[#00AEEF] drop-shadow-[0_0_8px_rgba(0,174,239,0.6)]">
              Take <span className="text-[#F15A29] drop-shadow-[0_0_8px_rgba(241,90,41,0.6)]">TUB</span>
              <span className="text-[#00AEEF]"> Shot</span>
            </p>
              <p className="text-sm text-gray-400 mt-1">
                Drag and drop an image or click to upload 
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.bmp,.tiff,.tif"
                className="hidden"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              />
            </div>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Uploaded"
                className="mt-4 max-w-[800px] w-full h-auto object-contain rounded-lg animate-fade-in"
              />
            )}
            {!previewUrl && <p className="mt-4 text-gray-400">No image uploaded</p>}
          </div>

          {/* Language Selection and Results */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 p-6 rounded-xl shadow-md bg-gradient-to-br from-[#FFFFFF] via-[#E6F7FC] to-[#FDE6E0]">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="p-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-teal-500 outline-none transition-all duration-300"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang} className="bg-gray-900">
                    {lang}
                  </option>
                ))}
              </select>
              <button
                onClick={handleIdentify}
                disabled={isLoading}
                className={`bg-gradient-to-r from-[#E6F7FC] via-[#00AEEF] to-[#C8E6F9] 
                  text-[#003B57] p-3 rounded-lg font-semibold tracking-wide
                  transition-all duration-300 shadow-md
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'}`}
              >
               {isLoading ? 'Analyzing...' : 'Identify Image'}
              </button>

            </div>

            {error && (
            <div className="p-4 rounded-lg animate-fade-in bg-gradient-to-r from-[#FDE6E0] to-[#F8B4A0] border-l-4 border-red-500 shadow-md">
              <p className="font-bold text-red-600">{error}</p>
            </div>
           
            )}

            {result && !result.error && !result.detail ? (
              <div className="p-6 bg-gray-800 rounded-xl shadow-inner animate-fade-in">
              <p className="mb-2">
                <strong className="text-teal-400">English Object Name:</strong>{' '}
                <span className="text-white">{result.object_name_en || 'N/A'}</span>
              </p>
              <p className="mb-2">
                <strong className="text-teal-400">Translated Object Name:</strong>{' '}
                <span className="text-white">{result.object_name_translated || 'N/A'}</span>{' '}
                (<span className="text-white">{result.translated_to || 'N/A'}</span>)
              </p>
              <p className="mb-2">
                <strong className="text-teal-400">English Description:</strong>{' '}
                <span className="text-white">{result.object_description_en || 'N/A'}</span>
              </p>
              <p className="mb-2">
                <strong className="text-teal-400">Translated Description:</strong>{' '}
                <span className="text-white">{result.object_description_translated || 'N/A'}</span>
              </p>
              <p className="mb-2">
                <strong className="text-teal-400">English Hint:</strong>{' '}
                <span className="text-white">{result.object_hint_en || 'N/A'}</span>
              </p>
              <p className="mb-2">
                <strong className="text-teal-400">Translated Hint:</strong>{' '}
                <span className="text-white">{result.object_hint_translated || 'N/A'}</span>
              </p>
            </div>
            ) : result && (result.error || result.detail) ? (
              <div className="p-4 bg-red-900/50 text-red-200 rounded-lg animate-fade-in">
                <p className="font-medium"><strong>Error:</strong> {result.error || result.detail || 'Unknown error'}</p>
                <p><strong>Raw Output:</strong> {result.raw_output || 'N/A'}</p>
                <p><strong>Exception:</strong> {result.exception || 'N/A'}</p>
              </div>
            ) : (
              <p className="text-black-500 italic">
                Click <span className="font-semibold text-[#00AEEF]">'Identify Image'</span> to see results.
              </p>

            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);