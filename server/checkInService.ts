import { DocumentService } from './documentService';
import { StorageService } from './storage/storageService';
import { NotificationService, CaregiverAlertRecord } from './notification/notificationService';

export interface CheckInSubmission {
  dayNumber: number;
  pain: 'better' | 'same' | 'worse';
  fever: 'no' | 'yes';
  breathing: 'normal' | 'difficult';
  notes?: string;
  documentId?: string;
}

export interface CheckInRecordResponse {
  id: string;
  timestamp: string;
  dayNumber: number;
  pain: 'better' | 'same' | 'worse';
  fever: 'no' | 'yes';
  breathing: 'normal' | 'difficult';
  notes?: string;
  warningMatched: boolean;
  matchedWarningSign?: any;
  snsNotification?: {
    published: boolean;
    messageId?: string;
    topicArn?: string;
    detail: string;
    isRealSms: false;
  };
}

const inMemoryCheckIns = new Map<string, CheckInRecordResponse[]>();

export class CheckInService {
  /**
   * Deterministic matching against Page 5 documented warnings
   */
  static matchWarningSign(
    submission: CheckInSubmission,
    warningSigns: any[]
  ): any | null {
    if (submission.breathing === 'difficult') {
      return (
        warningSigns.find((w) => w.triggerKey === 'breathing') || {
          condition: 'Difficulty breathing or shortness of breath',
          triggerKey: 'breathing',
          severity: 'urgent',
          documentedAction:
            'Call the hospital emergency line immediately (+1 800 555-0199) or proceed to Emergency Room.',
          sourcePage: 5,
        }
      );
    }

    if (submission.fever === 'yes') {
      return (
        warningSigns.find((w) => w.triggerKey === 'fever') || {
          condition: 'Persistent high fever (>101°F / 38.3°C)',
          triggerKey: 'fever',
          severity: 'high',
          documentedAction:
            'Notify the surgical post-op team within 2 hours at +1 (800) 555-0144.',
          sourcePage: 5,
        }
      );
    }

    if (submission.pain === 'worse') {
      return (
        warningSigns.find((w) => w.triggerKey === 'pain_worse') || {
          condition: 'Severe or worsening abdominal pain',
          triggerKey: 'pain_worse',
          severity: 'high',
          documentedAction:
            'Call the 24/7 post-op nurse coordinator immediately.',
          sourcePage: 5,
        }
      );
    }

    return null;
  }

  /**
   * Dispatch SNS Alert to Caregiver using NotificationService
   */
  static async sendSnsAlert(
    submission: CheckInSubmission,
    matchedWarning: any,
    patientName = 'Patient',
    caregiverPhone = '+1 (800) 555-0199'
  ): Promise<{ published: boolean; messageId?: string; topicArn?: string; detail: string; isRealSms: false }> {
    const alertResult = await NotificationService.publishCaregiverAlert({
      patientName,
      caregiverPhone,
      dayNumber: submission.dayNumber,
      symptom: matchedWarning.condition,
      severity: matchedWarning.severity || 'high',
      documentedAction: matchedWarning.documentedAction,
      sourcePage: matchedWarning.sourcePage || 5,
    });

    return {
      published: alertResult.published,
      messageId: alertResult.messageId,
      topicArn: alertResult.topicArn,
      detail: alertResult.detail,
      isRealSms: false,
    };
  }

  /**
   * Record Check-In, Match Warnings & Dispatch SNS
   */
  static async recordCheckIn(
    submission: CheckInSubmission
  ): Promise<CheckInRecordResponse> {
    const activePlan = DocumentService.getRecoveryPlan(
      submission.documentId || 'active'
    );
    const targetDocId = activePlan?.documentId || submission.documentId || 'active';
    const warningSigns = activePlan?.warningSigns || [];
    const matchedWarning = this.matchWarningSign(submission, warningSigns);

    const now = new Date();
    const formattedTime = `Today, ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    let snsResult;
    if (matchedWarning) {
      const patientName = activePlan?.patient?.name || 'Patient';
      const caregiverPhone =
        activePlan?.patient?.caregiver?.phone ||
        activePlan?.patient?.emergencyContact?.phone ||
        '+1 (800) 555-0199';
      snsResult = await this.sendSnsAlert(submission, matchedWarning, patientName, caregiverPhone);
    }

    const checkInRecord: CheckInRecordResponse = {
      id: `checkin-${Date.now()}`,
      timestamp: formattedTime,
      dayNumber: submission.dayNumber,
      pain: submission.pain,
      fever: submission.fever,
      breathing: submission.breathing,
      notes: submission.notes,
      warningMatched: Boolean(matchedWarning),
      matchedWarningSign: matchedWarning || undefined,
      snsNotification: snsResult,
    };

    if (!inMemoryCheckIns.has(targetDocId)) {
      inMemoryCheckIns.set(targetDocId, this.getHistory(targetDocId));
    }
    inMemoryCheckIns.get(targetDocId)!.unshift(checkInRecord);

    // Persist check-in using StorageService (LocalStack DynamoDB or local memory fallback)
    await StorageService.saveCheckIn(checkInRecord);

    return checkInRecord;
  }

  static getHistory(documentId?: string): CheckInRecordResponse[] {
    const activePlan = DocumentService.getRecoveryPlan(documentId);
    const targetDocId = activePlan?.documentId || documentId || 'active';
    const list = inMemoryCheckIns.get(targetDocId);
    if (list && list.length > 0) return list;

    const initialRecord: CheckInRecordResponse = {
      id: `checkin-init-${targetDocId}`,
      timestamp: 'Day 1 Post-Op, 8:30 PM',
      dayNumber: 1,
      pain: 'same',
      fever: 'no',
      breathing: 'normal',
      notes: 'Discharged from hospital, resting comfortably.',
      warningMatched: false,
    };
    inMemoryCheckIns.set(targetDocId, [initialRecord]);
    return inMemoryCheckIns.get(targetDocId)!;
  }
}
