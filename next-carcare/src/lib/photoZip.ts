"use client";

type ZipFile = {
  name: string;
  data: Uint8Array;
};

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
    crc ^= bytes[byteIndex];
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function dosDateTime(date = new Date()) {
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { dosTime, dosDate };
}

function concat(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, item) => sum + item.length, 0);
  const merged = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function buildZip(files: ZipFile[]) {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const local = new Uint8Array(30 + nameBytes.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, 0);
    writeUint16(local, 8, 0);
    writeUint16(local, 10, dosTime);
    writeUint16(local, 12, dosDate);
    writeUint32(local, 14, checksum);
    writeUint32(local, 18, file.data.length);
    writeUint32(local, 22, file.data.length);
    writeUint16(local, 26, nameBytes.length);
    writeUint16(local, 28, 0);
    local.set(nameBytes, 30);
    localChunks.push(local, file.data);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, dosTime);
    writeUint16(central, 14, dosDate);
    writeUint32(central, 16, checksum);
    writeUint32(central, 20, file.data.length);
    writeUint32(central, 24, file.data.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);
    centralChunks.push(central);
    offset += local.length + file.data.length;
  });

  const centralDirectory = concat(centralChunks);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralDirectory.length);
  writeUint32(end, 16, offset);
  return new Blob([...localChunks, centralDirectory, end], { type: "application/zip" });
}

function extensionFromUrl(url: string) {
  const clean = url.split("?")[0] || "";
  const match = clean.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || "jpg";
}

export function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "PEIWAY";
}

export async function downloadPhotosAsZip(
  urls: string[],
  filename: string,
  prefix = "施工照片"
) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  if (!uniqueUrls.length) {
    window.alert("目前沒有可下載的施工照片。");
    return;
  }

  const files = await Promise.all(
    uniqueUrls.map(async (url, index) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`照片下載失敗：${url}`);
      const data = new Uint8Array(await response.arrayBuffer());
      return {
        name: `${sanitizeFilename(prefix)}_${String(index + 1).padStart(2, "0")}.${extensionFromUrl(url)}`,
        data
      };
    })
  );

  const blob = buildZip(files);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${sanitizeFilename(filename)}.zip`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
