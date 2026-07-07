# RBAC + HR + Finance + Operation Incremental Module

本次新增內容遵守「不修改既有可用程式、不重構架構」原則，全部以新增檔案提供。

## 新增檔案

- `docs/sql/rbac_hr_finance_operation.sql`：SQL 建表語句
- `backend/app.example.js`：Express 掛載範例
- `backend/modules/auth/*`：RBAC、BCrypt、登入路由
- `backend/modules/hr/routes.js`：人事模組接口
- `backend/modules/employee/routes.js`：員工手機端接口
- `backend/modules/finance/routes.js`：財務模組接口
- `backend/modules/operation/routes.js`：營運庫存接口
- `backend/modules/system/routes.js`：超級管理員系統日誌與密碼重置
- `employee-mobile/*`：員工前台移動端頁面

## 權限

- `SUPER_ADMIN`：全域權限
- `HR_ADMIN`：只可進人事模組
- `FINANCE_ADMIN`：只可進財務模組
- `EMPLOYEE`：只可進員工前台 API

## 注意

目前 GitHub Pages 只能執行靜態 PWA，不能直接執行 Express、BCrypt 或 SQL。  
本次新增的後端檔案是部署到自有 Node.js + SQLite/PostgreSQL 伺服器時使用的原始碼。
