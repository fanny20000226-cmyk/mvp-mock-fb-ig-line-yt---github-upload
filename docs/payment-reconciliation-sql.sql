-- 預約收款對帳增量 SQL
-- 執行順序 1：先替原有預約主表追加欄位
-- 注意：請將 reservation_orders 替換為正式後端實際預約主表名稱。

ALTER TABLE reservation_orders
ADD COLUMN order_source TINYINT NOT NULL DEFAULT 1 COMMENT '預約來源：1前台預約，2後台預約',
ADD COLUMN original_total DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '訂單原價總金額',
ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0 COMMENT '優惠、抹零、折扣金額',
ADD COLUMN deposit_amount DECIMAL(12,2) DEFAULT 0 COMMENT '已收取訂金金額',
ADD COLUMN refund_total DECIMAL(12,2) DEFAULT 0 COMMENT '訂單累計退款總金額',
ADD COLUMN tax_exclusive DECIMAL(12,2) DEFAULT 0 COMMENT '不含稅金額',
ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0 COMMENT '稅費金額',
ADD COLUMN invoice_status TINYINT DEFAULT 0 COMMENT '開票狀態：0未開票，1已開票',
ADD COLUMN invoice_no VARCHAR(64) NULL COMMENT '發票編號',
ADD COLUMN check_status TINYINT DEFAULT 0 COMMENT '對帳狀態：0待對帳，1已對帳，2異常待核查',
ADD COLUMN check_uid INT NULL COMMENT '財務審核人ID',
ADD COLUMN finish_time DATETIME NULL COMMENT '訂單完工結算時間';

-- 舊資料兼容：歷史存量舊訂單預設已對帳
UPDATE reservation_orders
SET check_status = 1
WHERE check_status = 0;

-- 執行順序 2：建立收款流水明細表

CREATE TABLE payment_record (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '流水自增ID',
  order_primary_id VARCHAR(64) NOT NULL COMMENT '關聯原有預約表主鍵ID',
  store_id INT NOT NULL COMMENT '所屬門店ID',
  pay_type TINYINT NOT NULL COMMENT '付款類型：1現金，2匯款，3刷卡POS，4微信，5支付寶，6儲值抵扣，7對公轉帳，8掛帳賒帳',
  pay_amount DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '單筆收款金額（退款填寫負數）',
  trade_sn VARCHAR(128) NULL COMMENT 'POS流水號、支付平台交易單號',
  pay_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收款操作時間',
  operator_id INT NOT NULL COMMENT '收款操作員工ID',
  remark VARCHAR(255) NULL COMMENT '備註資訊',
  INDEX idx_order_id (`order_primary_id`),
  INDEX idx_store_date (`store_id`,`pay_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT '訂單收款流水明細表';
