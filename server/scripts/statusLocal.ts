import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ListTopicsCommand } from '@aws-sdk/client-sns';
import {
  getS3,
  getRawDynamoDB,
  getSNS,
  getLocalStackEndpoint,
  checkLocalStackConnectivity,
} from '../awsClient';

async function main() {
  console.log('================================================================');
  console.log('CarePath LocalStack Status Inspector');
  console.log(`Endpoint: ${getLocalStackEndpoint()}`);
  console.log('================================================================\n');

  const isConnected = await checkLocalStackConnectivity();
  console.log(`LocalStack Gateway Connectivity: ${isConnected ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

  if (!isConnected) {
    console.log('\nLocalStack is not currently reachable at ' + getLocalStackEndpoint());
    console.log('Status: App is operating in resilient LOCAL_DEMO_FALLBACK mode.');
    console.log('To start LocalStack: docker compose up -d');
    return;
  }

  const s3 = getS3();
  const dynamo = getRawDynamoDB();
  const sns = getSNS();

  console.log('\n[1] Amazon S3 Buckets:');
  try {
    const s3Res = await s3.send(new ListBucketsCommand({}));
    if (s3Res.Buckets && s3Res.Buckets.length > 0) {
      for (const b of s3Res.Buckets) {
        console.log(`  - ${b.Name} (Created: ${b.CreationDate?.toISOString()})`);
      }
    } else {
      console.log('  (No buckets found)');
    }
  } catch (err: any) {
    console.error(`  ✗ S3 query error: ${err.message}`);
  }

  console.log('\n[2] Amazon DynamoDB Tables:');
  try {
    const dynamoRes = await dynamo.send(new ListTablesCommand({}));
    if (dynamoRes.TableNames && dynamoRes.TableNames.length > 0) {
      for (const t of dynamoRes.TableNames) {
        console.log(`  - ${t}`);
      }
    } else {
      console.log('  (No tables found)');
    }
  } catch (err: any) {
    console.error(`  ✗ DynamoDB query error: ${err.message}`);
  }

  console.log('\n[3] Amazon SNS Topics:');
  try {
    const snsRes = await sns.send(new ListTopicsCommand({}));
    if (snsRes.Topics && snsRes.Topics.length > 0) {
      for (const t of snsRes.Topics) {
        console.log(`  - ${t.TopicArn}`);
      }
    } else {
      console.log('  (No topics found)');
    }
  } catch (err: any) {
    console.error(`  ✗ SNS query error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('Inspection complete.');
  console.log('================================================================\n');
}

main().catch(console.error);
