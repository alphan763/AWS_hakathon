import {
  PatientProfile,
  MedicationTask,
  ActivityTask,
  FollowUpAppointment,
  WarningSign,
  DocumentPage,
  DailyPlan,
} from '../types';

export const mockPatient: PatientProfile = {
  id: 'pt-84920',
  name: 'Mrs. Anita Sharma',
  age: 58,
  diagnosis: 'Symptomatic Cholelithiasis (Gallstones)',
  procedure: 'Elective Laparoscopic Cholecystectomy',
  dischargeDate: 'September 17, 2026',
  currentDay: 2,
  totalDays: 14,
  hospitalName: 'Apex Memorial Healthcare',
  attendingPhysician: 'Dr. Arvind Rao, MS, FACS',
  caregiverName: 'Pooja Sharma (Daughter)',
  emergencyContact: {
    name: 'Rajesh Sharma',
    relationship: 'Husband',
    phone: '+1 (800) 555-0199',
  },
  hospitalHelpline: '+1 (800) 555-0144 (Ext 4)',
};

export const mockWarningSigns: WarningSign[] = [
  {
    id: 'warn-breathing',
    condition: 'Difficulty breathing or sudden shortness of breath',
    triggerKey: 'breathing',
    severity: 'urgent',
    documentedAction: 'Contact the hospital immediately or proceed to the nearest emergency department.',
    sourcePage: 5,
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 5,
      section: 'Section 6: Emergency Red Flags & Hospital Escalation',
      originalText: 'Difficulty breathing, persistent chest tightness, or rapid respiration: Contact hospital immediately or report to Emergency Room.',
    },
  },
  {
    id: 'warn-fever',
    condition: 'Persistent high fever (>101°F / 38.3°C) with chills',
    triggerKey: 'fever',
    severity: 'high',
    documentedAction: 'Notify the surgical recovery team within 2 hours. Do not administer additional antipyretics without physician guidance.',
    sourcePage: 5,
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 5,
      section: 'Section 6: Emergency Red Flags & Hospital Escalation',
      originalText: 'Fever documented above 101°F (38.3°C) or severe shivering/chills: Notify surgical post-op unit immediately.',
    },
  },
  {
    id: 'warn-pain',
    condition: 'Severe or worsening abdominal pain unresponsive to prescribed medications',
    triggerKey: 'pain_worse',
    severity: 'high',
    documentedAction: 'Call the 24/7 post-op nurse line immediately. Do not exceed prescribed medication dosage.',
    sourcePage: 5,
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 5,
      section: 'Section 6: Emergency Red Flags & Hospital Escalation',
      originalText: 'Severe, escalating abdominal pain or abdominal distension unresponsive to oral paracetamol: Prompt evaluation required.',
    },
  },
];

export const mockFollowUp: FollowUpAppointment = {
  id: 'fu-01',
  title: 'Post-Operative Surgical Review & Suture Check',
  date: 'September 26, 2026 (Day 10)',
  time: '10:30 AM',
  doctor: 'Dr. Arvind Rao, MS',
  location: 'Surgical OPD Clinic, Suite 402, Apex Memorial',
  contactNumber: '+1 (800) 555-0144',
  notes: 'Bring surgical discharge summary and list of remaining medications. Fasting not required.',
  dayNumber: 10,
  evidence: {
    documentId: 'DOC-DISCHARGE-2026-991',
    documentName: 'Hospital Discharge Summary & Post-Op Plan',
    sourcePage: 4,
    section: 'Section 4: Outpatient Follow-up & Review',
    originalText: 'Follow-up appointment scheduled with Dr. Arvind Rao on Day 10 post-discharge (Sept 26, 10:30 AM) for wound inspection and suture removal.',
  },
};

export const mockTodayMedications: MedicationTask[] = [
  {
    id: 'med-01',
    name: 'Cefuroxime Axetil',
    dose: '500 mg',
    frequency: 'Twice daily',
    timing: '8:00 AM',
    instructions: 'Take 1 tablet after breakfast with a full glass of water.',
    completed: true,
    pillColor: '#3B82F6', // calm blue
    pillShape: 'capsule',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 3,
      section: 'Section 3: Discharge Medications & Dosing Schedule',
      originalText: 'Tab. Cefuroxime Axetil 500 mg PO BID (8:00 AM, 8:00 PM) for 5 days. Administer with meals to prevent gastrointestinal upset.',
    },
  },
  {
    id: 'med-02',
    name: 'Paracetamol (Acetaminophen)',
    dose: '650 mg',
    frequency: 'As scheduled / Post-meals',
    timing: '1:30 PM',
    instructions: 'Take 1 tablet after lunch for surgical incision soreness.',
    completed: false,
    pillColor: '#F97316', // calm warm orange
    pillShape: 'oval',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 3,
      section: 'Section 3: Discharge Medications & Dosing Schedule',
      originalText: 'Tab. Paracetamol 650 mg PO TID (after meals) PRN for pain control. Do not exceed 3,000 mg in 24 hours.',
    },
  },
  {
    id: 'med-03',
    name: 'Cefuroxime Axetil',
    dose: '500 mg',
    frequency: 'Evening dose',
    timing: '8:00 PM',
    instructions: 'Take 1 tablet after dinner. Complete the entire 5-day antibiotic course.',
    completed: false,
    pillColor: '#3B82F6',
    pillShape: 'capsule',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 3,
      section: 'Section 3: Discharge Medications & Dosing Schedule',
      originalText: 'Tab. Cefuroxime Axetil 500 mg PO BID (8:00 AM, 8:00 PM) for 5 days. Complete prescribed course strictly.',
    },
  },
  {
    id: 'med-04',
    name: 'Pantoprazole',
    dose: '40 mg',
    frequency: 'Once daily before bedtime',
    timing: '9:30 PM',
    instructions: 'Take 1 tablet 30 minutes before bed for acid suppression.',
    completed: false,
    pillColor: '#10B981', // emerald
    pillShape: 'round',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 3,
      section: 'Section 3: Discharge Medications & Dosing Schedule',
      originalText: 'Tab. Pantoprazole 40 mg PO once daily at bedtime for 14 days.',
    },
  },
];

export const mockTodayActivities: ActivityTask[] = [
  {
    id: 'act-01',
    title: 'Gentle Indoor Walk (10 minutes)',
    timing: '11:00 AM',
    duration: '10 mins',
    instructions: 'Walk slowly on flat ground inside the house. Stop immediately if dizzy or fatigued.',
    completed: true,
    category: 'activity',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 4,
      section: 'Section 5: Physical Activity & Recovery Guidelines',
      originalText: 'Early mobilization advised: Short walks of 5–10 minutes 2–3 times daily starting Day 2 post-op to promote bowel motility and prevent venous stasis. Avoid heavy lifting (>5 kg) for 4 weeks.',
    },
  },
  {
    id: 'act-02',
    title: 'Low-Fat, Bland Lunch & Hydration',
    timing: '1:00 PM',
    instructions: 'Eat easily digestible meals (steamed vegetables, dal, rice). Avoid fried or spicy food. Drink 250ml warm water.',
    completed: false,
    category: 'diet',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 4,
      section: 'Section 4: Dietary Instructions',
      originalText: 'Low-fat, high-protein soft diet recommended for first 7–10 days post-cholecystectomy. Maintain hydration with at least 1.5 to 2 liters of water daily.',
    },
  },
  {
    id: 'act-03',
    title: 'Afternoon Rest & Elevation',
    timing: '2:30 PM',
    duration: '45 mins',
    instructions: 'Rest in a semi-reclined position with pillows supporting the back. Avoid sudden bending.',
    completed: false,
    category: 'rest',
    evidence: {
      documentId: 'DOC-DISCHARGE-2026-991',
      documentName: 'Hospital Discharge Summary & Post-Op Plan',
      sourcePage: 4,
      section: 'Section 5: Physical Activity & Recovery Guidelines',
      originalText: 'Adequate daytime rest intervals recommended. Sleep in comfortable semi-fowler position if abdominal discomfort occurs.',
    },
  },
];

export const mock14DayPlan: DailyPlan[] = [
  {
    dayNumber: 1,
    dateLabel: 'Sept 17',
    isToday: false,
    isPast: true,
    milestoneTitle: 'Hospital Discharge & Home Transition',
    medications: mockTodayMedications,
    activities: mockTodayActivities,
    notes: 'Discharged in stable condition. Vital signs within normal limits. Sterile dressings applied.',
  },
  {
    dayNumber: 2,
    dateLabel: 'Sept 18',
    isToday: true,
    isPast: false,
    milestoneTitle: 'Active Recovery & Pain Management',
    medications: mockTodayMedications,
    activities: mockTodayActivities,
    notes: 'Focus on medication adherence and light 10-minute ambulation. Keep incision dressings clean and dry.',
  },
  {
    dayNumber: 3,
    dateLabel: 'Sept 19',
    isToday: false,
    isPast: false,
    milestoneTitle: 'Dressing Inspection & Walking (12 min)',
    medications: mockTodayMedications,
    activities: mockTodayActivities,
    notes: 'Inspect dressings for any bleeding or soaking. Maintain low-fat soft foods.',
  },
  {
    dayNumber: 4,
    dateLabel: 'Sept 20',
    isToday: false,
    isPast: false,
    milestoneTitle: 'Dietary Expansion (Soft Solids)',
    medications: mockTodayMedications,
    activities: mockTodayActivities,
    notes: 'Gradually reintroduce normal solid foods with low fat content. Avoid dairy if bloated.',
  },
  {
    dayNumber: 5,
    dateLabel: 'Sept 21',
    isToday: false,
    isPast: false,
    milestoneTitle: 'End of Antibiotic Course',
    medications: mockTodayMedications,
    activities: mockTodayActivities,
    notes: 'Complete Day 5 morning and evening antibiotic doses. Discontinue antibiotics thereafter.',
  },
  {
    dayNumber: 7,
    dateLabel: 'Sept 23',
    isToday: false,
    isPast: false,
    milestoneTitle: '1-Week Wound Assessment',
    medications: mockTodayMedications.slice(1, 3),
    activities: mockTodayActivities,
    notes: 'Gentle sponge bath allowed. Do not immerse wound in tub or swimming pool.',
  },
  {
    dayNumber: 10,
    dateLabel: 'Sept 26',
    isToday: false,
    isPast: false,
    milestoneTitle: 'Clinic Follow-up Appointment',
    medications: mockTodayMedications.slice(1, 2),
    activities: mockTodayActivities,
    notes: '10:30 AM appointment with Dr. Arvind Rao. Suture removal and clinical evaluation.',
  },
  {
    dayNumber: 14,
    dateLabel: 'Sept 30',
    isToday: false,
    isPast: false,
    milestoneTitle: 'Final Recovery Clearance',
    medications: [],
    activities: mockTodayActivities,
    notes: 'Full recovery milestone. Resume light driving and desk work if pain-free.',
  },
];

export const mockDischargeDocumentPages: DocumentPage[] = [
  {
    pageNumber: 1,
    title: 'Hospital Header & Patient Identification',
    content: `APEX MEMORIAL HEALTHCARE SYSTEM
Department of General & Laparoscopic Surgery
PATIENT DISCHARGE SUMMARY

Patient Name: Mrs. Anita Sharma
Hospital MRN: #AMH-9921408
Age / Gender: 58 Yrs / Female
Date of Admission: September 15, 2026
Date of Procedure: September 16, 2026 (08:30 AM)
Date of Discharge: September 17, 2026 (14:00 PM)
Attending Surgeon: Dr. Arvind Rao, MS, FACS
Primary Caregiver: Pooja Sharma (Daughter, +1 800 555-0199)

PRIMARY CLINICAL DIAGNOSIS:
Symptomatic Cholelithiasis with recurrent biliary colic.

OPERATIVE PROCEDURE PERFORMED:
Elective Four-Port Laparoscopic Cholecystectomy.
Operative course uneventful. Hemostasis secured. Gallbladder extracted intact via endobag.
Histopathology specimen sent. No subhepatic drain placed.`,
    highlights: [],
  },
  {
    pageNumber: 2,
    title: 'Post-Operative Hospital Course & Vitals',
    content: `HOSPITAL COURSE & RECOVERY TIMELINE:
Patient tolerated general anesthesia well. Extubated in OR.
Post-op Day 0: Patient was monitored in recovery for 4 hours. Initiated oral sips of water at 6 hours post-op. Mild trocar site pain controlled with IV analgesics.
Post-op Day 1: Ambulated in corridor. Passed flatus. Bowel sounds present. Oral liquids tolerated without nausea. Converted from IV to oral medications.
Discharge Vitals:
- Blood Pressure: 124/78 mmHg
- Heart Rate: 72 bpm, regular
- SpO2: 98% on room air
- Temperature: 98.4°F (36.9°C)
- Surgical wounds: Clean, dry, sterile micropore dressings intact.`,
    highlights: [],
  },
  {
    pageNumber: 3,
    title: 'Discharge Medications & Administration Guidelines',
    content: `SECTION 3: DISCHARGE MEDICATIONS & DOSING SCHEDULE

1. Tab. Cefuroxime Axetil 500 mg
   - Dose: 500 mg oral tablet
   - Frequency: Twice daily (every 12 hours: 8:00 AM and 8:00 PM)
   - Duration: Complete for exactly 5 days post-discharge
   - Instructions: Administer after meals with water. Do not skip doses.

2. Tab. Paracetamol (Acetaminophen) 650 mg
   - Dose: 650 mg oral tablet
   - Frequency: Three times daily after meals as needed for mild-to-moderate incision pain
   - Timing: 8:00 AM, 1:30 PM, 8:00 PM (or every 6-8 hours)
   - Precaution: Do not exceed 3,000 mg in any 24-hour period.

3. Tab. Pantoprazole 40 mg
   - Dose: 40 mg oral tablet
   - Frequency: Once daily at night 30 minutes before sleep
   - Duration: 14 days for gastroprotection.`,
    highlights: [
      {
        text: 'Tab. Cefuroxime Axetil 500 mg PO BID (8:00 AM, 8:00 PM) for 5 days.',
        type: 'medication',
      },
      {
        text: 'Tab. Paracetamol 650 mg PO TID (after meals) PRN for pain control.',
        type: 'medication',
      },
      {
        text: 'Tab. Pantoprazole 40 mg PO once daily at bedtime for 14 days.',
        type: 'medication',
      },
    ],
  },
  {
    pageNumber: 4,
    title: 'Activity, Diet & Follow-up Instructions',
    content: `SECTION 4: DIETARY INSTRUCTIONS
- Maintain a low-fat, easily digestible diet for the first 10 days.
- Avoid greasy, deep-fried foods, heavy creams, and spicy curries.
- Small, frequent meals are better tolerated than heavy portions.
- Maintain adequate hydration: 1.5 to 2 liters of fluids/water daily.

SECTION 5: PHYSICAL ACTIVITY & RECOVERY GUIDELINES
- Ambulation: Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2.
- Lifting restrictions: Strictly avoid lifting items heavier than 5 kg (10 lbs) for 4 weeks.
- Driving: No driving for 7 days or while taking sedating analgesics.
- Bathing: Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.

SECTION 6: OUTPATIENT CLINICAL FOLLOW-UP
- Scheduled Review: Day 10 post-discharge (September 26, 2026 at 10:30 AM).
- Location: Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare.
- Doctor: Dr. Arvind Rao. Contact: +1 (800) 555-0144.`,
    highlights: [
      {
        text: 'Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2.',
        type: 'activity',
      },
      {
        text: 'Maintain a low-fat, easily digestible diet for the first 10 days.',
        type: 'activity',
      },
      {
        text: 'Follow-up appointment scheduled with Dr. Arvind Rao on Day 10 post-discharge (Sept 26, 10:30 AM).',
        type: 'followup',
      },
    ],
  },
  {
    pageNumber: 5,
    title: 'Critical Warning Signs & Emergency Protocol',
    content: `SECTION 7: EMERGENCY RED FLAGS & HOSPITAL ESCALATION PROTOCOL

Patients and caregivers must inspect for the following documented warning signs. If observed, enact the specific documented action below immediately:

1. DIFFICULTY BREATHING / CHEST PAIN:
   - Signs: Shortness of breath, rapid shallow breathing, chest tightness, or pain upon deep inhalation.
   - Documented Action: Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room. Do not wait.

2. PERSISTENT FEVER:
   - Signs: Body temperature greater than 101.0°F (38.3°C) or severe chills/rigors.
   - Documented Action: Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.

3. SEVERE OR ESCALATING PAIN:
   - Signs: Abdominal pain that progressively worsens despite prescribed pain medication, or abdominal wall becomes rigid and tender.
   - Documented Action: Call the 24/7 post-op nurse coordinator immediately.

4. WOUND DRAINAGE / JAUNDICE:
   - Signs: Active bleeding soaking dressings, yellowing of eyes/skin, or foul odor from incision sites.
   - Documented Action: Prompt hospital evaluation required within 4 hours.`,
    highlights: [
      {
        text: 'Difficulty breathing, persistent chest tightness, or rapid respiration: Contact hospital immediately or report to Emergency Room.',
        type: 'warning',
      },
      {
        text: 'Fever documented above 101°F (38.3°C) or severe shivering/chills: Notify surgical post-op unit immediately.',
        type: 'warning',
      },
      {
        text: 'Severe, escalating abdominal pain or abdominal distension unresponsive to oral paracetamol: Prompt evaluation required.',
        type: 'warning',
      },
    ],
  },
];
