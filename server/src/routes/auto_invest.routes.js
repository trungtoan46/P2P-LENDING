const express = require('express');
const router = express.Router();
const autoInvestController = require('../controllers/auto_invest.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Tất cả routes đều cần auth
router.use(authenticate);

router.post('/', autoInvestController.upsertConfig); // Create or Update (if _id provided in body)
router.put('/:id', autoInvestController.upsertConfig); // Update by ID param
router.get('/', autoInvestController.getMyConfigs);
router.get('/:id', autoInvestController.getDetail);
router.patch('/:id/status', autoInvestController.toggleStatus);

module.exports = router;
