const express = require("express");
const jwt = require("jsonwebtoken");
const authRoutes = require("./modules/auth/routes");
const { operationLogger } = require("./modules/auth/rbac");
const hrRoutes = require("./modules/hr/routes");
const employeeRoutes = require("./modules/employee/routes");
const financeRoutes = require("./modules/finance/routes");
const operationRoutes = require("./modules/operation/routes");
const systemRoutes = require("./modules/system/routes");
const quoteRoutes = require("./modules/quote/routes");
const workorderRoutes = require("./modules/workorder/routes");

function authMiddleware(jwtSecret) {
  return (req, res, next) => {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "NO_TOKEN" });
    try {
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch (error) {
      res.status(401).json({ error: "INVALID_TOKEN" });
    }
  };
}

function createApp(db, options = {}) {
  const app = express();
  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || "change-me";
  app.use(express.json({ limit: "10mb" }));
  app.use("/api/auth", authRoutes(db, jwtSecret));
  app.use(authMiddleware(jwtSecret));
  app.use(operationLogger(db));
  app.use("/api/hr", hrRoutes(db));
  app.use("/api/employee", employeeRoutes(db));
  app.use("/api/finance", financeRoutes(db));
  app.use("/api/operation", operationRoutes(db));
  app.use("/api/system", systemRoutes(db));
  app.use("/api/quote", quoteRoutes(db));
  app.use("/api/workorder", workorderRoutes(db));
  return app;
}

module.exports = { createApp };
