import { PublishCommand } from '@aws-sdk/client-sns';
import { getSNS, checkLocalStackConnectivity } from '../awsClient';

export interface CaregiverAlertRecord {
  id: string;
  timestamp: string;
  topicArn: string;
  messageId: string;
  symptom: string;
  severity: 'urgent' | 'high' | 'moderate';
  patientName: string;
  caregiverPhone: string;
  message: string;
  documentedAction: string;
  sourcePage: number;
  mode: 'localstack_sns' | 'local_simulator';
  isRealSms: false;
}

const alertLogHistory: CaregiverAlertRecord[] = [];

export class NotificationService {
  /**
   * Publish red-flag alert to SNS and log to simulator
   */
  static async publishCaregiverAlert(params: {
    patientName: string;
    caregiverPhone: string;
    dayNumber: number;
    symptom: string;
    severity: 'urgent' | 'high' | 'moderate';
    documentedAction: string;
    sourcePage: number;
  }): Promise<{
    published: boolean;
    messageId: string;
    topicArn: string;
    detail: string;
    record: CaregiverAlertRecord;
  }> {
    const topicArn =
      process.env.SNS_TOPIC_ARN ||
      'arn:aws:sns:us-east-1:000000000000:carepath-caregiver-alerts';

    const alertMessage = `[CarePath Safety Escalation] Attention Caregiver (${params.caregiverPhone}): Patient ${params.patientName} reported "${params.symptom}" on Day ${params.dayNumber}. This matches documented red flags on Page ${params.sourcePage}. Required hospital action: "${params.documentedAction}".`;

    // Console logging with mandatory clear disclaimer
    console.log('\n================================================================================');
    console.log('🚨 [LOCAL DEMO — NO REAL SMS SENT] Caregiver Alert published to carepath-caregiver-alerts');
    console.log(`Target Recipient: ${params.caregiverPhone}`);
    console.log(`Documented Symptom: ${params.symptom} (Page ${params.sourcePage})`);
    console.log(`Required Action: ${params.documentedAction}`);
    console.log('================================================================================\n');

    let messageId = `sim-sns-${Date.now()}`;
    let mode: 'localstack_sns' | 'local_simulator' = 'local_simulator';
    let detail = `Dispatched via Local Caregiver Alert Simulator (Recipient: ${params.caregiverPhone})`;

    const isConnected = await checkLocalStackConnectivity();
    if (isConnected) {
      try {
        const sns = getSNS();
        const response = await sns.send(
          new PublishCommand({
            TopicArn: topicArn,
            Subject: `CarePath Recovery Alert: Day ${params.dayNumber} Symptom Escalation`,
            Message: alertMessage,
          })
        );
        if (response.MessageId) {
          messageId = response.MessageId;
          mode = 'localstack_sns';
          detail = `Published to LocalStack SNS topic '${process.env.SNS_TOPIC_NAME || 'carepath-caregiver-alerts'}'`;
        }
      } catch (err) {
        console.warn('[NotificationService] LocalStack SNS publish error, using simulator log:', (err as Error).message);
      }
    }

    const record: CaregiverAlertRecord = {
      id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      topicArn,
      messageId,
      symptom: params.symptom,
      severity: params.severity,
      patientName: params.patientName,
      caregiverPhone: params.caregiverPhone,
      message: alertMessage,
      documentedAction: params.documentedAction,
      sourcePage: params.sourcePage,
      mode,
      isRealSms: false,
    };

    alertLogHistory.unshift(record);

    return {
      published: true,
      messageId,
      topicArn,
      detail,
      record,
    };
  }

  static getAlertHistory(): CaregiverAlertRecord[] {
    return alertLogHistory;
  }

  static clearHistory(): void {
    alertLogHistory.length = 0;
  }
}
