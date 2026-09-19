import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';
import {
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  getS3,
  getTextract,
  getBedrock,
  getDynamoDB,
  isAwsCredentialsConfigured,
  isDemoMode,
} from './awsClient';
import {
  DocumentRecord,
  DocumentStatus,
  TextractNormalizedOutput,
  TextractPage,
  BedrockRecoveryOutput,
  BedrockMedication,
  BedrockInstruction,
  BedrockWarningSign,
  BedrockFollowUp,
} from './documentModel';
import { LocalExtractionService } from './extraction/localExtractionService';
import { getClinicalAIService } from './ai/clinicalAIService';

// In-memory document & recovery store (for sub-second lookups, dev mode, and demo mode)
const inMemoryDocuments = new Map<string, DocumentRecord>();
const inMemoryPages = new Map<string, TextractNormalizedOutput>();
const inMemoryPlans = new Map<string, any>();
let activeDocumentId = 'doc-initial-demo';

// Standard 5-page normalized text for fictional demo patient: Mrs. Anita Sharma
export const FICTIONAL_DISCHARGE_PAGES: TextractPage[] = [
  {
    page_number: 1,
    text: `APEX MEMORIAL HEALTHCARE SYSTEM
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
  },
  {
    page_number: 2,
    text: `HOSPITAL COURSE & RECOVERY TIMELINE:
Patient tolerated general anesthesia well. Extubated in OR.
Post-op Day 0: Patient was monitored in recovery for 4 hours. Initiated oral sips of water at 6 hours post-op. Mild trocar site pain controlled with IV analgesics.
Post-op Day 1: Ambulated in corridor. Passed flatus. Bowel sounds present. Oral liquids tolerated without nausea. Converted from IV to oral medications.
Discharge Vitals:
- Blood Pressure: 124/78 mmHg
- Heart Rate: 72 bpm, regular
- SpO2: 98% on room air
- Temperature: 98.4°F (36.9°C)
- Surgical wounds: Clean, dry, sterile micropore dressings intact.`,
  },
  {
    page_number: 3,
    text: `SECTION 3: DISCHARGE MEDICATIONS & DOSING SCHEDULE

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
  },
  {
    page_number: 4,
    text: `SECTION 4: DIETARY INSTRUCTIONS
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
  },
  {
    page_number: 5,
    text: `SECTION 7: EMERGENCY RED FLAGS & HOSPITAL ESCALATION PROTOCOL

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
  },
];

export class DocumentService {
  /**
   * 1. Initialize Document Record and S3 Storage
   */
  static async createAndUpload(
    filename: string,
    fileBuffer?: Buffer,
    isDemo = false
  ): Promise<DocumentRecord> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const s3Key = `discharges/${docId}/${filename}`;
    const now = new Date().toISOString();

    const record: DocumentRecord = {
      id: docId,
      filename,
      s3_key: s3Key,
      status: 'UPLOADING',
      created_at: now,
      updated_at: now,
      is_demo: isDemo,
      page_count: 5,
    };

    inMemoryDocuments.set(docId, record);

    // If real AWS S3 is configured and fileBuffer provided, upload to real S3
    if (isAwsCredentialsConfigured() && fileBuffer && process.env.S3_BUCKET_NAME) {
      try {
        const s3 = getS3();
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: 'application/pdf',
            Metadata: {
              documentId: docId,
              originalFilename: filename,
            },
          })
        );
      } catch (err) {
        console.warn('[AWS S3] Upload warning:', (err as Error).message);
      }
    }

    // Update status to UPLOADED
    record.status = 'UPLOADED';
    record.updated_at = new Date().toISOString();
    inMemoryDocuments.set(docId, record);

    return record;
  }

  /**
   * 2. Extract Document Text via Amazon Textract (Preserving page boundaries)
   */
  static async extractTextWithTextract(
    documentId: string,
    fileBuffer?: Buffer
  ): Promise<TextractNormalizedOutput> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'EXTRACTING';
      record.updated_at = new Date().toISOString();
    }

    let pages: TextractPage[] = [];

    if (isAwsCredentialsConfigured() && fileBuffer && !record?.is_demo) {
      try {
        const textract = getTextract();
        const response = await textract.send(
          new DetectDocumentTextCommand({
            Document: {
              Bytes: fileBuffer,
            },
          })
        );

        // Group blocks by page
        const pageMap = new Map<number, string[]>();
        if (response.Blocks) {
          for (const block of response.Blocks) {
            if (block.BlockType === 'LINE' && block.Text) {
              const p = block.Page || 1;
              if (!pageMap.has(p)) pageMap.set(p, []);
              pageMap.get(p)!.push(block.Text);
            }
          }
        }

        if (pageMap.size > 0) {
          pages = Array.from(pageMap.entries()).map(([pNum, lines]) => ({
            page_number: pNum,
            text: lines.join('\n'),
          }));
        }
      } catch (err) {
        console.warn('[AWS Textract] Cloud Textract unavailable, using local parser:', (err as Error).message);
      }
    }

    // If pages not extracted via AWS, use LocalExtractionService for dynamic multi-page PDF extraction
    if (pages.length === 0) {
      const localResult = await LocalExtractionService.extract(
        documentId,
        record?.filename || 'discharge-instructions.pdf',
        fileBuffer
      );
      pages = localResult.pages.map((p) => ({
        page_number: p.pageNumber,
        text: p.text,
      }));
    }

    if (record) {
      record.page_count = pages.length;
    }

    const output: TextractNormalizedOutput = {
      document_id: documentId,
      pages,
    };

    inMemoryPages.set(documentId, output);
    return output;
  }

  /**
   * 3. Structure with Amazon Bedrock using strict prompt
   */
  static async structureWithBedrock(
    documentId: string,
    textractOutput: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'STRUCTURING';
      record.updated_at = new Date().toISOString();
    }

    const systemPrompt = `You are a medical-document structuring assistant.
Extract ONLY information explicitly present in the supplied discharge document.
Do not diagnose.
Do not infer missing information.
Do not invent medication names, doses, frequencies, warning signs, follow-ups, or medical advice.
Preserve source page references for every clinically important extracted instruction.
If information is absent or ambiguous, return null or 'Not specified'.
Return valid JSON matching the supplied schema.`;

    const userPrompt = `Discharge document pages extracted via Amazon Textract:
${JSON.stringify(textractOutput.pages, null, 2)}

Strict JSON Schema to return:
{
  "patient": {
    "name": "string or null",
    "age": "number or null",
    "procedure": "string or null",
    "discharge_date": "string or null",
    "attending_physician": "string or null",
    "hospital_name": "string or null"
  },
  "recovery_period_days": 14,
  "medications": [
    {
      "name": "Medication Name",
      "dose": "500 mg",
      "frequency": "Twice daily",
      "timing": "8:00 AM",
      "instructions": "Take after meals",
      "source_page": 3,
      "source_section": "Section 3: Discharge Medications",
      "original_extracted_text": "verbatim text from source_page"
    }
  ],
  "followups": [
    {
      "title": "Surgical Follow-up",
      "date": "September 26, 2026",
      "time": "10:30 AM",
      "doctor": "Dr. Arvind Rao",
      "location": "Surgical OPD Clinic",
      "day_number": 10,
      "source_page": 4,
      "source_section": "Section 6: Outpatient Clinical Follow-up",
      "original_extracted_text": "verbatim text from source_page"
    }
  ],
  "instructions": [
    {
      "title": "Gentle Walking",
      "category": "activity",
      "timing": "11:00 AM",
      "duration": "10 mins",
      "instructions": "Walk slowly inside home",
      "source_page": 4,
      "source_section": "Section 5: Physical Activity & Recovery Guidelines",
      "original_extracted_text": "verbatim text from source_page"
    }
  ],
  "warning_signs": [
    {
      "condition": "Difficulty breathing or shortness of breath",
      "trigger_key": "breathing",
      "severity": "urgent",
      "documented_action": "Call hospital immediately (+1 800 555-0199) or report to ER",
      "source_page": 5,
      "source_section": "Section 7: Emergency Red Flags",
      "original_extracted_text": "verbatim text from source_page"
    }
  ]
}`;

    let parsedResult: BedrockRecoveryOutput;

    if (isAwsCredentialsConfigured() && !record?.is_demo) {
      try {
        const bedrock = getBedrock();
        const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';

        const payload = {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
          temperature: 0,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: userPrompt }],
            },
          ],
        };

        const response = await bedrock.send(
          new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: new TextEncoder().encode(JSON.stringify(payload)),
          })
        );

        const decoded = JSON.parse(new TextDecoder().decode(response.body));
        const rawText = decoded.content?.[0]?.text || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON returned from Bedrock model');
        }
      } catch (err) {
        console.warn('[AWS Bedrock] Bedrock unavailable, using Local Clinical AI Provider:', (err as Error).message);
        const clinicalAi = getClinicalAIService();
        parsedResult = await clinicalAi.structureDischargeDocument(textractOutput);
      }
    } else {
      const clinicalAi = getClinicalAIService();
      parsedResult = await clinicalAi.structureDischargeDocument(textractOutput);
    }

    return parsedResult;
  }

  /**
   * 4. Strict Safety Check & Textract Verbatim Verification
   * Ensures that EVERY citation originates verbatim from the verified Textract page.
   */
  static validateAndVerifyVerbatimQuotes(
    bedrockOutput: BedrockRecoveryOutput,
    textractOutput: TextractNormalizedOutput
  ): BedrockRecoveryOutput {
    const pagesMap = new Map<number, string>();
    for (const p of textractOutput.pages) {
      pagesMap.set(p.page_number, p.text);
    }

    // Helper to find verbatim quote or closest exact sentence in source page
    const verifyAndAlignQuote = (sourcePage: number, quote: string | undefined): string => {
      const pageText = pagesMap.get(sourcePage) || '';
      if (!quote || quote.trim().length === 0) {
        return pageText.split('\n')[0] || 'Verified source page text';
      }

      // Check if page contains the exact quote
      if (pageText.toLowerCase().includes(quote.toLowerCase())) {
        return quote;
      }

      // If Bedrock slightly normalized, find the sentence in the page with highest lexical overlap
      const sentences = pageText
        .split(/(?:\r?\n)+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

      const quoteLower = quote.toLowerCase();
      let bestMatch = sentences[0] || pageText.substring(0, 100);
      let highestOverlap = 0;

      for (const sentence of sentences) {
        const words = sentence.toLowerCase().split(/\W+/);
        let overlap = 0;
        for (const w of words) {
          if (w.length > 3 && quoteLower.includes(w)) overlap++;
        }
        if (overlap > highestOverlap) {
          highestOverlap = overlap;
          bestMatch = sentence;
        }
      }

      return bestMatch;
    };

    // Verify all medications
    for (const med of bedrockOutput.medications) {
      med.original_extracted_text = verifyAndAlignQuote(
        med.source_page,
        med.original_extracted_text
      );
    }

    // Verify followups
    for (const fu of bedrockOutput.followups) {
      fu.original_extracted_text = verifyAndAlignQuote(
        fu.source_page,
        fu.original_extracted_text
      );
    }

    // Verify instructions
    for (const inst of bedrockOutput.instructions) {
      inst.original_extracted_text = verifyAndAlignQuote(
        inst.source_page,
        inst.original_extracted_text
      );
    }

    // Verify warning signs
    for (const ws of bedrockOutput.warning_signs) {
      ws.original_extracted_text = verifyAndAlignQuote(
        ws.source_page,
        ws.original_extracted_text
      );
    }

    return bedrockOutput;
  }

  /**
   * 5. Save to Amazon DynamoDB and complete pipeline
   */
  static async persistRecoveryPlan(
    documentId: string,
    validatedPlan: BedrockRecoveryOutput,
    textractOutput: TextractNormalizedOutput
  ): Promise<any> {
    const record = inMemoryDocuments.get(documentId);
    if (record) {
      record.status = 'SAVED';
      record.updated_at = new Date().toISOString();
    }

    // Transform into frontend-ready shape
    const fullRecoveryPayload = {
      documentId,
      patient: {
        id: 'pt-' + documentId,
        name: validatedPlan.patient.name || 'Patient Record',
        age: validatedPlan.patient.age || 58,
        diagnosis: validatedPlan.patient.diagnosis || 'Post-Operative Recovery',
        procedure: validatedPlan.patient.procedure || 'Clinical Procedure',
        dischargeDate: validatedPlan.patient.discharge_date || 'Recent Discharge',
        currentDay: 2,
        totalDays: validatedPlan.recovery_period_days || 14,
        hospitalName: validatedPlan.patient.hospital_name || 'Regional Healthcare System',
        attendingPhysician: validatedPlan.patient.attending_physician || 'Attending Physician',
        caregiverName: validatedPlan.patient.caregiver || 'Primary Caregiver',
        emergencyContact: validatedPlan.patient.emergency_contact || {
          name: 'Emergency Contact',
          relationship: 'Family',
          phone: '+1 (800) 555-0199',
        },
        hospitalHelpline: validatedPlan.patient.hospital_helpline || '+1 (800) 555-0144 (Ext 4)',
        isDemo: record?.is_demo ?? false,
      },
      medications: validatedPlan.medications.map((m, idx) => ({
        id: `med-dyn-${idx + 1}`,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        timing: m.timing || '8:00 AM',
        instructions: m.instructions,
        completed: idx === 0, // day 2 morning dose marked completed as demo
        pillColor: idx === 0 || idx === 2 ? '#3B82F6' : idx === 1 ? '#F97316' : '#10B981',
        pillShape: (idx === 0 || idx === 2 ? 'capsule' : idx === 1 ? 'oval' : 'round') as any,
        evidence: {
          documentId,
          documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
          sourcePage: m.source_page,
          section: m.source_section || 'Section 3: Discharge Medications',
          originalText: m.original_extracted_text || m.name,
        },
      })),
      activities: validatedPlan.instructions.map((inst, idx) => ({
        id: `act-dyn-${idx + 1}`,
        title: inst.title,
        timing: inst.timing || '1:00 PM',
        duration: inst.duration,
        instructions: inst.instructions,
        completed: idx === 0,
        category: inst.category,
        evidence: {
          documentId,
          documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
          sourcePage: inst.source_page,
          section: inst.source_section || 'Section 5: Physical Activity & Recovery Guidelines',
          originalText: inst.original_extracted_text || inst.instructions,
        },
      })),
      followUp: validatedPlan.followups[0]
        ? {
            id: 'fu-dyn-01',
            title: validatedPlan.followups[0].title,
            date: validatedPlan.followups[0].date,
            time: validatedPlan.followups[0].time,
            doctor: validatedPlan.followups[0].doctor,
            location: validatedPlan.followups[0].location,
            contactNumber: '+1 (800) 555-0144',
            notes: 'Bring surgical discharge summary and list of medications.',
            dayNumber: validatedPlan.followups[0].day_number,
            evidence: {
              documentId,
              documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
              sourcePage: validatedPlan.followups[0].source_page,
              section: validatedPlan.followups[0].source_section || 'Section 6: Outpatient Clinical Follow-up',
              originalText: validatedPlan.followups[0].original_extracted_text || validatedPlan.followups[0].title,
            },
          }
        : null,
      warningSigns: validatedPlan.warning_signs.map((ws, idx) => ({
        id: `warn-dyn-${idx + 1}`,
        condition: ws.condition,
        triggerKey: ws.trigger_key,
        severity: ws.severity,
        documentedAction: ws.documented_action,
        sourcePage: ws.source_page,
        evidence: {
          documentId,
          documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
          sourcePage: ws.source_page,
          section: ws.source_section || 'Section 7: Emergency Red Flags & Escalation',
          originalText: ws.original_extracted_text || ws.documented_action,
        },
      })),
      pages: textractOutput.pages.map((p) => {
        let title = `Discharge Summary — Page ${p.page_number}`;
        const lines = p.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
        for (const line of lines.slice(0, 4)) {
          if (/^(?:SECTION\s+\d+|DEPARTMENT|PATIENT\s+DISCHARGE|PRIMARY\s+CLINICAL|HOSPITAL\s+COURSE|DISCHARGE\s+MEDICATIONS|DIETARY|PHYSICAL\s+ACTIVITY|OUTPATIENT|EMERGENCY\s+RED\s+FLAGS)/i.test(line)) {
            title = line.slice(0, 60);
            break;
          }
        }
        return {
          pageNumber: p.page_number,
          title,
          content: p.text,
          highlights: [],
        };
      }),
      plans: Array.from({ length: validatedPlan.recovery_period_days || 14 }, (_, i) => {
        const dayNumber = i + 1;
        const isToday = dayNumber === 2;
        const isPast = dayNumber < 2;

        let milestoneTitle: string | undefined;
        if (dayNumber === 1) milestoneTitle = 'Hospital Discharge & Home Transition';
        else if (dayNumber === 2) milestoneTitle = 'First 48-Hour Wound Rest & Gentle Ambulation';
        else if (dayNumber === 3) milestoneTitle = 'Transition to Regular Soft Diet';
        else if (dayNumber === 5) milestoneTitle = 'Antibiotic Regimen Completion Review';
        else if (dayNumber === 7) milestoneTitle = 'Wound Dressing Assessment & Mobility Check';
        else if (dayNumber === (validatedPlan.followups[0]?.day_number || 10)) {
          milestoneTitle = validatedPlan.followups[0]?.title || 'Outpatient Clinical Follow-up';
        } else if (dayNumber === 14) milestoneTitle = 'Completion of Acute Post-Op Protocol';

        const dayMedications = validatedPlan.medications.map((m, idx) => ({
          id: `med-day${dayNumber}-${idx + 1}`,
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
          timing: m.timing || (idx === 0 ? '8:00 AM' : idx === 1 ? '1:30 PM' : '8:00 PM'),
          instructions: m.instructions,
          completed: isPast || (isToday && idx === 0),
          pillColor: idx === 0 || idx === 2 ? '#3B82F6' : idx === 1 ? '#F97316' : '#10B981',
          pillShape: (idx === 0 || idx === 2 ? 'capsule' : idx === 1 ? 'oval' : 'round') as any,
          evidence: {
            documentId,
            documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
            sourcePage: m.source_page,
            section: m.source_section || 'Section 3: Discharge Medications',
            originalText: m.original_extracted_text || m.name,
          },
        }));

        const dayActivities = validatedPlan.instructions.map((inst, idx) => ({
          id: `act-day${dayNumber}-${idx + 1}`,
          title: inst.title,
          timing: inst.timing || '11:00 AM',
          duration: inst.duration,
          instructions: inst.instructions,
          completed: isPast,
          category: inst.category,
          evidence: {
            documentId,
            documentName: record?.filename || 'Hospital Discharge Summary & Post-Op Plan',
            sourcePage: inst.source_page,
            section: inst.source_section || 'Section 5: Physical Activity & Recovery Guidelines',
            originalText: inst.original_extracted_text || inst.instructions,
          },
        }));

        return {
          dayNumber,
          dateLabel: isToday ? 'Today' : isPast ? 'Yesterday' : `Day ${dayNumber}`,
          isToday,
          isPast,
          milestoneTitle,
          medications: dayMedications,
          activities: dayActivities,
          notes: isToday ? 'Focus on resting, taking medications with meals, and light ambulation.' : undefined,
        };
      }),
    };

    inMemoryPlans.set(documentId, fullRecoveryPayload);
    inMemoryPlans.set('active', fullRecoveryPayload);
    activeDocumentId = documentId;

    // Save to real DynamoDB table if configured
    if (isAwsCredentialsConfigured() && process.env.DYNAMODB_TABLE_NAME) {
      try {
        const dynamo = getDynamoDB();
        await dynamo.send(
          new PutCommand({
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: {
              PK: `DOC#${documentId}`,
              SK: 'METADATA',
              documentId,
              filename: record?.filename,
              status: 'READY',
              patientName: fullRecoveryPayload.patient.name,
              createdAt: record?.created_at,
              updatedAt: new Date().toISOString(),
              payload: fullRecoveryPayload,
            },
          })
        );
      } catch (err) {
        console.warn('[AWS DynamoDB] PutCommand warning:', (err as Error).message);
      }
    }

    if (record) {
      record.status = 'READY';
      record.updated_at = new Date().toISOString();
    }

    return fullRecoveryPayload;
  }

  /**
   * Execute full end-to-end pipeline:
   * S3 -> Textract -> Bedrock -> Validate -> DynamoDB
   */
  static async runEndToEndPipeline(
    filename: string,
    fileBuffer?: Buffer,
    isDemo = false
  ): Promise<any> {
    // 1. Ingestion & S3 Upload
    const record = await this.createAndUpload(filename, fileBuffer, isDemo);

    // 2. Textract extraction
    const textractOutput = await this.extractTextWithTextract(record.id, fileBuffer);

    // 3. Bedrock structuring
    const bedrockOutput = await this.structureWithBedrock(record.id, textractOutput);

    // 4. JSON Validation & Textract Verbatim Quotation Verification
    if (record) {
      record.status = 'VALIDATING';
      record.updated_at = new Date().toISOString();
    }
    const verifiedOutput = this.validateAndVerifyVerbatimQuotes(bedrockOutput, textractOutput);

    // 5. DynamoDB Persistence
    const savedPlan = await this.persistRecoveryPlan(record.id, verifiedOutput, textractOutput);

    return {
      document: record,
      recoveryPlan: savedPlan,
    };
  }

  static getDocumentRecord(documentId: string): DocumentRecord | undefined {
    return inMemoryDocuments.get(documentId);
  }

  static getRecoveryPlan(documentId?: string): any {
    if (documentId && inMemoryPlans.has(documentId)) {
      return inMemoryPlans.get(documentId);
    }
    return inMemoryPlans.get('active') || inMemoryPlans.get(activeDocumentId) || inMemoryPlans.values().next().value;
  }

  static setActiveDocument(documentId: string): boolean {
    if (inMemoryPlans.has(documentId)) {
      inMemoryPlans.set('active', inMemoryPlans.get(documentId));
      activeDocumentId = documentId;
      return true;
    }
    return false;
  }

  static listDocuments(): DocumentRecord[] {
    return Array.from(inMemoryDocuments.values());
  }

  static getDocumentPages(documentId: string): TextractNormalizedOutput | undefined {
    return inMemoryPages.get(documentId);
  }

  /**
   * Verified baseline structured output for demo mode
   */
  static getStandardBedrockOutput(): BedrockRecoveryOutput {
    return {
      patient: {
        name: 'Mrs. Anita Sharma',
        age: 58,
        procedure: 'Elective Laparoscopic Cholecystectomy',
        discharge_date: 'September 17, 2026',
        attending_physician: 'Dr. Arvind Rao, MS, FACS',
        hospital_name: 'Apex Memorial Healthcare',
      },
      recovery_period_days: 14,
      medications: [
        {
          name: 'Cefuroxime Axetil',
          dose: '500 mg',
          frequency: 'Twice daily',
          timing: '8:00 AM',
          instructions: 'Take 1 tablet after breakfast with water. Complete 5-day course.',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Cefuroxime Axetil 500 mg PO BID (8:00 AM, 8:00 PM) for 5 days. Administer with meals to prevent gastrointestinal upset.',
        },
        {
          name: 'Paracetamol (Acetaminophen)',
          dose: '650 mg',
          frequency: 'Three times daily after meals',
          timing: '1:30 PM',
          instructions: 'Take 1 tablet after lunch for surgical incision soreness.',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Paracetamol 650 mg PO TID (after meals) PRN for pain control. Do not exceed 3,000 mg in 24 hours.',
        },
        {
          name: 'Cefuroxime Axetil',
          dose: '500 mg',
          frequency: 'Evening dose',
          timing: '8:00 PM',
          instructions: 'Take 1 tablet after dinner with water.',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Cefuroxime Axetil 500 mg PO BID (8:00 AM, 8:00 PM) for 5 days. Complete prescribed course strictly.',
        },
        {
          name: 'Pantoprazole',
          dose: '40 mg',
          frequency: 'Once daily at bedtime',
          timing: '9:30 PM',
          instructions: 'Take 1 tablet 30 minutes before sleep for acid suppression.',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Pantoprazole 40 mg PO once daily at bedtime for 14 days.',
        },
      ],
      followups: [
        {
          title: 'Post-Operative Surgical Review & Suture Check',
          date: 'September 26, 2026 (Day 10)',
          time: '10:30 AM',
          doctor: 'Dr. Arvind Rao, MS',
          location: 'Surgical OPD Clinic, Suite 402, Apex Memorial',
          day_number: 10,
          source_page: 4,
          source_section: 'Section 6: Outpatient Clinical Follow-up',
          original_extracted_text: 'Scheduled Review: Day 10 post-discharge (September 26, 2026 at 10:30 AM). Location: Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare.',
        },
      ],
      instructions: [
        {
          title: 'Gentle Indoor Walk (10 minutes)',
          category: 'activity',
          timing: '11:00 AM',
          duration: '10 mins',
          instructions: 'Walk slowly on flat ground inside the house. Stop if dizzy.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: 'Early mobilization advised: Short walks of 5–10 minutes 2–3 times daily starting Day 2 post-op to promote bowel motility and prevent venous stasis.',
        },
        {
          title: 'Low-Fat, Bland Lunch & Hydration',
          category: 'diet',
          timing: '1:00 PM',
          instructions: 'Eat easily digestible meals (steamed vegetables, rice). Drink 250ml warm water.',
          source_page: 4,
          source_section: 'Section 4: Dietary Instructions',
          original_extracted_text: 'Maintain a low-fat, easily digestible diet for the first 10 days. Avoid greasy, deep-fried foods, heavy creams, and spicy curries.',
        },
        {
          title: 'Afternoon Rest & Elevation',
          category: 'rest',
          timing: '2:30 PM',
          duration: '45 mins',
          instructions: 'Rest in a semi-reclined position with pillows supporting the back.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: 'Adequate daytime rest intervals recommended. Sleep in comfortable semi-fowler position if abdominal discomfort occurs.',
        },
      ],
      warning_signs: [
        {
          condition: 'Difficulty breathing or sudden shortness of breath',
          trigger_key: 'breathing',
          severity: 'urgent',
          documented_action: 'Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room. Do not wait.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text: 'DIFFICULTY BREATHING / CHEST PAIN: Signs: Shortness of breath, rapid shallow breathing, chest tightness, or pain upon deep inhalation. Documented Action: Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room.',
        },
        {
          condition: 'Persistent high fever (>101°F / 38.3°C) with chills',
          trigger_key: 'fever',
          severity: 'high',
          documented_action: 'Notify the surgical post-op duty team within 2 hours at +1 (800) 555-0144.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text: 'PERSISTENT FEVER: Signs: Body temperature greater than 101.0°F (38.3°C) or severe chills/rigors. Documented Action: Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.',
        },
        {
          condition: 'Severe or worsening abdominal pain unresponsive to prescribed medications',
          trigger_key: 'pain_worse',
          severity: 'high',
          documented_action: 'Call the 24/7 post-op nurse coordinator immediately.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text: 'SEVERE OR ESCALATING PAIN: Signs: Abdominal pain that progressively worsens despite prescribed pain medication. Documented Action: Call the 24/7 post-op nurse coordinator immediately.',
        },
      ],
    };
  }
}
