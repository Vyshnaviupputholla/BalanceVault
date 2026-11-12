
function authorizeAdmin(req, res, next) {
  // Check whether the user is authenticated
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  // Check whether the user has ADMIN role
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Access denied. Admin only."
    });
  }

  // Allow the administrator to continue
  next();
}

module.exports = authorizeAdmin;
