import express, { Request, Response } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { errorResponse } from './utils/errorResponse';

const router = express.Router();
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMO_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || 'fake',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || 'fake'
  }
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMO_TABLE || 'ImageMetadata';

router.post('/', async (req: Request, res: Response) => {
  const {
    imageId,
    title,
    description,
    fileSize,
    fileType,
    fileUrl,
    originalFilename,
    tags = []
  } = req.body;

  if (!imageId || !title || !fileSize || !fileType || !fileUrl) {
    return res.status(400).json(errorResponse('MISSING_FIELDS', 'Missing required fields'));
  }

  const now = new Date().toISOString();
  const item = {
    imageId,
    title,
    description,
    uploadDate: now,
    modificationDateMeta: null,
    fileSize,
    fileType,
    fileUrl,
    originalFilename,
    tags
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
    res.status(201).json({ message: 'Metadata saved', item });
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse('META_SAVE_FAILED', 'Failed to save metadata', err));
  }
});

router.get('/by-imageId', async (req: Request, res: Response) => {
  const { imageId } = req.query;
  if (!imageId) {
    return res.status(400).json(errorResponse('IMAGE_ID_REQUIRED', 'imageId is required'));
  }

  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { imageId },
    }));

    if (!result.Item) {
      return res.status(404).json(errorResponse('META_NOT_FOUND', 'Metadata not found for imageId'));
    }

    return res.json(result.Item);
  } catch (err) {
    console.error('Error in GET /meta/by-imageId:', err);
    res.status(500).json(errorResponse('FETCH_FAILED', 'Failed to fetch metadata', err));
  }
});

router.get('/', async (req: Request, res: Response) => {
  const {
    tagIds,
    includeDuplicates = 'false',
    sortBy = 'modificationDateMeta',
    sortOrder = 'desc',
    offset = 0,
    limit = 6
  } = req.query;

  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    let items = result.Items || [];

    if (tagIds) {
      const tags = (tagIds as string).split(',');
      items = items.filter(item => {
        const imageTags = item.tags?.map((t: any) => t.id) || [];
          return tags.some(tag => imageTags.includes(tag));
      });
    }

    if (includeDuplicates !== 'true') {
      const seen = new Set();
      items = items.filter(item => {
        const hash = `${item.originalFilename}_${item.fileSize}_${item.fileType}`;
        if (seen.has(hash)) return false;
        seen.add(hash);
        return true;
      });
    }

    items.sort((a, b) => {
      let aVal = a[sortBy as string];
      let bVal = b[sortBy as string];

      if (sortBy === 'modificationDateMeta') {
        aVal = a.modificationDateMeta || a.uploadDate;
        bVal = b.modificationDateMeta || b.uploadDate;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const start = parseInt(offset as string, 10) || 0;
    const pageSize = parseInt(limit as string, 10) || 10;
    const pagedItems = items.slice(start, start + pageSize);

    res.json({
      total: items.length,
      offset: start,
      limit: pageSize,
      items: pagedItems
    });

  } catch (err) {
    console.error('Error in GET /api/meta:', err);
    res.status(500).json(errorResponse('META_LIST_FAILED', 'Internal Server Error', err));
  }
});

router.patch('/:imageId', async (req: Request, res: Response) => {
  const imageId = req.params.imageId;
  const { title, description, tags } = req.body;

  try {
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { imageId }
    }));

    if (!existing.Item) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Metadata not found'));
    }

    if (existing.Item.lockFile) {
      return res.status(403).json(errorResponse('LOCKED', 'Metadata is locked and cannot be updated'));
    }

    const updateFields: Record<string, any> = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (tags !== undefined) updateFields.tags = tags;

    updateFields.modificationDateMeta = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { imageId },
      UpdateExpression: `SET ${Object.keys(updateFields).map((k, i) => `#f${i} = :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.fromEntries(Object.keys(updateFields).map((k, i) => [`#f${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(Object.values(updateFields).map((v, i) => [`:v${i}`, v]))
    }));

    const updatedItem = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { imageId } }));
    res.json({ message: 'Updated', item: updatedItem.Item });
  } catch (err) {
    console.error(err);
    res.status(500).json(errorResponse('META_UPDATE_FAILED', 'Failed to update metadata', err));
  }
});

router.delete('/:imageId', async (req: Request, res: Response) => {
  const { imageId } = req.params;
  if (!imageId) {
    return res.status(400).json(errorResponse('IMAGE_ID_REQUIRED', 'imageId is required'));
  }

  try {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { imageId }
    });

    await docClient.send(command);
    res.status(200).json({ message: 'Metadata deleted successfully' });
  } catch (error) {
    console.error('Failed to delete metadata:', error);
    res.status(500).json(errorResponse('META_DELETE_FAILED', 'Failed to delete metadata', error));
  }
});

export default router;
