import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  getS3,
  getDynamoDB,
  checkLocalStackConnectivity,
} from '../awsClient';
import { DEMO_SURGICAL_PAGES } from '../extraction/localExtractionService';

async function main() {
  console.log('================================================================');
  console.log('CarePath Local Data Seeder (Anita Sharma - Laparoscopic Cholecystectomy)');
  console.log('================================================================\n');

  const isConnected = await checkLocalStackConnectivity();
  if (!isConnected) {
    console.warn('⚠️  LocalStack is offline. Seeding in-memory store instead.');
    console.log('Run `docker compose up -d` to spin up LocalStack.\n');
    return;
  }

  const s3 = getS3();
  const dynamo = getDynamoDB();
  const bucket = process.env.S3_BUCKET_NAME || 'carepath-documents';

  // 1. Upload sample discharge text to S3
  const docId = 'doc-amh9921408';
  const samplePdfContent = DEMO_SURGICAL_PAGES.map(
    (p) => `=== PAGE ${p.page_number} ===\n${p.text}`
  ).join('\n\n');

  console.log(`[1/3] Seeding S3 with discharge packet: s3://${bucket}/discharges/${docId}/discharge_summary.txt`);
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `discharges/${docId}/discharge_summary.txt`,
        Body: Buffer.from(samplePdfContent, 'utf-8'),
        ContentType: 'text/plain',
        Metadata: {
          patientName: 'Mrs. Anita Sharma',
          mrn: '#AMH-9921408',
          procedure: 'Elective Laparoscopic Cholecystectomy',
        },
      })
    );
    console.log('  ✓ S3 seed successful.');
  } catch (err: any) {
    console.error('  ✗ S3 seed error:', err.message);
  }

  // 2. Seed Patient into carepath-patients
  console.log('\n[2/3] Seeding patient profile into carepath-patients...');
  try {
    await dynamo.send(
      new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_PATIENTS || 'carepath-patients',
        Item: {
          patientId: '#AMH-9921408',
          name: 'Mrs. Anita Sharma',
          age: 58,
          gender: 'Female',
          procedure: 'Elective Laparoscopic Cholecystectomy',
          dischargeDate: 'September 17, 2026',
          hospitalName: 'Apex Memorial Healthcare',
          attendingPhysician: 'Dr. Arvind Rao, MS, FACS',
          caregiver: {
            name: 'Pooja Sharma (Daughter)',
            phone: '+1 (800) 555-0199',
            relationship: 'Primary post-op support',
          },
        },
      })
    );
    console.log('  ✓ Patient record seeded.');
  } catch (err: any) {
    console.error('  ✗ Patient seed error:', err.message);
  }

  // 3. Seed tasks into carepath-tasks
  console.log('\n[3/3] Seeding recovery medications & tasks into carepath-tasks...');
  const tasks = [
    {
      PK: `DOC#${docId}`,
      SK: 'MED#cefuroxime-500',
      type: 'medication',
      name: 'Cefuroxime Axetil',
      dose: '500 mg',
      frequency: 'Twice daily (every 12 hours)',
      timing: '8:00 AM',
      instructions: 'Take with food and full glass of water. Complete 5-day course.',
      sourcePage: 3,
    },
    {
      PK: `DOC#${docId}`,
      SK: 'MED#paracetamol-650',
      type: 'medication',
      name: 'Paracetamol (Acetaminophen)',
      dose: '650 mg',
      frequency: 'Three times daily after meals as needed',
      timing: '1:30 PM',
      instructions: 'Do not exceed 3,000 mg in 24 hours.',
      sourcePage: 3,
    },
    {
      PK: `DOC#${docId}`,
      SK: 'MED#pantoprazole-40',
      type: 'medication',
      name: 'Pantoprazole',
      dose: '40 mg',
      frequency: 'Once daily before bedtime',
      timing: '9:30 PM',
      instructions: 'Take 30 minutes before sleep for 14 days.',
      sourcePage: 3,
    },
  ];

  for (const t of tasks) {
    try {
      await dynamo.send(
        new PutCommand({
          TableName: process.env.DYNAMODB_TABLE_TASKS || 'carepath-tasks',
          Item: t,
        })
      );
      console.log(`  ✓ Seeded: ${t.name}`);
    } catch (err: any) {
      console.error(`  ✗ Error seeding task ${t.name}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('✅ Local data seeding complete!');
  console.log('================================================================\n');
}

main().catch(console.error);
