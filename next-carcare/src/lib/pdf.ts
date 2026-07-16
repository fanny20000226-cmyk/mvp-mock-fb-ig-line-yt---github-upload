"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportElementToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save(filename);
}

