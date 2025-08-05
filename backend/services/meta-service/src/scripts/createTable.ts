import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMO_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || 'fake',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || 'fake'
  }
});

const tableName = process.env.DYNAMO_TABLE || 'ImageMetadata';

const run = async () => {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`Table "${tableName}" already exists.`);
  } catch (err: any) {
    if (err.name === 'ResourceNotFoundException') {
      await client.send(new CreateTableCommand({
        TableName: tableName,
        KeySchema: [{ AttributeName: 'imageId', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'imageId', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log(`Table "${tableName}" created successfully.`);
    } else {
      console.error('Failed to check/create table:', err);
    }
  }
};

run();
