
export const setCachedData = (key, data) => {
  try {
    const cacheObject = {
      data,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
    console.log(`💾 [Cache] Saved data for key: ${key}`);
  } catch (error) {
    console.warn('💾 [Cache] Error saving data to localStorage:', error);
  }
};

export const getCachedData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    console.log(`💾 [Cache] Retrieved data for key: ${key}`, parsed);
    return parsed.data;
  } catch (error) {
    console.warn('💾 [Cache] Error reading data from localStorage:', error);
    return null;
  }
};

export const clearCache = () => {
  try {
    localStorage.clear();
    console.log('💾 [Cache] Cleared all local cache');
  } catch (error) {
    console.warn('💾 [Cache] Error clearing cache:', error);
  }
};

export const clearSpecificCache = (key) => {
  try {
    localStorage.removeItem(key);
    console.log(`💾 [Cache] Cleared cache for key: ${key}`);
  } catch (error) {
    console.warn(`💾 [Cache] Error clearing cache for key ${key}:`, error);
  }
};
