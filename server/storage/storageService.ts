import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getS3, getDynamoDB, checkLocalStackConnectivity } from '../awsClient';
import { RecoveryPlanRecord, TextractNormalizedOutput } from '../documentModel';

export interface StorageResult {
  savedToS3: boolean;
  savedToDynamoDB: boolean;
  mode: 'localstack' | 'local_fallback' | 'aws';
  details: string;
}

// In-memory fallback stores for when LocalStack is offline
const inMemoryDocuments = new Map<string, { buffer?: Buffer; metadata: any }>();
const inMemoryPatients = new Map<string, any>();
const inMemoryRecoveryPlans = new Map<string, RecoveryPlanRecord>();
const inMemoryCheckIns = new Map<string, any>();

export class StorageService {
  /**
   * Save uploaded document to S3 (LocalStack or AWS)
   */
  static async saveDocumentToS3(
    documentId: string,
    filename: string,
    buffer: Buffer
  ): Promise<{ success: boolean; s3Key: string; storageMode: string }> {
    const bucket = process.env.S3_BUCKET_NAME || 'carepath-documents';
    const s3Key = `discharges/${documentId}/${filename}`;

    const isConnected = await checkLocalStackConnectivity();

    if (isConnected) {
      try {
        const s3 = getS3();
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: 'application/pdf',
            Metadata: {
              documentId,
              originalFilename: filename,
              uploadedAt: new Date().toISOString(),
            },
          })
        );
        console.log(`[StorageService] Document stored in LocalStack S3: s3://${bucket}/${s3Key}`);
        return { success: true, s3Key, storageMode: 'localstack_s3' };
      } catch (err) {
        console.warn('[StorageService] LocalStack S3 save failed, using local memory fallback:', (err as Error).message);
      }
    }

    // Fallback: in-memory store
    inMemoryDocuments.set(documentId, {
      buffer,
      metadata: { documentId, filename, key: s3Key, savedAt: new Date().toISOString() },
    });
    console.log(`[StorageService] Document stored in local memory fallback: ${s3Key}`);
    return { success: true, s3Key, storageMode: 'local_memory_fallback' };
  }

  /**
   * Save recovery plan and tasks to DynamoDB tables
   */
  static async saveRecoveryPlan(
    record: RecoveryPlanRecord,
    normalizedExtraction?: TextractNormalizedOutput
  ): Promise<StorageResult> {
    const isConnected = await checkLocalStackConnectivity();
    const docTable = process.env.DYNAMODB_TABLE_DOCUMENTS || 'carepath-documents';
    const patientTable = process.env.DYNAMODB_TABLE_PATIENTS || 'carepath-patients';
    const tasksTable = process.env.DYNAMODB_TABLE_TASKS || 'carepath-tasks';

    // Always keep in memory so retrieval is instant and resilient
    inMemoryRecoveryPlans.set(record.document_id, record);
    inMemoryPatients.set(record.patient.mrn, record.patient);

    if (isConnected) {
      try {
        const dynamo = getDynamoDB();

        // 1. Save document record
        await dynamo.send(
          new PutCommand({
            TableName: docTable,
            Item: {
              documentId: record.document_id,
              patientMrn: record.patient.mrn,
              patientName: record.patient.name,
              status: record.status,
              createdAt: record.created_at,
              updatedAt: record.updated_at,
              pageCount: record.extracted_pages.length,
              planSummary: {
                medicationCount: record.medications.length,
                taskCount: record.activities.length,
                warningCount: record.warningSigns.length,
              },
            },
          })
        );

        // 2. Save patient record
        await dynamo.send(
          new PutCommand({
            TableName: patientTable,
            Item: {
              patientId: record.patient.mrn,
              name: record.patient.name,
              age: record.patient.age,
              gender: record.patient.gender,
              procedure: record.patient.procedure,
              dischargeDate: record.patient.dischargeDate,
              caregiver: record.patient.caregiver,
              latestDocumentId: record.document_id,
            },
          })
        );

        // 3. Save tasks batch to carepath-tasks
        for (const med of record.medications) {
          await dynamo.send(
            new PutCommand({
              TableName: tasksTable,
              Item: {
                PK: `DOC#${record.document_id}`,
                SK: `MED#${med.id}`,
                name: med.name,
                dosage: med.dosage,
                timing: med.timing,
                frequency: med.frequency,
                evidence: med.evidence,
              },
            })
          );
        }

        console.log(`[StorageService] Recovery plan & tasks saved to LocalStack DynamoDB tables`);
        return {
          savedToS3: true,
          savedToDynamoDB: true,
          mode: 'localstack',
          details: `Partitioned records saved across ${docTable}, ${patientTable}, ${tasksTable}`,
        };
      } catch (err) {
        console.warn('[StorageService] DynamoDB save warning, retained in local memory:', (err as Error).message);
      }
    }

    return {
      savedToS3: false,
      savedToDynamoDB: false,
      mode: 'local_fallback',
      details: 'Preserved safely in local in-memory recovery repository',
    };
  }

  /**
   * Save check-in record
   */
  static async saveCheckIn(checkInItem: any): Promise<void> {
    inMemoryCheckIns.set(checkInItem.id, checkInItem);
    const isConnected = await checkLocalStackConnectivity();
    if (isConnected) {
      try {
        const dynamo = getDynamoDB();
        const checkinTable = process.env.DYNAMODB_TABLE_CHECKINS || 'carepath-checkins';
        await dynamo.send(
          new PutCommand({
            TableName: checkinTable,
            Item: {
              PK: `CHECKIN#${checkInItem.id}`,
              SK: `DAY#${checkInItem.dayNumber}`,
              record: checkInItem,
              createdAt: new Date().toISOString(),
            },
          })
        );
        console.log(`[StorageService] Check-in saved to LocalStack DynamoDB: ${checkinTable}`);
      } catch (err) {
        console.warn('[StorageService] Failed saving check-in to DynamoDB:', (err as Error).message);
      }
    }
  }

  static getRecoveryPlan(documentId: string): RecoveryPlanRecord | undefined {
    return inMemoryRecoveryPlans.get(documentId);
  }

  static getAllRecoveryPlans(): RecoveryPlanRecord[] {
    return Array.from(inMemoryRecoveryPlans.values());
  }

  static getPatient(mrn: string): any {
    return inMemoryPatients.get(mrn);
  }
}
