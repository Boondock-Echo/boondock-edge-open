import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ChevronRight, Satellite, Lock, User, Sun, Moon, Info } from 'lucide-react';

const VERSION = process.env.REACT_APP_VERSION || 'v1.3.6';
const BUILD_DATE = process.env.REACT_APP_BUILD_DATE || 'FEB 24, 2025';

const LoginPage = ({ isDarkMode, toggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState({});
  const navigate = useNavigate();
  const { login } = useAuth();
  const [edgeServerEndpoint] = useState(process.env.REACT_APP_EDGE_SERVER_ENDPOINT);
  const [internetSpeed, setInternetSpeed] = useState(null);
  const [speedTestError, setSpeedTestError] = useState('');
  const [isSpeedLoading, setIsSpeedLoading] = useState(false);
  const speedTestInterval = useRef(null);
  const isTesting = useRef(false);

  const [branding, setBranding] = useState({
    organizationName: 'Boondock Edge',
    tagline: 'Justice in Motion',
    brandColors: { accent: '#ff2424', primary: '#0a58ff', secondary: '#b15990' },
    font: 'Poppins',
    assets: { logo: null, favicon: null, loader: null }
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  useEffect(() => {
    const fetchBrandingData = async () => {
      try {
        const response = await fetch(`${edgeServerEndpoint}/branding`);
        if (!response.ok) throw new Error('Failed to fetch branding data');
        const data = await response.json();
        setBranding({
          organizationName: data.organization_name || 'Boondock Edge',
          tagline: data.tagline || 'Justice in Motion',
          brandColors: {
            accent: data.brand_colors?.accent || '#ff2424',
            primary: data.brand_colors?.primary || '#0a58ff',
            secondary: data.brand_colors?.secondary || '#b15990'
          },
          font: data.font || 'Poppins',
          assets: {
            logo: data.assets?.logo ? `data:image/jpeg;base64,${data.assets.logo}` : null,
            favicon: data.assets?.favicon ? `data:image/x-icon;base64,${data.assets.favicon}` : null,
            loader: data.assets?.loader ? `data:image/gif;base64,${data.assets.loader}` : null
          }
        });
      } catch (error) {
        console.error('Error fetching branding data:', error);
      } finally {
        setBrandingLoaded(true);
      }
    };
    fetchBrandingData();
  }, [edgeServerEndpoint]);

  useEffect(() => {
    if (brandingLoaded && branding.assets.favicon) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.assets.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [brandingLoaded, branding.assets.favicon]);

  const measureInternetSpeed = async () => {
    if (isTesting.current) return;
    isTesting.current = true;
    try {
      setIsSpeedLoading(true);
      setSpeedTestError('');
      const testFileUrl = 'https://source.unsplash.com/random/500x500';
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(testFileUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      const blob = await response.blob();
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const bitsLoaded = blob.size * 8;
      const speedMbps = (bitsLoaded / duration / 1024 / 1024).toFixed(1);
      setInternetSpeed(speedMbps);
    } catch (err) {
      setSpeedTestError(err.name === 'AbortError' ? 'Test timed out' : 'No Internet');
    } finally {
      setIsSpeedLoading(false);
      isTesting.current = false;
    }
  };

  useEffect(() => {
    if (brandingLoaded) {
      measureInternetSpeed();
      speedTestInterval.current = setInterval(measureInternetSpeed, 5000);
      return () => clearInterval(speedTestInterval.current);
    }
  }, [brandingLoaded]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${edgeServerEndpoint}/users`);
        if (!response.ok) throw new Error('Failed to fetch user credentials');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Unable to load credentials.');
      }
    };
    if (brandingLoaded) fetchUsers();
  }, [edgeServerEndpoint, brandingLoaded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const user = users[username];
      if (user && user.password === password) {
        const token = btoa(`${username}:${Date.now()}`);
        login({ username, token, name: user.name || username });
        navigate('/');
      } else {
        setError('Invalid Credentials');
      }
      setIsLoading(false);
    }, 1000);
  };

  if (!brandingLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: branding.brandColors.primary }}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col md:flex-row transition-colors duration-500 overflow-hidden`}
      style={{ fontFamily: `${branding.font}, sans-serif` }}
    >
      {/* Left Creative Panel */}
      <div
        className={`w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-12 relative ${
          isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-blue-100'
        }`}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="w-72 h-72 bg-gradient-to-r from-transparent to-white/10 rounded-full absolute -top-36 -left-36 animate-orbit"
            style={{ border: `1px solid ${branding.brandColors.accent}30` }}
          />
          <div
            className="w-56 h-56 bg-gradient-to-r from-transparent to-white/05 rounded-full absolute bottom-0 right-0 animate-orbit-reverse"
            style={{ border: `1px solid ${branding.brandColors.secondary}30` }}
          />
        </div>
        <div className="relative z-10 text-center space-y-4">
          {branding.assets.logo ? (
            <img
              src={branding.assets.logo}
              alt={`${branding.organizationName} Logo`}
              className="w-48 h-64 md:w-64 md:h-64 object-contain mx-auto animate-glow"
            />
          ) : (
            <Satellite
              className="w-24 h-24 md:w-32 md:h-32 mx-auto animate-glow"
              style={{ color: branding.brandColors.accent }}
            />
          )}
          {/* <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight"
            style={{ color: isDarkMode ? '#ffffff' : branding.brandColors.primary }}
          >
            {branding.organizationName}
          </h1>
          <p
            className="text-base md:text-lg text-opacity-80 animate-fade-in"
            style={{ color: isDarkMode ? `${branding.brandColors.secondary}cc` : branding.brandColors.secondary }}
          >
            {branding.tagline}
          </p> */}
        </div>
      </div>

      {/* Right Login Panel */}
      <div
        className={`w-full md:w-1/2 flex items-center justify-center ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div
          className={`w-full h-full flex flex-col justify-center rounded-none md:rounded-l-xl shadow-lg backdrop-blur-lg p-6 md:p-12 transition-all duration-300 ${
            isDarkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/90 border-gray-200'
          }`}
        >
          <h2
            className="text-xl md:text-2xl font-semibold text-center mb-6 md:mb-8"
            style={{ color: isDarkMode ? branding.brandColors.accent : branding.brandColors.primary }}
          >
            Welcome Back
          </h2>

          {error && (
            <div
              className="mb-4 md:mb-6 p-3 rounded-lg flex items-center space-x-2 animate-fade-in mx-auto max-w-md"
              style={{
                backgroundColor: `${branding.brandColors.accent}20`,
                color: branding.brandColors.accent
              }}
            >
              <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 max-w-md mx-auto w-full">
            <InputField
              icon={<User />}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="User ID"
              isDarkMode={isDarkMode}
              brandColors={branding.brandColors}
            />
            <InputField
              icon={<Lock />}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              isDarkMode={isDarkMode}
              brandColors={branding.brandColors}
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-medium text-white transition-all duration-300 relative overflow-hidden group ${
                isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1'
              }`}
              style={{
                background: `linear-gradient(135deg, ${branding.brandColors.primary}, ${branding.brandColors.secondary})`
              }}
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                {isLoading ? (
                  branding.assets.loader ? (
                    <img src={branding.assets.loader} alt="Loading" className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-shine" />
            </button>
          </form>

          <div className="mt-5 md:mt-8 flex flex-col md:flex-row items-center justify-between text-xs text-opacity-80 max-w-md mx-auto w-full">
            <div className="flex items-center space-x-2 mb-2 md:mb-0">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  internetSpeed > 50 ? 'bg-green-500' : internetSpeed > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
              <span style={{ color: isDarkMode ? '#ffffff' : branding.brandColors.secondary }}>
                {isSpeedLoading ? (
                  <div
                    className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: branding.brandColors.primary }}
                  />
                ) : speedTestError ? (
                  speedTestError
                ) : (
                  `${internetSpeed || 'N/A'} Mbps`
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span style={{ color: isDarkMode ? '#ffffff' : branding.brandColors.secondary }}>
                {VERSION} | {BUILD_DATE}
              </span>
              <div className="group relative">
                <Info
                  className="w-4 h-4 cursor-help"
                  style={{ color: isDarkMode ? branding.brandColors.accent : branding.brandColors.primary }}
                />
                <div
                  className={`absolute -top-8 right-0 text-xs p-1 rounded-md shadow-md ${
                    isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-100'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                >
                  Updates every 5s
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ icon, type, value, onChange, placeholder, isDarkMode, brandColors }) => (
  <div className="relative group">
    <div
      className={`flex items-center rounded-lg border transition-all duration-300 ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700 focus-within:border-gray-600'
          : 'bg-gray-50 border-gray-300 focus-within:border-gray-400'
      }`}
    >
      <div
        className="pl-3"
        style={{ color: isDarkMode ? `${brandColors.secondary}cc` : brandColors.secondary }}
      >
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full py-2.5 px-3 bg-transparent focus:outline-none ${
          isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
        }`}
        style={{ caretColor: brandColors.accent }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, ${brandColors.primary}, ${brandColors.accent})` }}
      />
    </div>
  </div>
);

export default LoginPage;