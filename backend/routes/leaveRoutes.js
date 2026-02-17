const router = require('express').Router();
const controller = require('../controllers/leaveController');
const upload = require('../middleware/uploadMiddleware');
const auth = require('../middleware/authMiddleware');
router.post('/apply', auth, upload.single('file'), controller.applyLeave);
router.get('/all', auth, controller.getAllLeaves);
router.post("/approve/:id", controller.approveLeave);
router.post("/reject/:id", controller.rejectLeave);
module.exports = router;