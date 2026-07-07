const express = require("express");
const jwt = require("jsonwebtoken");
const { verifyPassword } = require("./rbac");

function authRoutes(db, jwtSecret) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password, type } = req.body;
    const table = type === "employee" ? "employee_account" : "admin_user";
    const user = await db.get(`SELECT * FROM ${table} WHERE username=? AND active=1`, [username]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "INVALID_LOGIN" });
    }
    const role = type === "employee" ? "EMPLOYEE" : user.role;
    const token = jwt.sign({ id: user.id, username: user.username, role, employeeId: user.id }, jwtSecret, { expiresIn: "8h" });
    res.json({ token, role, username: user.username, name: user.name || user.username });
  });

  return router;
}

module.exports = authRoutes;
