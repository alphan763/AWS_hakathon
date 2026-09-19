export type TabType = 'home' | 'plan' | 'checkin' | 'more';

export type TaskCategory = 'medication' | 'activity' | 'diet' | 'rest' | 'followup';

export interface EvidenceSource {
  documentId: string;
  documentName: string;
  sourcePage: number;
  section: string;
  originalText: string;
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
  dayNumber: number;
  evidence: EvidenceSource;
}

export interface WarningSign {
  id: string;
  condition: string;
  triggerKey: 'breathing' | 'fever' | 'pain_worse';
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
  age: number;
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
