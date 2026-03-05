/**
 * @description eKYC Routes
 */

const express = require('express');
const router = express.Router();
const ekycController = require('../controllers/ekyc.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const multer = require('multer');

// Sử dụng memory storage để giữ file trong RAM
// Sau khi eKYC thành công mới lưu xuống disk
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh'));
        }
    }
});

// Routes

// Lấy trạng thái eKYC
router.get('/status',
    authenticate,
    (req, res, next) => ekycController.getStatus(req, res, next)
);

// OCR mặt trước CCCD
router.post('/front-id',
    authenticate,
    upload.single('frontID'),
    (req, res, next) => ekycController.ocrFrontId(req, res, next)
);

// OCR mặt sau CCCD
router.post('/back-id',
    authenticate,
    upload.single('backID'),
    (req, res, next) => ekycController.ocrBackId(req, res, next)
);

// Phát hiện hướng khuôn mặt
router.post('/detect-face',
    authenticate,
    upload.single('frame'),
    (req, res, next) => ekycController.detectFace(req, res, next)
);

// Kiểm tra liveness + face matching
router.post('/liveness',
    authenticate,
    upload.fields([
        { name: 'portraitImages', maxCount: 10 },
        { name: 'frontID', maxCount: 1 }
    ]),
    (req, res, next) => ekycController.verifyLiveness(req, res, next)
);

// Xử lý eKYC hoàn chỉnh
router.post('/process',
    authenticate,
    upload.any(),
    (req, res, next) => ekycController.processEkyc(req, res, next)
);

module.exports = router;
