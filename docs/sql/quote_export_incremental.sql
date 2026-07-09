ALTER TABLE quote_estimate
ADD COLUMN pdf_file_path VARCHAR(255) NULL COMMENT '報價單PDF雲存路徑' AFTER `remark`,
ADD COLUMN img_file_path VARCHAR(255) NULL COMMENT '報價單PNG圖片雲存路徑' AFTER `pdf_file_path`;

ALTER TABLE work_order
ADD COLUMN completion_file_path VARCHAR(255) NULL COMMENT '完工施工單PDF路徑' AFTER `img_file_path`,
ADD COLUMN completion_img_path VARCHAR(255) NULL COMMENT '完工施工單圖片路徑' AFTER `completion_file_path`;
