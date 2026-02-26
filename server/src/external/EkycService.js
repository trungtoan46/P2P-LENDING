/**
 * @description eKYC External Service - Wrapper gọi eKYC Flask API
 * Kết nối với eKYC service chạy trên port 8000
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class EkycService {
    constructor() {
        this.baseUrl = process.env.EKYC_SERVICE_URL || 'http://localhost:8000';
        this.timeout = 30000;

        // Axios instance với config mặc định
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout
        });
    }

    /**
     * Helper: Tạo request với form-data
     */
    async _makeRequest(endpoint, formData) {
        console.log(`[EkycService] Making request to: ${this.baseUrl}${endpoint}`);

        try {
            const response = await this.client.post(endpoint, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            console.log(`[EkycService] Response status: ${response.status}`);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            console.error(`[EkycService] Request to ${endpoint} failed:`, errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * OCR mặt trước CCCD
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} filename - Tên file gốc
     * @returns {Object} { result: { id, name, dob, ... } }
     */
    async ocrFrontID(imageBuffer, filename = 'frontID.jpg') {
        console.log(`[EkycService] OCR frontID - Buffer size: ${imageBuffer.length} bytes`);

        const formData = new FormData();
        formData.append('frontID', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/frontID', formData);
        console.log('[EkycService] OCR front ID completed');
        return result;
    }

    /**
     * OCR mặt sau CCCD
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} filename - Tên file gốc
     * @returns {Object} { result: { issue_date, issue_place, ... } }
     */
    async ocrBackID(imageBuffer, filename = 'backID.jpg') {
        console.log(`[EkycService] OCR backID - Buffer size: ${imageBuffer.length} bytes`);

        const formData = new FormData();
        formData.append('backID', imageBuffer, {
            filename: filename,
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/backID', formData);
        console.log('[EkycService] OCR back ID completed');
        return result;
    }

    /**
     * Phát hiện hướng khuôn mặt
     * @param {Buffer} imageBuffer - Buffer ảnh
     * @param {String} expected - Hướng mong đợi (left, right, up, down, straight)
     * @returns {Object} { result: { detected, expected, match } }
     */
    async detectFaceOrientation(imageBuffer, expected) {
        console.log(`[EkycService] Face detection - expected: ${expected}`);

        const formData = new FormData();
        formData.append('frame', imageBuffer, {
            filename: 'frame.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('expected', expected);

        const result = await this._makeRequest('/api/ekyc/detection', formData);
        console.log(`[EkycService] Face detection completed`);
        return result;
    }

    /**
     * Kiểm tra liveness + face matching
     * @param {Array<Buffer>} portraitBuffers - Danh sách buffer ảnh chân dung
     * @param {Buffer} frontIdBuffer - Buffer ảnh CCCD mặt trước
     * @returns {Object} { results: { liveness, face_matching, spoof_score, ... } }
     */
    async livenessCheck(portraitBuffers, frontIdBuffer) {
        console.log(`[EkycService] Liveness check - ${portraitBuffers.length} portraits`);

        const formData = new FormData();

        // Thêm nhiều ảnh portrait
        portraitBuffers.forEach((buffer, index) => {
            formData.append('portraitImages', buffer, {
                filename: `portrait_${index}.jpg`,
                contentType: 'image/jpeg'
            });
        });

        formData.append('frontID', frontIdBuffer, {
            filename: 'frontID.jpg',
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc/liveness', formData);
        console.log('[EkycService] Liveness check completed');
        return result;
    }

    /**
     * Xử lý eKYC hoàn chỉnh
     * @param {Array<Buffer>} portraitBuffers - Danh sách buffer ảnh chân dung
     * @param {Buffer} frontIdBuffer - Buffer ảnh CCCD mặt trước
     * @returns {Object} { results: { ocr, liveness, face_matching, ... } }
     */
    async processFullEkyc(portraitBuffers, frontIdBuffer) {
        console.log(`[EkycService] Full eKYC - ${portraitBuffers.length} portraits`);

        // Sử dụng sharp để fix EXIF orientation (camera iOS thường lưu orientation sai)
        const sharp = require('sharp');
        const processedPortraits = [];

        for (let i = 0; i < portraitBuffers.length; i++) {
            try {
                // Sharp auto-rotate sẽ đọc EXIF và xoay ảnh đúng hướng
                const rotated = await sharp(portraitBuffers[i])
                    .rotate() // Auto-rotate based on EXIF
                    .jpeg({ quality: 95 })
                    .toBuffer();
                processedPortraits.push(rotated);
                console.log(`[EkycService] Portrait ${i}: ${portraitBuffers[i].length} -> ${rotated.length} bytes (auto-rotated)`);
            } catch (err) {
                console.log(`[EkycService] Sharp error on portrait ${i}: ${err.message}, using original`);
                processedPortraits.push(portraitBuffers[i]);
            }
        }

        // DEBUG: Lưu ảnh đã xử lý để kiểm tra
        if (processedPortraits.length > 0) {
            const fs = require('fs');
            const path = require('path');
            const debugPath = path.join(__dirname, '../../uploads/ekyc/debug_portrait_rotated.jpg');
            try {
                fs.writeFileSync(debugPath, processedPortraits[0]);
                console.log(`[EkycService] DEBUG - Saved rotated portrait to: ${debugPath}`);
            } catch (err) {
                console.log(`[EkycService] DEBUG - Could not save debug image: ${err.message}`);
            }
        }

        let processedFrontId = frontIdBuffer;
        if (frontIdBuffer && Buffer.isBuffer(frontIdBuffer) && frontIdBuffer.length > 0) {
            try {
                processedFrontId = await sharp(frontIdBuffer)
                    .rotate()
                    .jpeg({ quality: 95 })
                    .toBuffer();
                console.log(`[EkycService] FrontID: ${frontIdBuffer.length} -> ${processedFrontId.length} bytes (auto-rotated)`);
            } catch (err) {
                console.log(`[EkycService] Sharp error on frontID: ${err.message}`);
                processedFrontId = frontIdBuffer;
            }
        } else {
            console.log(`[EkycService] Warning: frontIdBuffer is invalid or empty:`, frontIdBuffer ? `size: ${frontIdBuffer.length}` : 'undefined');
        }

        const formData = new FormData();

        processedPortraits.forEach((buffer, index) => {
            formData.append('portraitImages', buffer, {
                filename: `portrait_${index}.jpg`,
                contentType: 'image/jpeg'
            });
        });

        formData.append('frontID', processedFrontId, {
            filename: 'frontID.jpg',
            contentType: 'image/jpeg'
        });

        const result = await this._makeRequest('/api/ekyc-process', formData);
        console.log('[EkycService] Full eKYC process completed');
        return result;
    }

    /**
     * Kiểm tra eKYC service có khả dụng không
     */
    async isAvailable() {
        try {
            const response = await this.client.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            console.error('[EkycService] Service not available:', error.message);
            return false;
        }
    }
}

module.exports = new EkycService();
