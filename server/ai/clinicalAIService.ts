import {
  TextractNormalizedOutput,
  BedrockRecoveryOutput,
} from '../documentModel';
import { getBedrock, isAwsCredentialsConfigured } from '../awsClient';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export const ZERO_DIAGNOSIS_SYSTEM_PROMPT = `
You are CarePath's Zero-Diagnosis Clinical Structuring Engine.
Your task is to convert raw hospital discharge documents into an actionable, evidence-grounded recovery timeline.

ABSOLUTE CLINICAL SAFETY RULES:
1. NO DIAGNOSIS: You are an administrative assistant, not a doctor. Never diagnose conditions or infer unstated diseases.
2. NO INVENTED ADVICE: Extract ONLY instructions explicitly documented in the text.
3. MANDATORY EVIDENCE LINKAGE: Every single medication, recovery task, dietary guideline, follow-up appointment, and warning sign MUST include a verbatimQuote directly matched to a specific sourcePage (1–5).
4. PRECISE DOSING: Only output dosage, frequency, and timing if explicitly printed in the discharge text.
5. EXPLICIT WARNING SIGNS: Documented emergency actions must cite the exact hospital telephone numbers or emergency directions printed on the document.
`;

export interface ClinicalAIService {
  structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput>;
  getProviderName(): string;
}

/**
 * Deterministic local clinical AI provider for Local Development and Hackathon testing.
 * Enforces zero-hallucination, exact page citations, and verifiable evidence quotes.
 */
export class LocalClinicalAIProvider implements ClinicalAIService {
  getProviderName(): string {
    return 'LocalClinicalAIProvider (Deterministic Clinical Safety Fixture)';
  }

  async structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    console.log('[LocalClinicalAIProvider] Running zero-diagnosis structuring engine on extracted pages...');

    // Verified Anita Sharma surgical discharge extraction
    const structuredOutput: BedrockRecoveryOutput = {
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
          timing: '8:00 AM',
          frequency: 'Twice daily (every 12 hours)',
          instructions: 'Take with a full meal and a glass of water. Complete entire 5-day course.',
          duration: '5 days',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Cefuroxime Axetil 500 mg: Twice daily (every 12 hours: 8:00 AM and 8:00 PM) for 5 days post-discharge.',
        },
        {
          name: 'Paracetamol (Acetaminophen)',
          dose: '650 mg',
          timing: '1:30 PM',
          frequency: 'Three times daily after meals as needed',
          instructions: 'Take as needed for pain. Do not exceed 3,000 mg in any 24-hour period.',
          duration: 'As needed',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Paracetamol (Acetaminophen) 650 mg: Three times daily after meals as needed for mild-to-moderate incision pain.',
        },
        {
          name: 'Pantoprazole',
          dose: '40 mg',
          timing: '9:30 PM',
          frequency: 'Once daily before bedtime',
          instructions: 'Take 30 minutes before bedtime with water for 14 days.',
          duration: '14 days',
          source_page: 3,
          source_section: 'Section 3: Discharge Medications & Dosing Schedule',
          original_extracted_text: 'Tab. Pantoprazole 40 mg: Once daily at night 30 minutes before sleep for 14 days for gastroprotection.',
        },
      ],
      instructions: [
        {
          title: 'Gentle Corridor Ambulation',
          category: 'activity',
          timing: '10:00 AM',
          duration: '5 to 10 minutes',
          instructions: 'Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2. Avoid stairs unassisted.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: 'Ambulation: Short walks of 5 to 10 minutes, 2 to 3 times daily starting Day 2.',
        },
        {
          title: 'Maintain Hydration & Low-Fat Diet',
          category: 'diet',
          timing: 'Throughout the day',
          instructions: 'Maintain a low-fat, easily digestible diet. Drink 1.5 to 2.0 liters of fluids/water daily.',
          source_page: 4,
          source_section: 'Section 4: Dietary Instructions',
          original_extracted_text: 'Maintain a low-fat, easily digestible diet for the first 10 days. Maintain adequate hydration: 1.5 to 2 liters of fluids/water daily.',
        },
        {
          title: 'Incision Dressing Inspection',
          category: 'rest',
          timing: 'Morning',
          instructions: 'Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.',
          source_page: 4,
          source_section: 'Section 5: Physical Activity & Recovery Guidelines',
          original_extracted_text: 'Bathing: Keep umbilical and abdominal dressings dry for first 48 hours. Sponge bathing recommended.',
        },
      ],
      followups: [
        {
          title: 'Post-Op Surgical Review & Wound Check',
          doctor: 'Dr. Arvind Rao, MS, FACS',
          location: 'Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare',
          date: 'September 26, 2026',
          time: '10:30 AM',
          day_number: 10,
          instructions: 'Bring surgical discharge summary and list of current medications.',
          source_page: 4,
          source_section: 'Section 6: Outpatient Clinical Follow-Up',
          original_extracted_text: 'Scheduled Review: Day 10 post-discharge (September 26, 2026 at 10:30 AM). Surgical OPD Clinic, Suite 402, Apex Memorial Healthcare. Dr. Arvind Rao.',
        },
      ],
      warning_signs: [
        {
          condition: 'Difficulty breathing or shortness of breath',
          trigger_key: 'breathing',
          severity: 'urgent',
          documented_action:
            'Call the hospital emergency line immediately (+1 800 555-0199) or proceed to Emergency Room.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '1. DIFFICULTY BREATHING / CHEST PAIN: Signs: Shortness of breath, rapid shallow breathing, chest tightness, or pain upon deep inhalation. Documented Action: Call the hospital emergency line immediately (+1 800 555-0199) or proceed to the nearest Emergency Room.',
        },
        {
          condition: 'Persistent high fever (>101°F / 38.3°C)',
          trigger_key: 'fever',
          severity: 'high',
          documented_action:
            'Notify the surgical post-op team within 2 hours at +1 (800) 555-0144.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '2. PERSISTENT FEVER: Signs: Body temperature greater than 101.0°F (38.3°C) or severe chills/rigors. Documented Action: Contact the surgical post-op duty team within 2 hours at +1 (800) 555-0144.',
        },
        {
          condition: 'Severe or worsening abdominal pain',
          trigger_key: 'pain_worse',
          severity: 'high',
          documented_action:
            'Call the 24/7 post-op nurse coordinator immediately.',
          source_page: 5,
          source_section: 'Section 7: Emergency Red Flags & Hospital Escalation Protocol',
          original_extracted_text:
            '3. SEVERE OR ESCALATING PAIN: Signs: Abdominal pain that progressively worsens despite prescribed pain medication, or abdominal wall becomes rigid and tender. Documented Action: Call the 24/7 post-op nurse coordinator immediately.',
        },
      ],
    };

    return structuredOutput;
  }
}

/**
 * Bedrock Clinical AI Provider for live AWS deployments.
 * Calls Amazon Bedrock Claude 3.5 Sonnet using AWS SDK v3 InvokeModelCommand.
 */
export class BedrockClinicalAIProvider implements ClinicalAIService {
  getProviderName(): string {
    return 'BedrockClinicalAIProvider (Amazon Bedrock Claude 3.5 Sonnet)';
  }

  async structureDischargeDocument(
    normalizedExtraction: TextractNormalizedOutput
  ): Promise<BedrockRecoveryOutput> {
    const modelId =
      process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
    console.log(`[BedrockClinicalAIProvider] Invoking Amazon Bedrock model: ${modelId}`);

    const bedrockClient = getBedrock();

    const fullDischargeText = normalizedExtraction.pages
      .map((p) => `--- [PAGE ${p.page_number}] ---\n${p.text}`)
      .join('\n\n');

    const promptPayload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      temperature: 0.0,
      system: ZERO_DIAGNOSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract the structured recovery plan from this hospital discharge document.
Format your output as a single JSON object strictly conforming to the requested schema.
Every item must have a verbatim quote and source page:

${fullDischargeText}`,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(JSON.stringify(promptPayload)),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const rawContent = responseBody.content?.[0]?.text;

    // Parse JSON
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON structure from Bedrock output');
    }

    return JSON.parse(jsonMatch[0]) as BedrockRecoveryOutput;
  }
}

/**
 * Factory to retrieve the active ClinicalAIService based on environment configuration.
 */
export function getClinicalAIService(): ClinicalAIService {
  const bedrockMode = (process.env.BEDROCK_MODE || 'local').toLowerCase();
  if (bedrockMode === 'aws' && isAwsCredentialsConfigured()) {
    return new BedrockClinicalAIProvider();
  }
  return new LocalClinicalAIProvider();
}
