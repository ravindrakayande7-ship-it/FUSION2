export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to role authorization.',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' lacks permission for this resource. Requires one of: [${allowedRoles.join(
          ', '
        )}]`,
      });
    }
    next();
  };
};

export default authorize;
