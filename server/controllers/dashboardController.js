const { getAdminDashboardData } = require("../services/dashboardService");
const { successResponse, errorResponse } = require("../utils/response");

exports.getAdminDashboard = async (req, res) => {
  try {
    const schoolId = req.auth?.schoolId;
    const data = await getAdminDashboardData({ schoolId, query: req.query || {} });
    return res.json(successResponse(data));
  } catch (err) {
    console.error("[getAdminDashboard]", err);
    return res
      .status(500)
      .json(errorResponse("SERVER_ERROR", "Could not load dashboard"));
  }
};
