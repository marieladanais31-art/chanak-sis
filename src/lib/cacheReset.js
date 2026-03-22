
export const resetSupabaseCache = () => {
  console.log('🔄 [CacheReset] Clearing Supabase cache keys from storage...');
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('cache') || key.includes('family_portal'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('cache'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
    
    console.log(`🔄 [CacheReset] Cleared ${keysToRemove.length} local keys and ${sessionKeysToRemove.length} session keys.`);
  } catch (err) {
    console.warn('⚠️ [CacheReset] Error clearing cache:', err);
  }
};

export const ignoreConnectionErrors = (err) => {
  const msg = err?.message || err?.toString() || '';
  if (msg.includes('Connection Termination') || msg.includes('Failed to fetch') || msg.includes('network')) {
    console.warn(`⚠️ [CacheReset] Suppressing transient connection error: ${msg}`);
    return true;
  }
  return false;
};

export const forceCleanRead = async (queryFn, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 [CacheReset] Executing clean read, attempt ${attempt}/${maxRetries}...`);
      const result = await queryFn();
      
      if (result.error) {
        throw result.error;
      }
      
      return result;
    } catch (err) {
      lastError = err;
      console.error(`❌ [CacheReset] Read failed on attempt ${attempt}:`, err);
      
      if (ignoreConnectionErrors(err) && attempt < maxRetries) {
        const delay = attempt * 1000;
        console.log(`⏳ [CacheReset] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw err;
    }
  }
  throw lastError;
};
