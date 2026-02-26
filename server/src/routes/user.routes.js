/**
 * @description User Routes
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const { ValidationError } = require('../utils/errors');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const { userDetailsSchema, updateProfileSchema, paginationSchema } = require('../utils/validators');
const { IMAGE_EXTENSIONS } = require('../constants');
const Joi = require('joi');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/kyc/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (IMAGE_EXTENSIONS.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

const detectImageMime = (buffer) => {
    if (!buffer || buffer.length < 3) return null;
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isPng = buffer.length >= 8 && pngSignature.every((b, i) => buffer[i] === b);
    if (isPng) return 'image/png';
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (isJpeg) return 'image/jpeg';
    return null;
};

const cleanupFiles = (paths) => {
    for (const filePath of paths) {
        try {
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }
};

const validateKycFiles = (req, res, next) => {
    const files = req.files || {};
    const fields = ['frontID', 'backID', 'selfie'];
    const filePaths = [];
    try {
        for (const field of fields) {
            const file = files[field]?.[0];
            if (!file) continue;
            filePaths.push(file.path);
            const ext = path.extname(file.originalname).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                throw new ValidationError('Định dạng ảnh không hợp lệ');
            }
            const buffer = fs.readFileSync(file.path);
            const mime = detectImageMime(buffer);
            if (!mime || !IMAGE_EXTENSIONS.includes(mime)) {
                throw new ValidationError('Nội dung ảnh không hợp lệ');
            }
        }
        return next();
    } catch (error) {
        cleanupFiles(filePaths);
        return next(error);
    }
};

// User profile routes
router.get('/profile',
    authenticate,
    (req, res, next) => userController.getProfile(req, res, next)
);

// Get pending KYC users (Admin only) - MOVE TO TOP
router.get('/kyc/pending',
    authenticate,
    isAdmin,
    (req, res, next) => userController.getPendingKycUsers(req, res, next)
);

router.put('/profile',
    authenticate,
    validateBody(updateProfileSchema),
    (req, res, next) => userController.updateProfile(req, res, next)
);

router.post('/kyc/upload',
    authenticate,
    upload.fields([
        { name: 'frontID', maxCount: 1 },
        { name: 'backID', maxCount: 1 },
        { name: 'selfie', maxCount: 1 }
    ]),
    validateKycFiles,
    (req, res, next) => userController.uploadKYC(req, res, next)
);

router.put('/category',
    authenticate,
    validateBody(Joi.object({
        category: Joi.string().valid('borrower', 'lender', 'both').required()
    })),
    (req, res, next) => userController.updateCategory(req, res, next)
);

// Admin routes
router.get('/',
    authenticate,
    isAdmin,
    validateQuery(paginationSchema.keys({
        category: Joi.string().valid('borrower', 'lender', 'both', 'admin'),
        isActive: Joi.boolean()
    })),
    (req, res, next) => userController.getAllUsers(req, res, next)
);

router.get('/:id',
    authenticate,
    isAdmin,
    (req, res, next) => userController.getUserById(req, res, next)
);


router.post('/:id/kyc/approve',
    authenticate,
    isAdmin,
    (req, res, next) => userController.approveKYC(req, res, next)
);

router.post('/:id/kyc/reject',
    authenticate,
    isAdmin,
    validateBody(Joi.object({
        reason: Joi.string().required()
    })),
    (req, res, next) => userController.rejectKYC(req, res, next)
);

router.post('/:id/activate',
    authenticate,
    isAdmin,
    (req, res, next) => userController.activateUser(req, res, next)
);

router.post('/:id/deactivate',
    authenticate,
    isAdmin,
    (req, res, next) => userController.deactivateUser(req, res, next)
);

module.exports = router;
