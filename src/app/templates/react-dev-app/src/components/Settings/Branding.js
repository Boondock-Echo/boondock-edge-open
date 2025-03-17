import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader, Sun, Moon, Palette, Type, Globe } from 'lucide-react';
import { toast } from 'react-toastify';
import ThemeSelector from './ThemeSelector'; // Import the new component

const Branding = ({ edgeServerEndpoint, isDarkMode }) => {
  const [organization_name, setorganization_name] = useState('');
  const [brandAssets, setBrandAssets] = useState({
    logo: null,
    favicon: null,
    loader: null
  });
  const [previews, setPreviews] = useState({
    logo: null,
    favicon: null,
    loader: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brand_colors, setbrand_colors] = useState({
    primary: '#2563eb',
    secondary: '#4f46e5',
    accent: '#ec4899'
  });
  const [tagline, setTagline] = useState('');
  const [fontFamily, setFontFamily] = useState('inter');

  const fontOptions = [
    { value: 'inter', label: 'Inter' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'poppins', label: 'Poppins' },
    { value: 'opensans', label: 'Open Sans' }
  ];

  useEffect(() => {
    const fetchBrandingData = async () => {
      try {
        const response = await fetch(`${edgeServerEndpoint}/branding`);
        if (!response.ok) throw new Error('Failed to fetch branding data');
        
        const data = await response.json();
        setorganization_name(data.organization_name || '');
        setTagline(data.tagline || '');
        setbrand_colors(data.brand_colors || brand_colors);
        setFontFamily(data.font || 'inter');
        
        if (data.assets) {
          setPreviews({
            logo: data.assets.logo ? `data:image/png;base64,${data.assets.logo}` : null,
            favicon: data.assets.favicon ? `data:image/png;base64,${data.assets.favicon}` : null,
            loader: data.assets.loader ? `data:image/png;base64,${data.assets.loader}` : null
          });
          setBrandAssets(data.assets);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load branding settings",
          variant: "destructive"
        });
      }
    };

    fetchBrandingData();
  }, [edgeServerEndpoint]);

  const validateFileSize = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) throw new Error('File size exceeds 5MB limit');
  };

  const validateFileType = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type');
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFileType(file);
      validateFileSize(file);

      setIsUploading(true);
      
      const previewUrl = URL.createObjectURL(file);
      setPreviews(prev => ({ ...prev, [type]: previewUrl }));

      const base64 = await convertFileToBase64(file);
      setBrandAssets(prev => ({ ...prev, [type]: base64 }));
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || `Failed to upload ${type}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${edgeServerEndpoint}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name,
          tagline,
          brand_colors,
          font: fontFamily,
          assets: brandAssets
        })
      });

      if (!response.ok) throw new Error('Failed to update branding');
      toast({
        title: "Success",
        description: "Branding settings updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save branding settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle theme selection
  const handleThemeSelect = (theme) => {
    setbrand_colors(theme.brand_colors);
    setFontFamily(theme.font);
  };

  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Branding Settings</h2>
        <p className="text-sm opacity-75">Customize your organization's brand identity</p>
      </div>

      {/* Organization Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Organization Name</label>
          <input
            type="text"
            value={organization_name}
            onChange={(e) => setorganization_name(e.target.value)}
            className={`w-full px-4 py-2 rounded-md border ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Enter organization name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={`w-full px-4 py-2 rounded-md border ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Enter company tagline"
          />
        </div>
      </div>

      {/* Theme Selector */}
      <ThemeSelector onThemeSelect={handleThemeSelect} isDarkMode={isDarkMode} />

      {/* Brand Colors */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Brand Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={brand_colors.primary}
                onChange={(e) => setbrand_colors({ ...brand_colors, primary: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={brand_colors.primary}
                onChange={(e) => setbrand_colors({ ...brand_colors, primary: e.target.value })}
                className={`w-full px-4 py-2 rounded-md border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Secondary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={brand_colors.secondary}
                onChange={(e) => setbrand_colors({ ...brand_colors, secondary: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={brand_colors.secondary}
                onChange={(e) => setbrand_colors({ ...brand_colors, secondary: e.target.value })}
                className={`w-full px-4 py-2 rounded-md border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Accent Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={brand_colors.accent}
                onChange={(e) => setbrand_colors({ ...brand_colors, accent: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={brand_colors.accent}
                onChange={(e) => setbrand_colors({ ...brand_colors, accent: e.target.value })}
                className={`w-full px-4 py-2 rounded-md border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Type className="w-5 h-5 mr-2" />
          Typography
        </h3>
        <div>
          <label className="block text-sm font-medium mb-2">Brand Font</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className={`w-full px-4 py-2 rounded-md border ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {fontOptions.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Upload Section */}
     <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Brand Assets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Logo upload section remains unchanged */}
          <div>
            <label className="block text-sm font-medium mb-2">Organization Logo</label>
            <div className={`w-full h-32 rounded-lg border-2 border-dashed mb-2 flex items-center justify-center ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {previews.logo ? (
                <img src={previews.logo} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 opacity-50" />
              )}
            </div>
            <label className={`inline-flex items-center px-4 py-2 rounded-md cursor-pointer ${
              isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Logo
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logo')}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Modified favicon upload section */}
          <div>
            <label className="block text-sm font-medium mb-2">Favicon</label>
            <div className={`w-full h-32 rounded-lg border-2 border-dashed mb-2 flex items-center justify-center ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {previews.favicon ? (
                <img src={previews.favicon} alt="Favicon preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 opacity-50" />
              )}
            </div>
            <label className={`inline-flex items-center px-4 py-2 rounded-md cursor-pointer ${
              isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Favicon
              <input
                type="file"
                className="hidden"
                accept="image/*,.ico"
                onChange={(e) => handleFileUpload(e, 'favicon')}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Loader upload section remains unchanged */}
          <div>
            <label className="block text-sm font-medium mb-2">Custom Loader</label>
            <div className={`w-full h-32 rounded-lg border-2 border-dashed mb-2 flex items-center justify-center ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              {previews.loader ? (
                <img src={previews.loader} alt="Loader preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <Loader className="w-8 h-8 opacity-50" />
              )}
            </div>
            <label className={`inline-flex items-center px-4 py-2 rounded-md cursor-pointer ${
              isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Loader
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'loader')}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Theme Display */}
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-sm font-medium">Current Theme:</span>
        {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        <span className="text-sm">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
      </div>

      {/* Save Button */}
      <button
        className={`w-full py-2 px-4 rounded-md ${
          isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white font-medium flex items-center justify-center`}
        onClick={handleSave}
        disabled={isUploading || isSaving}
      >
        {isSaving ? (
          <>
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Saving Changes...
          </>
        ) : (
          'Save Changes'
        )}
      </button>

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} flex items-center space-x-3`}>
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branding;