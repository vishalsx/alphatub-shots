import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import Tailwind CSS
import { PencilSquareIcon, EyeIcon, ArrowDownOnSquareIcon, XMarkIcon, ChevronDownIcon, ServerIcon } from '@heroicons/react/24/solid';

interface LanguageResult {
  object_name: string;
  object_description: string;
  object_hint: string;
  isLoading?: boolean;
  error?: string;
  // Existing backend data
  existing_object_name?: string;
  existing_object_description?: string;
  existing_object_hint?: string;
}

interface ApiResponse {
  object_name_en_base?: string;
  object_name_en?: string;
  object_name_translated?: string;
  translated_to?: string;
  object_description_en?: string;
  object_description_translated?: string;
  object_hint_en?: string;
  object_hint_translated?: string;
  object_category?: string;
  tags?: string[];
  error?: string;
  raw_output?: string;
  exception?: string;
  detail?: string;
  image_hash?: string;
  // Existing backend data
  existing_object_category?: string;
  existing_object_tags?: string[];
  existing_object_name_en?: string;
  existing_object_name?: string;
  existing_object_description?: string;
  existing_object_hint?: string;
}

const API_URL = process.env.REACT_APP_FASTAPI_URL || 'http://localhost:8000/';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Hindi']);
  const [activeTab, setActiveTab] = useState<string>('English');
  const [languageResults, setLanguageResults] = useState<{ [key: string]: LanguageResult }>({});
  const [commonData, setCommonData] = useState<{
    object_category: string;
    tags: string[];
    object_name_en_base: string;
    // Existing backend data
    existing_object_category?: string;
    existing_tags?: string[];
    existing_object_name_en_base?: string;
  }>({
    object_category: '',
    tags: [],
    object_name_en_base: '',
    existing_object_category: '',
    existing_tags: [],
    existing_object_name_en_base: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalResults, setOriginalResults] = useState<{ [key: string]: LanguageResult }>({});
  const [originalCommonData, setOriginalCommonData] = useState<typeof commonData>({
    object_category: '',
    tags: [],
    object_name_en_base: ''
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'unsaved' | 'saved' }>({});
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState<boolean>(false);
  const [isDatabaseView, setIsDatabaseView] = useState<{ [key: string]: boolean }>({});
  const [hasExistingData, setHasExistingData] = useState<{ [key: string]: boolean }>({});
  
  const languageOptions = [
    'Hindi', 'Punjabi', 'Khasi', 'Garo', 'Marathi', 'Kokborok', 'Gujrati', 'Bengali', 'Tamil', 'Telugu',
    'Spanish', 'French', 'German', 'Vietnamese', 'Japanese', 'Urdu', 'Arabic'
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(language)) {
        const newLanguages = prev.filter(lang => lang !== language);
        // If removing active tab, switch to English or first available
        if (activeTab === language) {
          setActiveTab('English');
        }
        // Remove results for deselected language
        setLanguageResults(prevResults => {
          const newResults = { ...prevResults };
          delete newResults[language];
          return newResults;
        });
        return newLanguages;
      } else {
        return [...prev, language];
      }
    });
  };

  const removeLanguageTab = (language: string) => {
    // Clean up save status when removing language
    setSaveStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[language];
      return newStatus;
    });
    handleLanguageToggle(language);
  };

  const handleFileChange = (selectedFile: File) => {
    if (!isValidFileType(selectedFile)) {
      setError('Unsupported file type. Please upload a valid image (jpg, jpeg, png, heic, heif, webp, gif, bmp, tiff).');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setLanguageResults({});
    setCommonData({ 
      object_category: '', 
      tags: [], 
      object_name_en_base: '',
      existing_object_category: '',
      existing_tags: [],
      existing_object_name_en_base: ''
    });
    setIsDatabaseView({});
    setHasExistingData({});
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
    if (droppedFile) handleFileChange(droppedFile);
  };

  const generateImageHash = async (dataUrl: string): Promise<string> => {
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(dataUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDatabaseViewToggle = () => {
    const currentTab = activeTab;
    setIsDatabaseView(prev => ({
      ...prev,
      [currentTab]: !prev[currentTab]
    }));
  };

  const handleEditClick = async () => {
    const currentTab = activeTab;
    
    if (isEditing[currentTab]) {
      // Toggle back to view mode and discard changes for current tab
      if (currentTab === 'English') {
        setCommonData(originalCommonData);
      }
      setLanguageResults(prev => ({
        ...prev,
        [currentTab]: originalResults[currentTab] || prev[currentTab]
      }));
      setIsEditing(prev => ({ ...prev, [currentTab]: false }));
      return;
    }
  
    // Switch to edit mode for current tab only
    setIsEditing(prev => ({ ...prev, [currentTab]: true }));
    if (previewUrl && !imageHash) {
      const hash = await generateImageHash(previewUrl);
      setImageHash(hash);
    }
  };

  const handleQuickSave = async () => {
    const currentTab = activeTab;
    if (!file || !languageResults[currentTab]) return;
  
    setIsSaving(true);
    setSaveMessage(null);
  
    try {
      // Prepare data for current tab only
      let commonAttributes = {};
      let languageAttributes = [];

      if (currentTab === 'English') {
        // Save common data and English data
        commonAttributes = {
          object_name_en: commonData.object_name_en_base || '',
          object_category: commonData.object_category || '',
          tags: commonData.tags || [],
          userid: 'system',
        };
        
        languageAttributes = [{
          language: 'English',
          object_name: languageResults[currentTab].object_name || '',
          object_description: languageResults[currentTab].object_description || '',
          object_hint: languageResults[currentTab].object_hint || '',
        }];
      } else {
        // Save only current language data (no common data changes)
        commonAttributes = {
          object_name_en: originalCommonData.object_name_en_base || '',
          object_category: originalCommonData.object_category || '',
          tags: originalCommonData.tags || [],
          userid: 'system',
        };
        
        languageAttributes = [{
          language: currentTab,
          object_name: languageResults[currentTab].object_name || '',
          object_description: languageResults[currentTab].object_description || '',
          object_hint: languageResults[currentTab].object_hint || '',
        }];
      }
  
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('common_attributes', JSON.stringify(commonAttributes));
      formData.append('language_attributes', JSON.stringify(languageAttributes));
  
      const response = await fetch(`${API_URL}update-object`, {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) throw new Error('Failed to save to database');
  
      await response.json();
      
      // Update original data for current tab only
      if (currentTab === 'English') {
        setOriginalCommonData(commonData);
      }
      setOriginalResults(prev => ({
        ...prev,
        [currentTab]: { ...languageResults[currentTab] }
      }));
      
      // Mark current tab as saved and exit edit mode
      setSaveStatus(prev => ({ ...prev, [currentTab]: 'saved' }));
      setIsEditing(prev => ({ ...prev, [currentTab]: false }));
      setSaveMessage(`${currentTab} data saved successfully!`);
      
    } catch (err) {
      setSaveMessage(`Error saving ${currentTab}: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const isValidFileType = (file: File) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/heic', 'image/heif',
      'image/webp', 'image/gif', 'image/bmp', 'image/tiff'
    ];
    return validTypes.includes(file.type);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleIdentify = async () => {
    setSaveMessage(null);
    if (!file) {
      setError('Please upload an image first.');
      return;
    }
  
    if (selectedLanguages.length === 0) {
      setError('Please select at least one language.');
      return;
    }
  
    setIsLoading(true);
    setError(null);
    setLanguageResults({});
    setCommonData({ object_category: '', tags: [], object_name_en_base: '' });
  
    try {
      // Initialize loading states
      const initialResults: { [key: string]: LanguageResult } = {};
      ['English', ...selectedLanguages].forEach(lang => {
        initialResults[lang] = {
          object_name: '',
          object_description: '',
          object_hint: '',
          isLoading: true
        };
      });
      setLanguageResults(initialResults);
  
      // First call: English
      const englishFormData = new FormData();
      englishFormData.append('image', file);
      englishFormData.append('language', 'English');
  
      const englishResponse = await fetch(`${API_URL}identify-object`, {
        method: 'POST',
        body: englishFormData,
        headers: { 'Accept': 'application/json' },
      });
  
      const englishData = await englishResponse.json();
      if (!englishResponse.ok) throw new Error(`English API Error: ${englishData.detail || englishResponse.statusText}`);
  
      // Update common data and English results
      setCommonData({
        object_name_en_base: englishData.object_name_en || '',
        object_category: englishData.object_category || '',
        tags: englishData.tags || [],
        // Store existing data from backend
        existing_object_category: englishData.existing_object_category || '',
        existing_tags: englishData.existing_object_tags || [],
        existing_object_name_en_base: englishData.existing_object_name_en || '',
      });

      // Check if English has existing data
      const hasEnglishExistingData = !!(
        englishData.existing_object_name_en || 
        englishData.existing_object_name || 
        englishData.existing_object_description || 
        englishData.existing_object_hint
      );

      setLanguageResults(prev => ({
        ...prev,
        'English': {
          object_name: englishData.object_name_translated || '',
          object_description: englishData.object_description || '',
          object_hint: englishData.object_hint || '',
          isLoading: false,
          // Store existing data
          existing_object_name: englishData.existing_object_name || '',
          existing_object_description: englishData.existing_object_description || '',
          existing_object_hint: englishData.existing_object_hint || '',
        }
      }));

      // Set existing data status
      setHasExistingData(prev => ({
        ...prev,
        'English': hasEnglishExistingData
      }));
  
      // Parallel calls for selected languages
      const languagePromises = selectedLanguages.map(async (language) => {
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('language', language);
  
          const response = await fetch(`${API_URL}identify-object`, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' },
          });
  
          const data = await response.json();
          if (!response.ok) throw new Error(`${language} API Error: ${data.detail || response.statusText}`);
  
          return {
            language,
            result: {
              object_name: data.object_name_translated || '',
              object_description: data.object_description || '',
              object_hint: data.object_hint || '',
              isLoading: false,
              // Store existing data from backend
              existing_object_name: data.existing_object_name || '',
              existing_object_description: data.existing_object_description || '',
              existing_object_hint: data.existing_object_hint || '',
            }
          };
        } catch (err) {
          return {
            language,
            result: {
              object_name: '',
              object_description: '',
              object_hint: '',
              isLoading: false,
              error: (err as Error).message
            }
          };
        }
      });
  
      const languageResults = await Promise.all(languagePromises);
      
      // Update results for all languages
      setLanguageResults(prev => {
        const updated = { ...prev };
        languageResults.forEach(({ language, result }) => {
          updated[language] = result;
        });
        return updated;
      });

      // Check existing data status for each language
      const existingDataStatus: { [key: string]: boolean } = {
        'English': hasEnglishExistingData
      };
      
      languageResults.forEach(({ language, result }) => {
        const hasExistingData = !!(
          result.existing_object_name || 
          result.existing_object_description || 
          result.existing_object_hint
        );
        existingDataStatus[language] = hasExistingData;
      });
      
      setHasExistingData(existingDataStatus);
  
      // Store original results and mark all as unsaved initially
      const finalResults: { [key: string]: LanguageResult } = {
        'English': {
          object_name: englishData.object_name_translated || '',
          object_description: englishData.object_description || '',
          object_hint: englishData.object_hint || '',
          existing_object_name: englishData.existing_object_name || '',
          existing_object_description: englishData.existing_object_description || '',
          existing_object_hint: englishData.existing_object_hint || '',
        }
      };
      
      const initialSaveStatus: { [key: string]: 'unsaved' | 'saved' } = {
        'English': 'unsaved'
      };
      
      languageResults.forEach(({ language, result }) => {
        finalResults[language] = {
          object_name: result.object_name,
          object_description: result.object_description,
          object_hint: result.object_hint,
          existing_object_name: result.existing_object_name || '',
          existing_object_description: result.existing_object_description || '',
          existing_object_hint: result.existing_object_hint || '',
        };
        initialSaveStatus[language] = 'unsaved';
      });
      
      setOriginalResults(finalResults);
      setSaveStatus(initialSaveStatus);
      setOriginalCommonData({
        object_name_en_base: englishData.object_name_en || '',
        object_category: englishData.object_category || '',
        tags: englishData.tags || [],
        existing_object_category: englishData.existing_object_category || '',
        existing_tags: englishData.existing_object_tags || [],
        existing_object_name_en_base: englishData.existing_object_name_en || '',
      });
  
    } catch (err) {
      setError(`Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLanguageResult = (language: string, field: keyof LanguageResult, value: string) => {
    setLanguageResults(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        [field]: value
      }
    }));
    // Mark as unsaved when edited
    setSaveStatus(prev => ({ ...prev, [language]: 'unsaved' }));
  };

  const updateCommonData = (field: keyof typeof commonData, value: any) => {
    setCommonData(prev => ({
      ...prev,
      [field]: value
    }));
    // Mark English tab as unsaved when common data is edited
    setSaveStatus(prev => ({ ...prev, 'English': 'unsaved' }));
  };

  const availableTabs = ['English', ...selectedLanguages];
  const currentResult = languageResults[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFFFF] via-[#E6F7FC] to-[#FDE6E0] text-gray-900 font-sans antialiased">
      <header className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="p-2 rounded-lg bg-gradient-to-r from-[#E6F7FC] to-[#FDE6E0] shadow-md">
          <img src="/AlphaTub_logo.jpeg" alt="alphaTUB - TUBShots with AI" className="h-16 sm:h-20 object-contain" />
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* LEFT PANEL: Image Upload + Category + Tags */}
          <div className="col-span-1 flex flex-col items-center bg-gradient-to-br from-[#FFFFFF] via-[#E6F7FC] to-[#FDE6E0] p-6 rounded-xl shadow-md">
            <div
              className="border-2 border-dashed border-teal-500 p-6 text-center bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors duration-300 w-full"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <p className="text-4xl font-extrabold tracking-wide text-[#00AEEF]">
                Take <span className="text-[#F15A29]">TUB</span><span className="text-[#00AEEF]"> Shot</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">Drag and drop an image or click to upload</p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.gif,.bmp,.tiff,.tif"
                className="hidden"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              />
            </div>
            
            {previewUrl && (
              <img src={previewUrl} alt="Uploaded" className="mt-4 max-w-[800px] w-full h-auto object-contain rounded-lg animate-fade-in" />
            )}
            {!previewUrl && <p className="mt-4 text-gray-400">No image uploaded</p>}
            
            {/* Object Category and Tags - Only show if English tab is active or if data exists */}
            {Object.keys(languageResults).length > 0 && (
              <div className="w-full mt-4 space-y-4 bg-gray-800 rounded-xl p-4 shadow-inner">
                <div>
                  <label className="block text-teal-400 font-semibold mb-1">Object Category:</label>
                  {isEditing['English'] && activeTab === 'English' && !isDatabaseView['English']? (
                    <input
                      type="text"
                      value={commonData.object_category || ''}
                      onChange={(e) => updateCommonData('object_category', e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-600 bg-gray-900 text-white"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-300">
                        {isDatabaseView['English'] && activeTab === 'English' 
                          ? (commonData.existing_object_category || '-')
                          : (commonData.object_category || '-')
                        }
                      </p>
                      {activeTab !== 'English' && (
                        <span className="text-xs text-gray-500">(Editable in English tab only)</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-teal-400 font-semibold mb-1">Tags:</label>
                  {isEditing['English'] && activeTab === 'English' && !isDatabaseView['English']? (
                    <input
                      type="text"
                      value={commonData.tags ? commonData.tags.join(', ') : ''}
                      onChange={(e) => updateCommonData('tags', e.target.value.split(',').map(tag => tag.trim()))}
                      className="w-full p-2 rounded-lg border border-gray-600 bg-gray-900 text-white"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-300">
                        {isDatabaseView['English'] && activeTab === 'English' 
                          ? (commonData.existing_tags?.join(', ') || '-')
                          : (commonData.tags?.join(', ') || '-')
                        }
                      </p>
                      {activeTab !== 'English' && (
                        <span className="text-xs text-gray-500">(Editable in English tab only)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Multi-Language Selection + Tabbed Results */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-6 p-6 rounded-xl shadow-md bg-gradient-to-br from-[#FFFFFF] via-[#E6F7FC] to-[#FDE6E0]">
            
            {/* Language Multi-Select and Identify Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Multi-Select Dropdown */}
              <div className="relative w-full sm:w-80">
                <button
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                  className="w-full p-2 border border-gray-700 bg-gray-900 text-gray-100 rounded-lg flex items-center justify-between focus:ring-2 focus:ring-teal-500"
                >
                  <span className="truncate">
                    {selectedLanguages.length === 0 
                      ? 'Select Languages' 
                      : `${selectedLanguages.length} language${selectedLanguages.length > 1 ? 's' : ''} selected`
                    }
                  </span>
                  <ChevronDownIcon className={`w-5 h-5 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isLanguageDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {languageOptions.map((language) => (
                      <label
                        key={language}
                        className="flex items-center px-3 py-2 hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLanguages.includes(language)}
                          onChange={() => handleLanguageToggle(language)}
                          className="mr-3 rounded border-gray-600 bg-gray-700 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-gray-100">{language}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Languages Badges */}
              {selectedLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  {selectedLanguages.map((language) => (
                    <span
                      key={language}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800"
                    >
                      {language}
                      <button
                        onClick={() => removeLanguageTab(language)}
                        className="ml-1 hover:text-teal-600"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleIdentify}
                disabled={isLoading}
                className={`bg-gradient-to-r from-[#E6F7FC] via-[#00AEEF] to-[#C8E6F9] text-[#003B57] p-3 rounded-lg font-semibold tracking-wide shadow-md whitespace-nowrap ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]'}`}
              >
                {isLoading ? 'Analyzing...' : 'Identify Image'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-[#FDE6E0] to-[#F8B4A0] border-l-4 border-red-500 shadow-md">
                <p className="font-bold text-red-600">{error}</p>
              </div>
            )}

            {/* Language Tabs */}
            {availableTabs.length > 0 && Object.keys(languageResults).length > 0 && (
              <div className="flex flex-col">
                {/* Tab Headers */}
                <div className="flex border-b border-gray-300 overflow-x-auto">
                  {availableTabs.map((language) => (
                    <button
                      key={language}
                      onClick={() => setActiveTab(language)}
                      className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === language
                          ? 'border-[#00AEEF] text-[#00AEEF] bg-blue-50'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{language}</span>
                        
                        {/* Save Status Indicator */}
                        {saveStatus[language] === 'saved' && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Saved"></div>
                        )}
                        {saveStatus[language] === 'unsaved' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full" title="Not saved"></div>
                        )}
                        
                        {languageResults[language]?.isLoading && (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#00AEEF] rounded-full animate-spin"></div>
                        )}
                        {language !== 'English' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeLanguageTab(language);
                            }}
                            className="hover:text-red-500"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {currentResult && (
                    <div className="relative p-6 bg-gray-800 rounded-xl shadow-inner animate-fade-in space-y-4">
                      
                      {/* Action Icons */}
                      <div className="absolute top-2 right-2 flex space-x-3">
                        {/* Database View Toggle - Only show if existing data is available */}
                        {hasExistingData[activeTab] && (
                          <button
                            onClick={handleDatabaseViewToggle}
                            className={`transition ${isDatabaseView[activeTab] ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'}`}
                            title={isDatabaseView[activeTab] ? 'Show Latest Data' : 'Show Database Data'}
                          >
                            <ServerIcon className="w-6 h-6" />
                          </button>
                        )}
                        
                        <button
                          onClick={handleEditClick}
                          disabled={isDatabaseView[activeTab]}
                          className={`transition ${isDatabaseView[activeTab] ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:text-[#00AEEF] text-gray-300'}`}
                          title={isDatabaseView[activeTab] ? 'Disabled in Database View' : (isEditing[activeTab] ? 'Switch to View Mode' : 'Switch to Edit Mode')}
                        >
                          {isEditing[activeTab] ? (
                            <EyeIcon className="w-6 h-6" />
                          ) : (
                            <PencilSquareIcon className="w-6 h-6" />
                          )}
                        </button>
                        <button
                          onClick={handleQuickSave}
                          disabled={isSaving || isDatabaseView[activeTab]}
                          className={`transition ${isDatabaseView[activeTab] ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:text-green-400 text-gray-300'} disabled:opacity-50`}
                          title={isDatabaseView[activeTab] ? 'Disabled in Database View' : `Save ${activeTab} to Database`}
                        >
                          {isSaving ? (
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-green-400 rounded-full animate-spin"></div>
                          ) : (
                            <ArrowDownOnSquareIcon className="w-6 h-6" />
                          )}
                        </button>
                      </div>

                      {/* Loading State */}
                      {currentResult.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 border-2 border-gray-400 border-t-[#00AEEF] rounded-full animate-spin"></div>
                            <span className="text-gray-300">Loading {activeTab} translation...</span>
                          </div>
                        </div>
                      ) : currentResult.error ? (
                        <div className="p-4 bg-red-900/50 text-red-200 rounded-lg">
                          <p><strong>Error:</strong> {currentResult.error}</p>
                        </div>
                      ) : (
                        <>
                          {/* Language-specific fields */}
                          {[
                            { label: `${activeTab} Object Name`, key: 'object_name', existingKey: 'existing_object_name' },
                            { label: `${activeTab} Description`, key: 'object_description', existingKey: 'existing_object_description', textarea: true },
                            { label: `${activeTab} Hint`, key: 'object_hint', existingKey: 'existing_object_hint', textarea: true }
                          ].map(({ label, key, existingKey, textarea }) => (
                            <div key={key}>
                              <label className="block text-teal-400 font-semibold mb-1">
                                {label}:
                                {isDatabaseView[activeTab] && (
                                  <span className="text-xs text-blue-400 ml-2">(Database View)</span>
                                )}
                              </label>
                              {isEditing[activeTab] && !isDatabaseView[activeTab] ? (
                                textarea ? (
                                  <textarea
                                    rows={3}
                                    value={currentResult[key as keyof LanguageResult] as string || ''}
                                    onChange={(e) => updateLanguageResult(activeTab, key as keyof LanguageResult, e.target.value)}
                                    className="w-full p-2 rounded-lg border border-gray-600 bg-gray-900 text-white"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={currentResult[key as keyof LanguageResult] as string || ''}
                                    onChange={(e) => updateLanguageResult(activeTab, key as keyof LanguageResult, e.target.value)}
                                    className="w-full p-2 rounded-lg border border-gray-600 bg-gray-900 text-white"
                                  />
                                )
                              ) : (
                                <p className="text-gray-200">
                                  {isDatabaseView[activeTab] 
                                    ? (currentResult[existingKey as keyof LanguageResult] as string || '-')
                                    : (currentResult[key as keyof LanguageResult] as string || '-')
                                  }
                                </p>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {saveMessage && (
                        <p className={`mt-2 text-sm ${saveMessage.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
                          {saveMessage}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {!currentResult && (
                    <p className="text-gray-500 italic text-center py-8">
                      Click <span className="font-semibold text-[#00AEEF]">'Identify Image'</span> to see results.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);