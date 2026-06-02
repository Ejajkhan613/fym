const router = require("express").Router();

const supportController = require("../controllers/support.controller");
const asyncHandler = require("../middlewares/async-handler.middleware");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.get("/tickets", asyncHandler(supportController.listMyTickets));
router.post("/tickets", asyncHandler(supportController.createMyTicket));
router.get("/tickets/:ticketId", asyncHandler(supportController.getMyTicket));
router.post(
    "/tickets/:ticketId/messages",
    asyncHandler(supportController.createMyTicketMessage)
);

module.exports = router;
