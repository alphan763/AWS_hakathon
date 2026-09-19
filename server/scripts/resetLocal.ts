import {
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DeleteTopicCommand, ListTopicsCommand } from '@aws-sdk/client-sns';
import {
  getS3,
  getRawDynamoDB,
  getSNS,
  checkLocalStackConnectivity,
} from '../awsClient';

async function main() {
  console.log('================================================================');
  console.log('CarePath LocalStack Resource Reset / Purge');
  console.log('================================================================\n');

  const isConnected = await checkLocalStackConnectivity();
  if (!isConnected) {
    console.warn('⚠️  LocalStack is offline. Reset skipped.');
    return;
  }

  const s3 = getS3();
  const dynamo = getRawDynamoDB();
  const sns = getSNS();
  const bucketName = process.env.S3_BUCKET_NAME || 'carepath-documents';

  // 1. Empty and Delete S3 Bucket
  console.log(`[1/3] Purging S3 Bucket '${bucketName}'...`);
  try {
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
    if (listRes.Contents && listRes.Contents.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listRes.Contents.map((obj) => ({ Key: obj.Key! })),
          },
        })
      );
      console.log(`  ✓ Emptied ${listRes.Contents.length} objects.`);
    }
    await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
    console.log(`  ✓ Bucket '${bucketName}' deleted.`);
  } catch (err: any) {
    console.warn(`  ⚠️ S3 purge notice: ${err.message}`);
  }

  // 2. Delete DynamoDB Tables
  console.log('\n[2/3] Deleting DynamoDB Tables...');
  const tables = [
    process.env.DYNAMODB_TABLE_PATIENTS || 'carepath-patients',
    process.env.DYNAMODB_TABLE_DOCUMENTS || 'carepath-documents',
    process.env.DYNAMODB_TABLE_TASKS || 'carepath-tasks',
    process.env.DYNAMODB_TABLE_CHECKINS || 'carepath-checkins',
  ];

  for (const t of tables) {
    try {
      await dynamo.send(new DeleteTableCommand({ TableName: t }));
      console.log(`  ✓ Deleted table '${t}'.`);
    } catch (err: any) {
      console.warn(`  ⚠️ DynamoDB notice for '${t}': ${err.message}`);
    }
  }

  // 3. Delete SNS Topic
  console.log('\n[3/3] Purging SNS Topic...');
  try {
    const topicsRes = await sns.send(new ListTopicsCommand({}));
    const targetTopic = topicsRes.Topics?.find((top) =>
      top.TopicArn?.includes('carepath-caregiver-alerts')
    );
    if (targetTopic?.TopicArn) {
      await sns.send(new DeleteTopicCommand({ TopicArn: targetTopic.TopicArn }));
      console.log(`  ✓ Deleted SNS topic: ${targetTopic.TopicArn}`);
    }
  } catch (err: any) {
    console.warn(`  ⚠️ SNS notice: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('✅ Purge complete! Run `npm run local:init` to recreate fresh resources.');
  console.log('================================================================\n');
}

main().catch(console.error);
