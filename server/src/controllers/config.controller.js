const Config = require('../models/Config');
const { successResponse } = require('../utils/response');

class ConfigController {
    /**
     * Get all configs
     */
    async getConfigs(req, res, next) {
        try {
            const configs = await Config.find();
            return successResponse(res, configs);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a config
     */
    async updateConfig(req, res, next) {
        try {
            const { key } = req.params;
            const { value } = req.body;

            const config = await Config.findOneAndUpdate(
                { key },
                { value },
                { new: true, upsert: true }
            );

            return successResponse(res, config, 'Cập nhật cấu hình thành công');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get a specific config value (internal use)
     */
    async getValue(key) {
        const config = await Config.findOne({ key });
        return config ? config.value : null;
    }
}

module.exports = new ConfigController();
