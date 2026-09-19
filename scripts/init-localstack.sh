#!/bin/bash
set -eo pipefail

echo "=========================================================="
echo "Initializing CarePath LocalStack AWS Resources (us-east-1)"
echo "=========================================================="

export AWS_DEFAULT_REGION="us-east-1"
export AWS_REGION="us-east-1"

# 1. Create S3 Bucket for Document Ingestion
echo "[1/4] Creating S3 Bucket: carepath-documents..."
awslocal s3 mb s3://carepath-documents || true

# Enable versioning on the bucket for safety
awslocal s3api put-bucket-versioning \
  --bucket carepath-documents \
  --versioning-configuration Status=Enabled || true

# 2. Create DynamoDB Tables
echo "[2/4] Creating DynamoDB Tables..."

# 2.1 carepath-patients (PK: patientId)
awslocal dynamodb create-table \
  --table-name carepath-patients \
  --attribute-definitions AttributeName=patientId,AttributeType=S \
  --key-schema AttributeName=patientId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST || true

# 2.2 carepath-documents (PK: documentId)
awslocal dynamodb create-table \
  --table-name carepath-documents \
  --attribute-definitions AttributeName=documentId,AttributeType=S \
  --key-schema AttributeName=documentId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST || true

# 2.3 carepath-tasks (Composite PK: PK, SK)
awslocal dynamodb create-table \
  --table-name carepath-tasks \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || true

# 2.4 carepath-checkins (Composite PK: PK, SK)
awslocal dynamodb create-table \
  --table-name carepath-checkins \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST || true

# 3. Create SNS Topic for Caregiver Alerts
echo "[3/4] Creating SNS Topic: carepath-caregiver-alerts..."
awslocal sns create-topic \
  --name carepath-caregiver-alerts || true

# Subscribe a dummy endpoint (mock subscriber)
TOPIC_ARN=$(awslocal sns list-topics --query "Topics[?contains(TopicArn, 'carepath-caregiver-alerts')].TopicArn" --output text || echo "arn:aws:sns:us-east-1:000000000000:carepath-caregiver-alerts")

awslocal sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol email \
  --notification-endpoint caregiver-simulator@carepath.local || true

echo "[4/4] Verification of LocalStack Resources:"
echo "--- S3 Buckets ---"
awslocal s3 ls
echo "--- DynamoDB Tables ---"
awslocal dynamodb list-tables --output text
echo "--- SNS Topics ---"
awslocal sns list-topics --output text

echo "=========================================================="
echo "CarePath LocalStack initialization complete!"
echo "=========================================================="
