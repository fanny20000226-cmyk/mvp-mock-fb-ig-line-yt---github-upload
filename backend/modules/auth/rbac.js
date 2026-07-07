const bcrypt = require("bcryptjs");

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  HR_ADMIN: "HR_ADMIN",
  FINANCE_ADMIN: "FINANCE_ADMIN",
  EMPLOYEE: "EMPLOYEE"
};

const ROLE_MODULES = {
  SUPER_ADMIN: ["hr", "finance", "operation", "system"],
  HR_ADMIN: ["hr"],
  FINANCE_ADMIN: ["finance"],
  EMPLOYEE: ["employee"]
};

function canAccess(role, moduleName) {
  return (ROLE_MODULES[role] || []).includes(moduleName);
}

function requireRole(moduleName) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !canAccess(user.role, moduleName)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "No permission for this module." });
    }
    return next();
  };
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function operationLogger(db) {
  return async (req, res, next) => {
    res.on("finish", async () => {
      try {
        if (!req.user) return;
        await db.run(
          "INSERT INTO system_operation_log(actor_type,actor_id,actor_username,action,module,ip_address,detail_json) VALUES(?,?,?,?,?,?,?)",
          [
            req.user.role === ROLES.EMPLOYEE ? "EMPLOYEE" : "ADMIN",
            req.user.id,
            req.user.username,
            `${req.method} ${req.originalUrl}`,
            req.moduleName || "unknown",
            req.ip,
            JSON.stringify({ statusCode: res.statusCode })
          ]
        );
      } catch (error) {}
    });
    next();
  };
}

module.exports = { ROLES, requireRole, canAccess, verifyPassword, hashPassword, operationLogger };
