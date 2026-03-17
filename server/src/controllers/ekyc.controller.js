/**
 * @description eKYC Controller - Xử lý request eKYC
 */

const ekycService = require('../services/ekyc.service');
const { successResponse } = require('../utils/response');
const logger = require('../utils/logger');

class EkycController {
    /**
     * OCR mặt trước CCCD
     * POST /api/ekyc/front-id
     */
    async ocrFrontId(req, res, next) {
        try {
            logger.info('[eKYC] POST /front-id - Request received');
            logger.info('[eKYC] req.file exists:', !!req.file);
            logger.info('[eKYC] req.file.buffer size:', req.file?.buffer?.length || 0);

            const imageBuffer = req.file?.buffer;
            if (!imageBuffer) {
                logger.error('[eKYC] Missing frontID file buffer');
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu file ảnh CCCD mặt trước'
                });
            }

            logger.info('[eKYC] Processing OCR with buffer size:', imageBuffer.length);
            const result = await ekycService.processOcrFront(
                req.user.id,
                imageBuffer,
                req.file.originalname
            );
            logger.info('[eKYC] OCR result success:', result.success);
            return successResponse(res, result.data, result.message);
        } catch (error) {
            logger.error('[eKYC] Error:', error.message);
            next(error);
        }
    }

    /**
     * OCR mặt sau CCCD
     * POST /api/ekyc/back-id
     */
    async ocrBackId(req, res, next) {
        try {
            const imageBuffer = req.file?.buffer;
            if (!imageBuffer) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu file ảnh CCCD mặt sau'
                });
            }

            const result = await ekycService.processOcrBack(
                req.user.id,
                imageBuffer,
                req.file.originalname
            );
            return successResponse(res, result.data, result.message);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Phát hiện hướng khuôn mặt
     * POST /api/ekyc/detect-face
     */
    async detectFace(req, res, next) {
        try {
            const imagePath = req.file?.path;
            const { expected } = req.body;

            if (!imagePath) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu ảnh khuôn mặt'
                });
            }

            if (!expected) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu tham số expected (left/right/up/down/straight)'
                });
            }

            const result = await ekycService.detectFaceOrientation(imagePath, expected);
            return successResponse(res, result.data, result.message);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Kiểm tra liveness + face matching
     * POST /api/ekyc/liveness
     */
    async verifyLiveness(req, res, next) {
        try {
            const portraitPaths = req.files?.portraitImages?.map(f => f.path) || [];
            const frontIdPath = req.files?.frontID?.[0]?.path;

            if (portraitPaths.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần ít nhất 1 ảnh chân dung'
                });
            }

            const result = await ekycService.verifyLiveness(
                req.user.id,
                portraitPaths,
                frontIdPath
            );
            return successResponse(res, result.data, result.message);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Xử lý eKYC hoàn chỉnh
     * POST /api/ekyc/process
     */
    async processEkyc(req, res, next) {
        try {
            logger.info('[eKYC] POST /process - Processing full eKYC');

            // Với upload.any(), req.files là array phẳng
            const files = req.files || [];

            // Lọc theo fieldname
            logger.info(`[eKYC] processEkyc received fields: ${files.map(f => f.fieldname).join(', ')}`);
            logger.info(`[eKYC] body keys: ${Object.keys(req.body).join(', ')}`);

            // Hỗ trợ cả mảng có index hoặc [] nếu React Native gửi thế
            const portraitFiles = files.filter(f => f.fieldname.includes('portraitImages'));
            const frontIdFile = files.find(f => f.fieldname.includes('frontID'));
            const backIdFile = files.find(f => f.fieldname.includes('backID'));

            let portraitBuffers = portraitFiles.map(f => f.buffer);
            const frontIdBuffer = frontIdFile?.buffer;
            const backIdBuffer = backIdFile?.buffer;

            // Lấy OCR data từ body (Client sẽ gửi lên sau khi OCR từng bước)
            const { ocrFrontResult, ocrBackResult } = req.body;

            if (portraitBuffers.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cần ít nhất 1 ảnh chân dung'
                });
            }

            if (!frontIdBuffer) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu ảnh CCCD mặt trước'
                });
            }

            const result = await ekycService.processFullEkyc(
                req.user.id,
                {
                    frontIdBuffer,
                    backIdBuffer,
                    portraitBuffers,
                    ocrFrontResult: ocrFrontResult ? JSON.parse(ocrFrontResult) : null,
                    ocrBackResult: ocrBackResult ? JSON.parse(ocrBackResult) : null
                }
            );

            // eKYC không đạt nhưng vẫn trả 200 -- đây là kết quả bình thường
            if (!result.success) {
                return res.status(200).json({
                    success: false,
                    message: result.message,
                    data: result.data
                });
            }

            return successResponse(res, result.data, result.message);
        } catch (error) {
            logger.error('[eKYC] Process error:', error.message);
            next(error);
        }
    }

    /**
     * Lấy trạng thái eKYC
     * GET /api/ekyc/status
     */
    async getStatus(req, res, next) {
        try {
            const result = await ekycService.getEkycStatus(req.user.id);
            return successResponse(res, result, 'Lấy trạng thái eKYC thành công');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new EkycController();
