ALTER TABLE quote_estimate
ADD COLUMN pdf_file_path VARCHAR(255) NULL COMMENT '報價單PDF雲存路徑' AFTER `remark`,
ADD COLUMN img_file_path VARCHAR(255) NULL COMMENT '報價單PNG圖片雲存路徑' AFTER `pdf_file_path`;
