
export const EXISTING_PROFILES = {
  ELIAS_PARENT: '1941d550-2a1a-434c-83c8-83b65ac505d8',
  DANIEL_STUDENT: 'a1b2c3d4-e5f6-4789-8012-3456789abcde', // Example ID, replace with actual if needed
  ANAIS_STUDENT: 'b2c3d4e5-f6a7-5890-9123-456789abcdef'   // Example ID, replace with actual if needed
};

export const verifyProfileId = (id) => {
  return Object.values(EXISTING_PROFILES).includes(id);
};

export const getProfileById = (id) => {
  const profileKey = Object.keys(EXISTING_PROFILES).find(
    key => EXISTING_PROFILES[key] === id
  );
  return profileKey ? { key: profileKey, id } : null;
};
