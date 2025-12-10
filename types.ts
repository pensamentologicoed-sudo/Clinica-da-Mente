
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role?: string; // 'Admin' | 'Profissional' | 'Assessor'
  cpf?: string;
  crm?: string;
}

export interface Profile {
  id: string;
  name: string;
  role: string;
  photo_url?: string;
  email?: string;
  crm?: string;
  cpf?: string;
}

export interface Patient {
  id: string;
  user_id: string; // Creator
  professional_id?: string; // Assigned Professional
  full_name: string; 
  date_of_birth: string; 
  diagnosis: string;
  notes?: string;
  phone: string; 
  email?: string;
  address?: string;
  status?: 'Active' | 'Inactive'; 
  photo_url?: string; 
  
  // New fields
  cpf?: string;
  sus_number?: string;
  sex?: string;
}

// Keeping for UI compatibility with existing Assistant CRUD
export interface Assistant {
  id: string;
  fullName: string;
  specialty: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface ConsultationMedicine {
  name: string;
  dosage: string;
  frequency: string;
  stock: number;
}

export interface Consultation {
  id: string;
  patient_id: string;
  professional_id?: string | null; // Added
  user_id?: string | null; // Added (Creator)
  date: string;
  time: string; // Pode ser null nos dados importados, tratar na UI
  patient_notes?: string; // Queixas do paciente
  professional_notes?: string; // Obs do profissional
  summary?: string; // Campo legado importado
  next_date?: string; // Data da próxima consulta
  medicines?: ConsultationMedicine[]; // JSONB
  created_at?: string;
}

export interface Medication {
  id: string;
  patient_id?: string; // Optional for generic inventory
  name: string;
  dosage: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  stock?: number; // Added for inventory management
}

export type ViewState = 'dashboard' | 'clients' | 'assistants' | 'medications' | 'profile';