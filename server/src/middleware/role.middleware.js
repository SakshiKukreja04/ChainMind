/**
 * Role-Based Access Control Middleware
 * Enforces role-based authorization
 */

/**
 * Owner Only Middleware
 * Allows access only to OWNER role
 *
 * Usage: router.get('/admin', auth, ownerOnly, controller)
 */
const ownerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Owner role required.',
    });
  }

  next();
};

/**
 * Manager Only Middleware
 * Allows access only to MANAGER role
 *
 * Usage: router.post('/update', auth, managerOnly, controller)
 */
const managerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'MANAGER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Manager role required.',
    });
  }

  next();
};

/**
 * Vendor Only Middleware
 * Allows access only to VENDOR role
 *
 * Usage: router.get('/orders', auth, vendorOnly, controller)
 */
const vendorOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'VENDOR') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor role required.',
    });
  }

  next();
};

/**
 * Owner or Manager Middleware
 * Allows access to OWNER and MANAGER roles
 */
const ownerOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!['OWNER', 'MANAGER'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Owner or Manager role required.',
    });
  }

  next();
};

/**
 * Authenticated Middleware
 * Allows access to any authenticated user (used as alternative name)
 */
const authenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  next();
};

module.exports = {
  ownerOnly,
  managerOnly,
  vendorOnly,
  ownerOrManager,
  authenticated,
};
