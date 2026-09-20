export type TabType = 'home' | 'plan' | 'checkin' | 'more';

export type TaskCategory = 'medication' | 'activity' | 'diet' | 'rest' | 'followup';

export type SymptomKey = 'breathing' | 'fever' | 'pain_worse';

export type CitationStatus = 'VERIFIED' | 'UNVERIFIED';

export interface EvidenceSource {
  documentId: string;
  documentName: string;
  sourcePage: number;
  section: string;
  originalText: string;
  // Set by server-side verification; absent (e.g. offline mock data) means not verified
  citationStatus?: CitationStatus;
  confidence?: number;
  verificationNote?: string;
}

export interface MedicationTask {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  timing: string; // e.g. "8:00 AM"
  instructions: string;
  completed: boolean;
  pillColor?: string;
  pillShape?: 'capsule' | 'round' | 'oval' | 'square';
  evidence: EvidenceSource;
}

export interface ActivityTask {
  id: string;
  title: string;
  timing: string;
  duration?: string;
  instructions: string;
  completed: boolean;
  category: 'activity' | 'diet' | 'rest';
  evidence: EvidenceSource;
}

export interface FollowUpAppointment {
  id: string;
  title: string;
  date: string;
  time: string;
  doctor: string;
  location: string;
  contactNumber: string;
  notes: string;
  dayNumber: number | null;
  evidence: EvidenceSource;
}

export interface WarningSign {
  id: string;
  condition: string;
  triggerKey?: SymptomKey;
  severity: 'urgent' | 'high';
  documentedAction: string;
  sourcePage: number;
  evidence: EvidenceSource;
}

export interface DailyPlan {
  dayNumber: number;
  dateLabel: string;
  isToday: boolean;
  isPast: boolean;
  milestoneTitle?: string;
  medications: MedicationTask[];
  activities: ActivityTask[];
  notes?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  mrn?: string;
  age: number | null;
  diagnosis: string;
  procedure: string;
  dischargeDate: string;
  currentDay: number;
  totalDays: number;
  hospitalName: string;
  attendingPhysician: string;
  caregiverName: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  hospitalHelpline: string;
  isDemo?: boolean;
}

export type PainLevel = 'better' | 'same' | 'worse';
export type FeverStatus = 'no' | 'yes';
export type BreathingStatus = 'normal' | 'difficult';

export interface CheckInRecord {
  id: string;
  timestamp: string;
  dayNumber: number;
  pain: PainLevel;
  fever: FeverStatus;
  breathing: BreathingStatus;
  notes?: string;
  warningMatched: boolean;
  matchedWarningSign?: WarningSign;
  // Reported symptoms with no documented warning sign in the active plan
  unmatchedSymptoms?: SymptomKey[];
}

export interface DocumentPage {
  pageNumber: number;
  title: string;
  content: string;
  highlights: {
    text: string;
    type: 'medication' | 'activity' | 'warning' | 'followup';
  }[];
}
