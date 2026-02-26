const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// All routes require Admin access
router.use(authenticate, isAdmin);

router.get('/', (req, res, next) => configController.getConfigs(req, res, next));
router.put('/:key', (req, res, next) => configController.updateConfig(req, res, next));

module.exports = router;
