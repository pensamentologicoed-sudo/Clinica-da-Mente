import { User, Patient, Assistant, Medication } from '../types';

// Helper to delay response to simulate network
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  USERS: 'psicare_users',
  SESSION: 'psicare_session',
  PATIENTS: 'psicare_patients',
  ASSISTANTS: 'psicare_assistants',
  MEDICATIONS: 'psicare_medications',
};

// Seed data
const seedData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
    const patients: Patient[] = [
      { 
        id: '1', 
        user_id: 'mock-user-1',
        full_name: 'Maria Silva', 
        date_of_birth: '1955-04-12', 
        diagnosis: 'Alzheimer Early Stage', 
        status: 'Active', 
        phone: '(11) 99999-9999', 
        photo_url: 'https://picsum.photos/200' 
      },
      { 
        id: '2', 
        user_id: 'mock-user-1',
        full_name: 'João Santos', 
        date_of_birth: '1948-11-23', 
        diagnosis: 'Parkinson', 
        status: 'Active', 
        phone: '(11) 98888-8888', 
        photo_url: 'https://picsum.photos/201' 
      },
    ];
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ASSISTANTS)) {
    const assistants: Assistant[] = [
      { id: '1', fullName: 'Ana Clara', specialty: 'Nurse', email: 'ana@psicare.com', phone: '(11) 97777-7777', photoUrl: 'https://picsum.photos/202' },
    ];
    localStorage.setItem(STORAGE_KEYS.ASSISTANTS, JSON.stringify(assistants));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEDICATIONS)) {
    const meds: Medication[] = [
      { id: '1', name: 'Donepezila', dosage: '10mg', frequency: 'Daily', stock: 30 },
      { id: '2', name: 'Levodopa', dosage: '250mg', frequency: '3x Daily', stock: 90 },
    ];
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(meds));
  }
};

seedData();

export const mockSupabase = {
  auth: {
    signIn: async (email: string, password?: string) => {
      await delay(800);
      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
      const users: User[] = JSON.parse(usersRaw);
      const user = users.find(u => u.email === email);
      
      // In a real app, we would check the password here.
      if (user) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        return { user, error: null };
      }
      return { user: null, error: 'User not found' };
    },
    signUp: async (email: string, password: string, fullName: string, avatarUrl?: string) => {
      await delay(1000);
      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS) || '[]';
      const users: User[] = JSON.parse(usersRaw);
      
      if (users.find(u => u.email === email)) {
        return { user: null, error: 'User already exists' };
      }

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        fullName,
        avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      };

      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newUser));
      return { user: newUser, error: null };
    },
    signOut: async () => {
      await delay(300);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    },
    getSession: () => {
      const session = localStorage.getItem(STORAGE_KEYS.SESSION);
      return session ? JSON.parse(session) : null;
    }
  },
  db: {
    from: (table: 'patients' | 'assistants' | 'medications') => {
      const key = table === 'patients' ? STORAGE_KEYS.PATIENTS : 
                  table === 'assistants' ? STORAGE_KEYS.ASSISTANTS : 
                  STORAGE_KEYS.MEDICATIONS;
      
      const getItems = (): any[] => JSON.parse(localStorage.getItem(key) || '[]');
      const setItems = (items: any[]) => localStorage.setItem(key, JSON.stringify(items));

      return {
        select: async () => {
          await delay(400);
          return { data: getItems(), error: null };
        },
        insert: async (item: any) => {
          await delay(400);
          const items = getItems();
          const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
          items.push(newItem);
          setItems(items);
          return { data: newItem, error: null };
        },
        update: async (id: string, updates: any) => {
          await delay(400);
          const items = getItems();
          const index = items.findIndex((i: any) => i.id === id);
          if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            setItems(items);
            return { data: items[index], error: null };
          }
          return { error: 'Item not found' };
        },
        delete: async (id: string) => {
          await delay(400);
          const items = getItems();
          const filtered = items.filter((i: any) => i.id !== id);
          setItems(filtered);
          return { error: null };
        }
      };
    }
  }
};