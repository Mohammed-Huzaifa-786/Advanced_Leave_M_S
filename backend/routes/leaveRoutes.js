const router = require("express").Router();
const controller = require("../controllers/leaveController");
const upload = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");

// Students: apply for leave
router.post("/apply", auth, upload.single("file"), controller.applyLeave);

// Students: get own leave history
router.get("/my-leaves", auth, controller.getMyLeaves);

// Admin only: view all leaves across institution
router.get("/all", auth, auth.authorize("admin"), controller.getAllLeaves);

// Authenticated document download (Student can view own document; Admin can view all)
router.get("/:id/document", auth, controller.downloadDocument);

// Admin only: approve / reject leave applications
router.post("/approve/:id", auth, auth.authorize("admin"), controller.approveLeave);
router.put("/approve/:id", auth, auth.authorize("admin"), controller.approveLeave);
router.post("/reject/:id", auth, auth.authorize("admin"), controller.rejectLeave);
router.put("/reject/:id", auth, auth.authorize("admin"), controller.rejectLeave);

module.exports = router;
