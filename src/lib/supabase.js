/**
 * SUPABASE INTEGRATION
 * 
 * Updated for Production: Removed localhost references.
 * This file maintains the local mock storage for immediate UI testing 
 * while providing the structure for production migration.
 */

const STORAGE_KEYS = {
  USERS: 'chanak_users',
  STUDENTS: 'chanak_students',
  TUTORS: 'chanak_tutors',
  PARENTS: 'chanak_parents',
  HUB_ASSIGNMENTS: 'chanak_hub_assignments',
  AUTH: 'chanak_auth',
  CONFIG: 'chanak_config',
  AUDIT_LOG: 'chanak_audit_log',
  PROGRESS_REPORTS: 'chanak_progress_reports',
  REPORT_LINES: 'chanak_report_lines',
  TRAITS: 'chanak_traits',
  TRANSFER_CREDITS: 'chanak_transfer_credits',
  GPA_SCALE: 'chanak_gpa_scale',
  HUBS: 'chanak_hubs',
  STUDENT_PARENTS: 'chanak_student_parents',
  STUDENT_TUTORS: 'chanak_student_tutors',
  STUDENT_HUBS: 'chanak_student_hubs',
  HUB_STAFF: 'chanak_hub_staff'
};

// Initialize default data
const initializeDefaultData = () => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  
  if (users.length === 0) {
    const defaultAdmin = {
      id: 'admin-001',
      email: 'admin@chanak.edu',
      password_hash: 'Admin123!', 
      name: 'Super Admin',
      role: 'admin',
      status: 'active',
      language_preference: 'en',
      created_at: new Date().toISOString()
    };
    users.push(defaultAdmin);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  // Initialize standard tables
  [
    STORAGE_KEYS.STUDENTS, STORAGE_KEYS.TUTORS, STORAGE_KEYS.PARENTS, 
    STORAGE_KEYS.HUB_ASSIGNMENTS, STORAGE_KEYS.AUDIT_LOG,
    STORAGE_KEYS.PROGRESS_REPORTS, STORAGE_KEYS.REPORT_LINES,
    STORAGE_KEYS.TRAITS, STORAGE_KEYS.TRANSFER_CREDITS,
    STORAGE_KEYS.HUBS, STORAGE_KEYS.STUDENT_PARENTS,
    STORAGE_KEYS.STUDENT_TUTORS, STORAGE_KEYS.STUDENT_HUBS,
    STORAGE_KEYS.HUB_STAFF
  ].forEach(key => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  });

  // Seed Hubs
  const hubs = JSON.parse(localStorage.getItem(STORAGE_KEYS.HUBS) || '[]');
  if (hubs.length === 0) {
    const defaultHubs = [
      { id: 'hub-001', name: 'Hub A', code: 'HUB-A', location: 'Main Campus', created_at: new Date().toISOString() },
      { id: 'hub-002', name: 'Hub B', code: 'HUB-B', location: 'Downtown Center', created_at: new Date().toISOString() }
    ];
    localStorage.setItem(STORAGE_KEYS.HUBS, JSON.stringify(defaultHubs));
  }

  // Initialize GPA Scale
  if (!localStorage.getItem(STORAGE_KEYS.GPA_SCALE)) {
    const scale = [
      { letter: 'A+', min: 97, max: 100, val: 4.0 },
      { letter: 'A', min: 93, max: 96, val: 4.0 },
      { letter: 'A-', min: 90, max: 92, val: 3.7 },
      { letter: 'B+', min: 87, max: 89, val: 3.3 },
      { letter: 'B', min: 83, max: 86, val: 3.0 },
      { letter: 'B-', min: 80, max: 82, val: 2.7 },
      { letter: 'C+', min: 77, max: 79, val: 2.3 },
      { letter: 'C', min: 73, max: 76, val: 2.0 },
      { letter: 'C-', min: 70, max: 72, val: 1.7 },
      { letter: 'D+', min: 67, max: 69, val: 1.3 },
      { letter: 'D', min: 63, max: 66, val: 1.0 },
      { letter: 'D-', min: 60, max: 62, val: 0.7 },
      { letter: 'F', min: 0, max: 59, val: 0.0 },
    ];
    localStorage.setItem(STORAGE_KEYS.GPA_SCALE, JSON.stringify(scale));
  }
};

export const auth = {
  signIn: async (email, password) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email && u.password_hash === password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const authData = {
      token: `token-${Date.now()}`,
      user_id: user.id,
      email: user.email,
      role: user.role,
      language: user.language_preference
    };
    
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authData));
    return { user, session: authData };
  },
  
  signOut: async () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  },
  
  getSession: () => {
    const authData = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!authData) return null;
    return JSON.parse(authData);
  },
  
  updatePassword: async (userId, newPassword) => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');
    users[userIndex].password_hash = newPassword;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
};

export const db = {
  users: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
    getById: async (id) => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]').find(u => u.id === id),
    create: async (data) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const newUser = { id: `user-${Date.now()}`, ...data, created_at: new Date().toISOString() };
      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      return newUser;
    },
    update: async (id, updates) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    },
    delete: async (id) => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.filter(u => u.id !== id)));
    }
  },
  students: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]'),
    getById: async (id) => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]').find(s => s.id === id),
    create: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
      const newItem = { id: `student-${Date.now()}`, ...data, created_at: new Date().toISOString() };
      list.push(newItem);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
      return newItem;
    }
  },
  hubs: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.HUBS) || '[]'),
    update: async (id, updates) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.HUBS) || '[]');
      const idx = list.findIndex(h => h.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(STORAGE_KEYS.HUBS, JSON.stringify(list));
      }
    }
  },
  hubStaff: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.HUB_STAFF) || '[]'),
    create: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.HUB_STAFF) || '[]');
      const newItem = { id: `hs-${Date.now()}`, ...data, assigned_at: new Date().toISOString() };
      list.push(newItem);
      localStorage.setItem(STORAGE_KEYS.HUB_STAFF, JSON.stringify(list));
      return newItem;
    },
    delete: async (id) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.HUB_STAFF) || '[]');
      localStorage.setItem(STORAGE_KEYS.HUB_STAFF, JSON.stringify(list.filter(x => x.id !== id)));
    }
  },
  studentParents: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_PARENTS) || '[]'),
    create: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_PARENTS) || '[]');
      const newItem = { id: `sp-${Date.now()}`, ...data, assigned_at: new Date().toISOString() };
      list.push(newItem);
      localStorage.setItem(STORAGE_KEYS.STUDENT_PARENTS, JSON.stringify(list));
      return newItem;
    },
    delete: async (id) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_PARENTS) || '[]');
      localStorage.setItem(STORAGE_KEYS.STUDENT_PARENTS, JSON.stringify(list.filter(x => x.id !== id)));
    }
  },
  studentTutors: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_TUTORS) || '[]'),
    create: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_TUTORS) || '[]');
      const newItem = { id: `st-${Date.now()}`, ...data, assigned_at: new Date().toISOString() };
      list.push(newItem);
      localStorage.setItem(STORAGE_KEYS.STUDENT_TUTORS, JSON.stringify(list));
      return newItem;
    },
    delete: async (id) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_TUTORS) || '[]');
      localStorage.setItem(STORAGE_KEYS.STUDENT_TUTORS, JSON.stringify(list.filter(x => x.id !== id)));
    }
  },
  studentHubs: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_HUBS) || '[]'),
    create: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_HUBS) || '[]');
      const filtered = list.filter(h => h.student_id !== data.student_id);
      const newItem = { id: `sh-${Date.now()}`, ...data, assigned_at: new Date().toISOString() };
      filtered.push(newItem);
      localStorage.setItem(STORAGE_KEYS.STUDENT_HUBS, JSON.stringify(filtered));
      return newItem;
    },
    delete: async (id) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENT_HUBS) || '[]');
      localStorage.setItem(STORAGE_KEYS.STUDENT_HUBS, JSON.stringify(list.filter(x => x.id !== id)));
    }
  },
  progressReports: {
    getByStudent: async (studentId) => {
      const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS_REPORTS) || '[]');
      return reports.filter(r => r.student_id === studentId);
    },
    upsert: async (data) => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS_REPORTS) || '[]');
      const idx = list.findIndex(r => r.student_id === data.student_id && r.quarter_number === data.quarter_number && r.academic_year === data.academic_year);
      let report;
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        report = list[idx];
      } else {
        report = { id: `report-${Date.now()}`, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        list.push(report);
      }
      localStorage.setItem(STORAGE_KEYS.PROGRESS_REPORTS, JSON.stringify(list));
      return report;
    }
  },
  reportLines: {
    getByReportId: async (reportId) => {
      const lines = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORT_LINES) || '[]');
      return lines.filter(l => l.report_id === reportId);
    },
    upsertBatch: async (lines) => {
      const allLines = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORT_LINES) || '[]');
      const newLines = allLines.filter(l => !lines.find(nl => nl.id === l.id && nl.id));
      lines.forEach(line => {
        if (!line.id) line.id = `line-${Math.random().toString(36).substr(2, 9)}`;
        newLines.push(line);
      });
      localStorage.setItem(STORAGE_KEYS.REPORT_LINES, JSON.stringify(newLines));
    }
  },
  traits: {
    getByReportId: async (reportId) => {
      const traits = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRAITS) || '[]');
      return traits.filter(t => t.report_id === reportId);
    },
    upsertBatch: async (traits) => {
      const allTraits = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRAITS) || '[]');
      const newTraits = allTraits.filter(t => !traits.find(nt => nt.id === t.id && nt.id));
      traits.forEach(trait => {
        if (!trait.id) trait.id = `trait-${Math.random().toString(36).substr(2, 9)}`;
        newTraits.push(trait);
      });
      localStorage.setItem(STORAGE_KEYS.TRAITS, JSON.stringify(newTraits));
    }
  },
  transferCredits: {
    getByStudentId: async (studentId) => {
      const credits = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSFER_CREDITS) || '[]');
      return credits.filter(c => c.student_id === studentId);
    }
  },
  gpaScale: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.GPA_SCALE) || '[]')
  },
  config: {
    get: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}'),
    update: async (updates) => {
      const config = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}');
      const updatedConfig = { ...config, ...updates, last_updated: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updatedConfig));
      return updatedConfig;
    }
  },
  auditLog: {
    getAll: async () => JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]'),
    add: async (action, userId) => {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]');
      logs.push({ id: `audit-${Date.now()}`, action, user_id: userId, timestamp: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(logs));
    }
  }
};

initializeDefaultData();

export default { auth, db };