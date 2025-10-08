// middlewares/upload.middleware.ts
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Configure multer storage
const storage = multer.memoryStorage();

// Create multer instance
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10, // Maximum 10 files
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
        }
    }
});

// Middleware wrapper with error handling
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const uploader = upload.array('files', 10);
    
    uploader(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File size exceeds 10MB limit'
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    error: 'Maximum 10 files allowed'
                });
            }
            return res.status(400).json({
                success: false,
                error: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                error: 'Failed to process upload'
            });
        }
        next();
    });
};