import ExcelJS from 'exceljs';
import { CustomerLevel, CUSTOMER_LEVELS } from '@/const';

export interface QuotationItem {
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  customerLevel?: CustomerLevel;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  pcsPerCarton?: string | null;
  unitWeight?: string | null;
  unitVolume?: string | null;
  note?: string | null;
}

export interface ExportOptions {
  items: QuotationItem[];
  currency: 'CNY' | 'USD';
  exchangeRate: number;
  includeDimensions: boolean;
  customerName?: string;
  customerAddress?: string;
  companyInfo?: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  imageProxyFn?: (url: string) => Promise<string | null>;
}

// 将图片URL转换为base64
async function imageUrlToBase64(
  url: string, 
  proxyFn?: (url: string) => Promise<string | null>
): Promise<{ base64: string; extension: 'jpeg' | 'png' | 'gif' } | null> {
  if (!url) return null;
  
  try {
    // 优先使用代理函数
    if (proxyFn) {
      const result = await proxyFn(url);
      if (result) {
        const match = result.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const ext = match[1].toLowerCase();
          const base64Data = match[2];
          const extension = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg';
          return { base64: base64Data, extension };
        }
        return { base64: result, extension: 'jpeg' };
      }
    }
    
    // 直接尝试fetch
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    
    const blob = await response.blob();
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpeg';
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64Match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
        if (base64Match) {
          resolve({ base64: base64Match[1], extension: ext });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return null;
  }
}

// 设置单元格边框
function setBorder(cell: ExcelJS.Cell, style: 'thin' | 'medium' = 'thin') {
  cell.border = {
    top: { style },
    left: { style },
    bottom: { style },
    right: { style }
  };
}

// 设置外边框加粗
function setOuterBorder(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number, startCol: number, endCol: number) {
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const cell = worksheet.getCell(row, col);
      const border: Partial<ExcelJS.Borders> = {
        top: { style: row === startRow ? 'medium' : 'thin' },
        bottom: { style: row === endRow ? 'medium' : 'thin' },
        left: { style: col === startCol ? 'medium' : 'thin' },
        right: { style: col === endCol ? 'medium' : 'thin' }
      };
      cell.border = border;
    }
  }
}

export async function exportQuotationToExcel(options: ExportOptions): Promise<Blob> {
  const { items, currency, exchangeRate, includeDimensions, customerName, customerAddress, companyInfo, imageProxyFn } = options;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('报价单');
  
  const currencySymbol = currency === 'CNY' ? '￥' : '$';
  const rate = currency === 'CNY' ? 1 : exchangeRate;
  
  // 基础列数（A-G）
  const baseColCount = 7;
  // 尺寸列数（H-O）
  const dimColCount = includeDimensions ? 8 : 0;
  const totalColCount = baseColCount + dimColCount;
  const lastColLetter = includeDimensions ? 'O' : 'G';
  
  // 设置列宽
  worksheet.getColumn(1).width = 5;    // A - NO.
  worksheet.getColumn(2).width = 16;   // B - Item No.
  worksheet.getColumn(3).width = 25;   // C - Description
  worksheet.getColumn(4).width = 12;   // D - PICTURES
  worksheet.getColumn(5).width = 10;   // E - QTY/SET
  worksheet.getColumn(6).width = 12;   // F - PRICE
  worksheet.getColumn(7).width = 14;   // G - AMOUNT
  
  if (includeDimensions) {
    worksheet.getColumn(8).width = 8;   // H - L/cm
    worksheet.getColumn(9).width = 8;   // I - W/cm
    worksheet.getColumn(10).width = 8;  // J - H/cm
    worksheet.getColumn(11).width = 10; // K - CBM/Per (m³)
    worksheet.getColumn(12).width = 8;  // L - CTN
    worksheet.getColumn(13).width = 10; // M - CBM/m³
    worksheet.getColumn(14).width = 10; // N - NW/kg
    worksheet.getColumn(15).width = 15; // O - Note
  }
  
  let currentRow = 1;
  
  // ========== 第1行：公司名称 ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const companyCell = worksheet.getCell(`A${currentRow}`);
  companyCell.value = companyInfo?.companyName || 'GUANGZHOU EXPLORER AUTO PARTS CO.,LTD.';
  companyCell.font = { bold: true, color: { argb: '0000FF' } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 第2行：公司地址（小6号字） ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const addressCell = worksheet.getCell(`A${currentRow}`);
  const companyAddress = companyInfo?.address || 'ADD: No. 25 Daling Road, Daling, Baiyun District, Guangzhou City, Guangdong Province';
  const contactInfo = companyInfo?.phone && companyInfo?.email 
    ? `\n${companyInfo.phone}      Email: ${companyInfo.email}`
    : '\nChuang Lin 0086 18826074914      Email: linchuanglc@163.com';
  addressCell.value = companyAddress + contactInfo;
  addressCell.font = { size: 8 };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;
  
  // ========== 第3行：PROFORMA INVOICE ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'PROFORMA INVOICE';
  titleCell.font = { bold: true, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 第4行：DATE 和 ORDER NO ==========
  worksheet.getCell(`A${currentRow}`).value = 'DATE:';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = new Date().toLocaleDateString('zh-CN');
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'ORDER NO:';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getRow(currentRow).height = 20;
  currentRow++;
  
  // ========== 第5行：Consignee 和 Notify ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Consignee(ship to) :';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = customerName || '';
  worksheet.getCell(`C${currentRow}`).font = { bold: true };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`E${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'Notify(bill to) :Same as Consignee';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;
  
  // ========== 第6行：ADDRESS 和 LEAD TIME ==========
  worksheet.getCell(`A${currentRow}`).value = 'ADDRESS:';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = customerAddress || '';
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`E${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'LEAD TIME:                                                                      \nSHIPPING MARKS：   ';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;
  
  // ========== 第7行：PRICE TERM 等 ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'PRICE TERM :    +EXW';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'PAYMENT:Alibaba/TT/Alipay';
  worksheet.getCell(`C${currentRow}`).font = { bold: true };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'SHIPPED VIA :';
  worksheet.getCell(`E${currentRow}`).font = { bold: true };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`F${currentRow}`).value = 'DELIVERY TIME :';
  worksheet.getCell(`F${currentRow}`).font = { bold: true };
  worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 20;
  currentRow++;
  
  // ========== 第8行：产品表格标题行 ==========
  const headerRow = currentRow;
  const baseHeaders = ['No.', 'Item No.', 'Description', 'PICTURES', 'QTY/ SET', 'PRICE', 'AMOUNT'];
  const dimHeaders = ['L/cm', 'W/cm', 'H/cm', 'CBM/Per', 'CTN', 'CBM/m³', 'NW/kg', 'Note'];
  const headers = includeDimensions ? [...baseHeaders, ...dimHeaders] : baseHeaders;
  
  const headerRowObj = worksheet.getRow(headerRow);
  headers.forEach((header, index) => {
    const cell = headerRowObj.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorder(cell);
  });
  headerRowObj.height = 25;
  currentRow++;
  
  // ========== 预先获取所有图片 ==========
  console.log('开始获取图片...');
  const imageDataMap = new Map<number, { base64: string; extension: 'jpeg' | 'png' | 'gif' }>();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.imageUrl) {
      console.log(`获取图片 ${i + 1}/${items.length}: ${item.imageUrl}`);
      try {
        const imageData = await imageUrlToBase64(item.imageUrl, imageProxyFn);
        if (imageData) {
          imageDataMap.set(i, imageData);
          console.log(`图片 ${i + 1} 获取成功`);
        } else {
          console.log(`图片 ${i + 1} 获取失败`);
        }
      } catch (error) {
        console.error(`图片 ${i + 1} 获取出错:`, error);
      }
    }
  }
  
  console.log(`共获取到 ${imageDataMap.size} 张图片`);
  
  // ========== 产品数据行（第9行开始） ==========
  const dataStartRow = currentRow;
  let totalAmount = 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = worksheet.getRow(rowNum);
    
    const unitPriceConverted = item.unitPrice / 100 / rate;
    const subtotalConverted = item.subtotal / 100 / rate;
    totalAmount += subtotalConverted;
    
    // 基础列
    row.getCell(1).value = i + 1; // NO.
    row.getCell(2).value = item.productCode; // Item No.
    row.getCell(3).value = item.productName; // Description
    // 图片列 (4) 后面添加
    row.getCell(5).value = item.quantity; // QTY/SET
    row.getCell(5).font = { bold: true };
    row.getCell(6).value = Number(unitPriceConverted.toFixed(2)); // PRICE
    row.getCell(6).font = { bold: true };
    row.getCell(6).numFmt = `"${currencySymbol}"#,##0.00`;
    row.getCell(7).value = Number(subtotalConverted.toFixed(2)); // AMOUNT
    row.getCell(7).font = { bold: true };
    row.getCell(7).numFmt = `"${currencySymbol}"#,##0.00`;
    
    if (includeDimensions) {
      const length = item.length ? parseFloat(item.length) : 0;
      const width = item.width ? parseFloat(item.width) : 0;
      const height = item.height ? parseFloat(item.height) : 0;
      const pcsPerCarton = item.pcsPerCarton ? parseFloat(item.pcsPerCarton) : 1;
      const unitWeight = item.unitWeight ? parseFloat(item.unitWeight) : 0;
      const unitVolume = item.unitVolume ? parseFloat(item.unitVolume) : 0;
      
      // L/cm
      row.getCell(8).value = length > 0 ? Math.round(length) : '';
      // W/cm
      row.getCell(9).value = width > 0 ? Math.round(width) : '';
      // H/cm
      row.getCell(10).value = height > 0 ? Math.round(height) : '';
      // CBM/Per (单件体积)
      let cbmPer = 0;
      if (length > 0 && width > 0 && height > 0) {
        cbmPer = (length * width * height) / 1000000;
      } else if (unitVolume > 0) {
        cbmPer = unitVolume;
      }
      row.getCell(11).value = cbmPer > 0 ? Number(cbmPer.toFixed(6)) : '';
      // CTN (箱数)
      const ctn = pcsPerCarton > 0 ? item.quantity / pcsPerCarton : 0;
      row.getCell(12).value = ctn > 0 ? Number(ctn.toFixed(2)) : '';
      // CBM/m³ (总体积)
      const totalCbm = cbmPer * ctn;
      row.getCell(13).value = totalCbm > 0 ? Number(totalCbm.toFixed(6)) : '';
      // NW/kg (总净重)
      const totalWeight = item.quantity * unitWeight;
      row.getCell(14).value = totalWeight > 0 ? Number(totalWeight.toFixed(2)) : '';
      // Note
      row.getCell(15).value = item.note || '';
    }
    
    // 设置行样式
    row.height = 60; // 产品行行高固定
    for (let col = 1; col <= totalColCount; col++) {
      const cell = row.getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(cell);
    }
  }
  
  // 添加图片到D列
  for (let i = 0; i < items.length; i++) {
    const imageData = imageDataMap.get(i);
    if (imageData) {
      const rowNum = dataStartRow + i;
      try {
        const imageId = workbook.addImage({
          base64: imageData.base64,
          extension: imageData.extension,
        });
        
        worksheet.addImage(imageId, {
          tl: { col: 3.05, row: rowNum - 0.95 } as any,
          br: { col: 3.95, row: rowNum - 0.05 } as any,
        });
        console.log(`图片 ${i + 1} 已添加到Excel`);
      } catch (error) {
        console.error(`添加图片 ${i + 1} 到Excel失败:`, error);
      }
    }
  }
  
  currentRow = dataStartRow + items.length;
  
  // ========== Total行 ==========
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Total';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`G${currentRow}`).value = Number(totalAmount.toFixed(2));
  worksheet.getCell(`G${currentRow}`).font = { bold: true };
  worksheet.getCell(`G${currentRow}`).numFmt = `"${currencySymbol}"#,##0.00`;
  worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= baseColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== SAY行 ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'SAY:';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== REMARK行 ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'REMARK:';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'Payment details: PAY 30%  IN advance';
  worksheet.getCell(`C${currentRow}`).font = { bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 条款行1 ==========
  worksheet.getCell(`A${currentRow}`).value = 1;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Payment Terms:';
  worksheet.getCell(`B${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = '30%';
  worksheet.getCell(`C${currentRow}`).font = { bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 条款行2 ==========
  worksheet.getCell(`A${currentRow}`).value = 2;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Trade Terms:';
  worksheet.getCell(`B${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'EXW Trade Term';
  worksheet.getCell(`C${currentRow}`).font = { bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 条款行3 ==========
  worksheet.getCell(`A${currentRow}`).value = 3;
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Delivery:';
  worksheet.getCell(`B${currentRow}`).font = { bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'Within 1 week after deposit';
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 银行信息标题行 ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Bank information:';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // ========== 签名行 ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'The Buyer';
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = customerName || '';
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'Seller:';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`F${currentRow}`).value = 'Guangzhou Explorer Auto Parts Co., Ltd';
  worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 22;
  const signatureRow = currentRow;
  
  // ========== 设置外边框加粗 ==========
  // 基础区域 A1:G{signatureRow}
  setOuterBorder(worksheet, 1, signatureRow, 1, baseColCount);
  
  // 如果有尺寸信息，为尺寸区域设置边框
  if (includeDimensions) {
    setOuterBorder(worksheet, headerRow, signatureRow, 8, totalColCount);
  }
  
  // 生成文件
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
