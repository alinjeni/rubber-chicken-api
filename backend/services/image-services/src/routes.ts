import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
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

const metaUrl = process.env.META_SERVICE_URL || 'http://localhost:3002';
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMO_TABLE || 'ImageMetadata';
const uploadFolder = process.env.UPLOAD_FOLDER || 'uploads';
const uploadDir = path.join(__dirname, '..', uploadFolder);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post(
  '/upload',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'tags', maxCount: 1 },
    { name: 'title', maxCount: 1 }
  ]),
  async (req: Request, res: Response) => {
    if (!req.files || Array.isArray(req.files) || !req.files['image']) {
      return res.status(400).json(errorResponse(
        'NO_FILE',
        'No image file uploaded',
        { reason: 'Missing file field' }
      ));
    }
    const file = req.files['image'][0];
    try {
      const imageId = uuidv4();
      const fileUrl = `http://localhost:3001/api/images/${file.filename}`;
      const description = req.body.description || '';
      const title = req.body.title || file.originalname;

      let tags: string[] = [];

      if (req.body.tags) {
        try {
          const parsedTags = JSON.parse(req.body.tags);
          if (!Array.isArray(parsedTags)) {
            return res.status(400).json(errorResponse(
              'INVALID_TAG_FORMAT',
              'Tags must be a JSON array',
              { received: req.body.tags }
            ));
          }
          tags = parsedTags;
        } catch (error) {
            console.error(error);
            return res.status(500).json(errorResponse(
              'UPLOAD_FAILED',
              'Image upload failed',
              { error: error instanceof Error ? error.message : error }
            ));
          }
      }

      const metadata = {
        imageId,
        title,
        description,
        fileSize: file.size,
        fileType: mime.lookup(file.originalname) || 'application/octet-stream',
        fileUrl,
        originalFilename: file.originalname,
        tags
      };

      await axios.post(`${metaUrl}/api/meta`, metadata);

      res.status(200).json({
        message: 'Image uploaded and metadata created',
        imageId,
        fileUrl
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Upload failed', error });
    }
  }
);

router.get('/gallery', async (req: Request, res: Response) => {
  const {
    tagIds,
    includeDuplicates,
    sortBy,
    sortOrder,
    offset,
    limit
  } = req.query;

  try {
    const metaServiceUrl = `${metaUrl}/api/meta`;

    const response = await axios.get(metaServiceUrl, {
      params: {
        tagIds,
        includeDuplicates,
        sortBy,
        sortOrder,
        offset,
        limit
      }
    });

    res.status(200).json({
      message: 'Gallery fetched successfully',
      ...response.data
    });
  } catch (error) {
      console.error('Error fetching gallery from meta-service:', error);
      res.status(500).json(errorResponse(
        'GALLERY_FETCH_FAILED',
        'Failed to fetch gallery',
        { error }
      ));
    }
});

router.get('/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json(errorResponse(
      'FILE_NOT_FOUND',
      'Requested image not found on server',
      { filename }
    ));
  }
  return res.sendFile(filePath);
});

router.delete('/:imageId', async (req: Request, res: Response) => {
  const imageId = req.params.imageId;

  try {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { imageId }
      })
    );

    if (!Item) {
      return res.status(404).json(errorResponse(
        'IMAGE_NOT_FOUND',
        'Image not found in database',
        { imageId }
      ));
    }

    const fileUrl = Item.fileUrl;
    const filename = path.basename(fileUrl);
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn('File not found on disk:', filePath);
    }

    await axios.delete(`${metaUrl}/api/meta/${imageId}`);

    return res.status(200).json({ message: 'Image and metadata deleted successfully' });

  } catch (error) {
      console.error('Error deleting image:', error);
      return res.status(500).json(errorResponse(
        'DELETE_FAILED',
        'Internal server error during image deletion',
        { error }
      ));
    }
});

export default router;