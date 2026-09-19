import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketVersioningCommand,
} from '@aws-sdk/client-s3';
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import {
  CreateTopicCommand,
  SubscribeCommand,
  ListTopicsCommand,
} from '@aws-sdk/client-sns';
import {
  getS3,
  getRawDynamoDB,
  getSNS,
  getLocalStackEndpoint,
  checkLocalStackConnectivity,
} from '../awsClient';

async function main() {
  console.log('================================================================');
  console.log('CarePath LocalStack Infrastructure Initializer');
  console.log(`Target LocalStack Endpoint: ${getLocalStackEndpoint()}`);
  console.log('================================================================\n');

  const isConnected = await checkLocalStackConnectivity();
  if (!isConnected) {
    console.warn('⚠️  LocalStack is currently NOT running or unreachable at ' + getLocalStackEndpoint());
    console.log('💡 To start LocalStack, run:');
    console.log('   docker compose up -d');
    console.log('\nCarePath will continue running with resilient local in-memory fallback.\n');
    return;
  }

  const s3 = getS3();
  const dynamo = getRawDynamoDB();
  const sns = getSNS();

  // 1. Initialize S3 Bucket
  const bucketName = process.env.S3_BUCKET_NAME || 'carepath-documents';
  console.log(`[1/3] Setting up S3 Bucket: ${bucketName}...`);
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log(`  ✓ Bucket '${bucketName}' created successfully.`);
  } catch (err: any) {
    if (err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists') {
      console.log(`  ✓ Bucket '${bucketName}' already exists.`);
    } else {
      console.error(`  ✗ S3 Bucket error: ${err.message}`);
    }
  }

  try {
    await s3.send(
      new PutBucketVersioningCommand({
        Bucket: bucketName,
        VersioningConfiguration: { Status: 'Enabled' },
      })
    );
    console.log(`  ✓ Versioning enabled on '${bucketName}'.`);
  } catch (err: any) {
    console.warn(`  ⚠️ Versioning notice: ${err.message}`);
  }

  // 2. Initialize DynamoDB Tables
  console.log('\n[2/3] Setting up DynamoDB Tables...');
  const tables = [
    {
      name: process.env.DYNAMODB_TABLE_PATIENTS || 'carepath-patients',
      pk: 'patientId',
      sk: null,
    },
    {
      name: process.env.DYNAMODB_TABLE_DOCUMENTS || 'carepath-documents',
      pk: 'documentId',
      sk: null,
    },
    {
      name: process.env.DYNAMODB_TABLE_TASKS || 'carepath-tasks',
      pk: 'PK',
      sk: 'SK',
    },
    {
      name: process.env.DYNAMODB_TABLE_CHECKINS || 'carepath-checkins',
      pk: 'PK',
      sk: 'SK',
    },
  ];

  for (const table of tables) {
    try {
      const attributeDefinitions: Array<{ AttributeName: string; AttributeType: 'S' }> = [
        { AttributeName: table.pk, AttributeType: 'S' },
      ];
      const keySchema: Array<{ AttributeName: string; KeyType: 'HASH' | 'RANGE' }> = [
        { AttributeName: table.pk, KeyType: 'HASH' },
      ];

      if (table.sk) {
        attributeDefinitions.push({ AttributeName: table.sk, AttributeType: 'S' });
        keySchema.push({ AttributeName: table.sk, KeyType: 'RANGE' });
      }

      await dynamo.send(
        new CreateTableCommand({
          TableName: table.name,
          AttributeDefinitions: attributeDefinitions,
          KeySchema: keySchema,
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
      console.log(`  ✓ Table '${table.name}' created.`);
    } catch (err: any) {
      if (err instanceof ResourceInUseException || err.name === 'ResourceInUseException') {
        console.log(`  ✓ Table '${table.name}' already exists.`);
      } else {
        console.error(`  ✗ Error creating table '${table.name}':`, err.message);
      }
    }
  }

  // 3. Initialize SNS Topic
  const topicName = process.env.SNS_TOPIC_NAME || 'carepath-caregiver-alerts';
  console.log(`\n[3/3] Setting up SNS Topic: ${topicName}...`);
  try {
    const topicRes = await sns.send(new CreateTopicCommand({ Name: topicName }));
    const topicArn = topicRes.TopicArn;
    console.log(`  ✓ SNS Topic created. ARN: ${topicArn}`);

    if (topicArn) {
      await sns.send(
        new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: 'caregiver-simulator@carepath.local',
        })
      );
      console.log(`  ✓ Subscribed test endpoint: caregiver-simulator@carepath.local`);
    }
  } catch (err: any) {
    console.error(`  ✗ Error setting up SNS topic:`, err.message);
  }

  console.log('\n================================================================');
  console.log('✅ LocalStack initialization complete!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
