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

// 默认字体设置
const DEFAULT_FONT: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 };

// 背景色定义
const LIGHT_GRAY_15: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } }; // 浅灰色15%
const LIGHT_BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAEEF3' } }; // 浅蓝色
const LIGHT_ORANGE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FDE9D9' } }; // 浅橙色

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
  
  // ========== 设置列宽（按用户要求） ==========
  worksheet.getColumn(1).width = 9.53;    // A - NO.
  worksheet.getColumn(2).width = 16.13;   // B - Item No.
  worksheet.getColumn(3).width = 24.8;    // C - Description
  worksheet.getColumn(4).width = 23.33;   // D - PICTURES
  worksheet.getColumn(5).width = 15.87;   // E - QTY/SET
  worksheet.getColumn(6).width = 16.33;   // F - PRICE
  worksheet.getColumn(7).width = 20.33;   // G - AMOUNT
  
  if (includeDimensions) {
    worksheet.getColumn(8).width = 7.27;   // H - L/cm
    worksheet.getColumn(9).width = 7.27;   // I - W/cm
    worksheet.getColumn(10).width = 7.27;  // J - H/cm
    worksheet.getColumn(11).width = 7.27;  // K - CBM/Per (m³)
    worksheet.getColumn(12).width = 7.27;  // L - CTN
    worksheet.getColumn(13).width = 7.27;  // M - CBM/m³
    worksheet.getColumn(14).width = 7.27;  // N - NW/kg
    worksheet.getColumn(15).width = 16.6;  // O - Note
  }
  
  let currentRow = 1;
  
  // ========== 第1行：公司名称（字体16，行高52） ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const companyCell = worksheet.getCell(`A${currentRow}`);
  companyCell.value = companyInfo?.companyName || 'GUANGZHOU EXPLORER AUTO PARTS CO.,LTD.';
  companyCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: '0000FF' } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 52;
  currentRow++;
  
  // ========== 第2行：公司地址（字体8，行高52） ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const addressCell = worksheet.getCell(`A${currentRow}`);
  const companyAddress = companyInfo?.address || 'ADD: No. 25 Daling Road, Daling, Baiyun District, Guangzhou City, Guangdong Province';
  const contactInfo = companyInfo?.phone && companyInfo?.email 
    ? `\n${companyInfo.phone}      Email: ${companyInfo.email}`
    : '\nChuang Lin 0086 18826074914      Email: linchuanglc@163.com';
  addressCell.value = companyAddress + contactInfo;
  addressCell.font = { name: 'Calibri', size: 8 };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getRow(currentRow).height = 52;
  currentRow++;
  
  // ========== 第3行：PROFORMA INVOICE（字体18，行高52） ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'PROFORMA INVOICE';
  titleCell.font = { name: 'Calibri', size: 18, bold: true, underline: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 52;
  currentRow++;
  
  // ========== 第4行：DATE 和 ORDER NO（字体10加粗，行高36） ==========
  worksheet.getCell(`A${currentRow}`).value = 'DATE:';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = new Date().toLocaleDateString('zh-CN');
  worksheet.getCell(`B${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'ORDER NO:';
  worksheet.getCell(`E${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`F${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 第5行：Consignee 和 Notify（字体10加粗，行高36） ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Consignee(ship to) :';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = customerName || '';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`E${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'Notify(bill to) :Same as Consignee';
  worksheet.getCell(`E${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 第6行：ADDRESS 和 LEAD TIME（字体10加粗，行高76） ==========
  worksheet.getCell(`A${currentRow}`).value = 'ADDRESS:';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`B${currentRow}:D${currentRow}`);
  worksheet.getCell(`B${currentRow}`).value = customerAddress || '';
  worksheet.getCell(`B${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`E${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'LEAD TIME:                                                                      \nSHIPPING MARKS：   ';
  worksheet.getCell(`E${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  worksheet.getRow(currentRow).height = 76;
  currentRow++;
  
  // ========== 第7行：PRICE TERM 等（字体10，行高36） ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'PRICE TERM :    +EXW';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'PAYMENT:Alibaba/TT/Alipay';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'SHIPPED VIA :';
  worksheet.getCell(`E${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`F${currentRow}`).value = 'DELIVERY TIME :';
  worksheet.getCell(`F${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 第8行：产品表格标题行（字体10，行高36，背景色） ==========
  const headerRow = currentRow;
  const baseHeaders = ['No.', 'Item No.', 'Description', 'PICTURES', 'QTY/ SET', 'PRICE', 'AMOUNT'];
  const dimHeaders = ['L/cm', 'W/cm', 'H/cm', 'CBM/Per', 'CTN', 'CBM/m³', 'NW/kg', 'Note'];
  const headers = includeDimensions ? [...baseHeaders, ...dimHeaders] : baseHeaders;
  
  const headerRowObj = worksheet.getRow(headerRow);
  headers.forEach((header, index) => {
    const cell = headerRowObj.getCell(index + 1);
    cell.value = header;
    cell.font = { ...DEFAULT_FONT, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorder(cell);
    // 设置背景色：A-G列
    if (index < 7) {
      cell.fill = includeDimensions ? LIGHT_BLUE : LIGHT_GRAY_15;
    }
  });
  headerRowObj.height = 36;
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
  
  // ========== 产品数据行（第9行开始，行高160） ==========
  const dataStartRow = currentRow;
  let totalAmount = 0;
  let totalCbmSum = 0; // 用于计算CBM/m³总和
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = worksheet.getRow(rowNum);
    
    const unitPriceConverted = item.unitPrice / 100 / rate;
    const subtotalConverted = item.subtotal / 100 / rate;
    totalAmount += subtotalConverted;
    
    // 基础列
    row.getCell(1).value = i + 1; // NO.
    row.getCell(1).font = { ...DEFAULT_FONT };
    row.getCell(2).value = item.productCode; // Item No.
    row.getCell(2).font = { ...DEFAULT_FONT };
    row.getCell(3).value = item.productName; // Description
    row.getCell(3).font = { ...DEFAULT_FONT };
    // 图片列 (4) 后面添加
    row.getCell(4).font = { ...DEFAULT_FONT };
    row.getCell(5).value = item.quantity; // QTY/SET
    row.getCell(5).font = { ...DEFAULT_FONT, bold: true };
    row.getCell(6).value = Number(unitPriceConverted.toFixed(2)); // PRICE
    row.getCell(6).font = { ...DEFAULT_FONT, bold: true };
    row.getCell(6).numFmt = `"${currencySymbol}"#,##0.00`;
    row.getCell(7).value = Number(subtotalConverted.toFixed(2)); // AMOUNT
    row.getCell(7).font = { ...DEFAULT_FONT, bold: true };
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
      row.getCell(8).font = { ...DEFAULT_FONT };
      // W/cm
      row.getCell(9).value = width > 0 ? Math.round(width) : '';
      row.getCell(9).font = { ...DEFAULT_FONT };
      // H/cm
      row.getCell(10).value = height > 0 ? Math.round(height) : '';
      row.getCell(10).font = { ...DEFAULT_FONT };
      // CBM/Per (单件体积)
      let cbmPer = 0;
      if (length > 0 && width > 0 && height > 0) {
        cbmPer = (length * width * height) / 1000000;
      } else if (unitVolume > 0) {
        cbmPer = unitVolume;
      }
      row.getCell(11).value = cbmPer > 0 ? Number(cbmPer.toFixed(6)) : '';
      row.getCell(11).font = { ...DEFAULT_FONT };
      // CTN (箱数)
      const ctn = pcsPerCarton > 0 ? item.quantity / pcsPerCarton : 0;
      row.getCell(12).value = ctn > 0 ? Number(ctn.toFixed(2)) : '';
      row.getCell(12).font = { ...DEFAULT_FONT };
      // CBM/m³ (总体积)
      const totalCbm = cbmPer * ctn;
      row.getCell(13).value = totalCbm > 0 ? Number(totalCbm.toFixed(6)) : '';
      row.getCell(13).font = { ...DEFAULT_FONT };
      totalCbmSum += totalCbm; // 累加CBM/m³
      // NW/kg (总净重)
      const totalWeight = item.quantity * unitWeight;
      row.getCell(14).value = totalWeight > 0 ? Number(totalWeight.toFixed(2)) : '';
      row.getCell(14).font = { ...DEFAULT_FONT };
      // Note
      row.getCell(15).value = item.note || '';
      row.getCell(15).font = { ...DEFAULT_FONT };
    }
    
    // 设置行样式（产品行行高160）
    row.height = 160;
    for (let col = 1; col <= totalColCount; col++) {
      const cell = row.getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setBorder(cell);
    }
  }
  
  // 添加图片到D列（D列是第4列，索引为3）
  // ExcelJS使用0索引，所以行号需要减1
  // dataStartRow是第9行（Excel中），在ExcelJS中是索引8
  for (let i = 0; i < items.length; i++) {
    const imageData = imageDataMap.get(i);
    if (imageData) {
      // Excel行号从1开始，ExcelJS的tl使用0索引
      // dataStartRow是Excel行号（例如第9行），转换为0索引需要减1
      const excelRowIndex = dataStartRow + i - 1; // 转换为0索引
      
      try {
        const imageId = workbook.addImage({
          base64: imageData.base64,
          extension: imageData.extension,
        });
        
        // 图片尺寸：宽146像素，高102像素
        // D列宽度23.33 Excel单位 ≈ 175像素
        // 行高160 Excel单位 ≈ 120像素
        // 水平居中偏移: (175-146)/2/175 ≈ 0.08
        // 垂直居中偏移: (120-102)/2/120 ≈ 0.075
        const colOffset = 0.08; // 水平居中偏移
        const rowOffset = 0.08; // 垂直居中偏移
        
        // 使用tl+br定位方式，确保图片严格在单元格内
        worksheet.addImage(imageId, {
          tl: { col: 3 + colOffset, row: excelRowIndex + rowOffset },
          br: { col: 3.92, row: excelRowIndex + 0.92 }, // 结束位置略小于单元格边界
          editAs: 'oneCell'
        } as any);
        console.log(`图片 ${i + 1} 已添加到Excel，行索引: ${excelRowIndex}`);
      } catch (error) {
        console.error(`添加图片 ${i + 1} 到Excel失败:`, error);
      }
    }
  }
  
  currentRow = dataStartRow + items.length;
  const totalRow = currentRow;
  
  // ========== Total行（行高60，A-F浅橙色背景） ==========
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Total';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`A${currentRow}`).fill = LIGHT_ORANGE;
  // 设置A-F的背景色
  for (let col = 1; col <= 6; col++) {
    worksheet.getCell(currentRow, col).fill = LIGHT_ORANGE;
  }
  worksheet.getCell(`G${currentRow}`).value = Number(totalAmount.toFixed(2));
  worksheet.getCell(`G${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`G${currentRow}`).numFmt = `"${currencySymbol}"#,##0.00`;
  worksheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= baseColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  
  // 如果导出尺寸，添加CBM汇总
  if (includeDimensions) {
    // H-L合并，显示"CBM :"
    worksheet.mergeCells(`H${currentRow}:L${currentRow}`);
    worksheet.getCell(`H${currentRow}`).value = 'CBM :';
    worksheet.getCell(`H${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
    worksheet.getCell(`H${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell(`H${currentRow}`).fill = LIGHT_BLUE;
    for (let col = 8; col <= 12; col++) {
      worksheet.getCell(currentRow, col).fill = LIGHT_BLUE;
      setBorder(worksheet.getCell(currentRow, col));
    }
    
    // M-O合并，显示CBM/m³总和（L列是第12列，但用户说L-O，应该是M-O，即第13-15列）
    worksheet.mergeCells(`M${currentRow}:O${currentRow}`);
    worksheet.getCell(`M${currentRow}`).value = totalCbmSum > 0 ? Number(totalCbmSum.toFixed(6)) : '';
    worksheet.getCell(`M${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
    worksheet.getCell(`M${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 13; col <= 15; col++) {
      setBorder(worksheet.getCell(currentRow, col));
    }
  }
  
  worksheet.getRow(currentRow).height = 60;
  currentRow++;
  
  // ========== SAY行（行高36） ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'SAY:';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== REMARK行（行高36） ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'REMARK:';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'Payment details: PAY 30%  IN advance';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT, bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 条款行1（行高36） ==========
  worksheet.getCell(`A${currentRow}`).value = 1;
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Payment Terms:';
  worksheet.getCell(`B${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = '30%';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT, bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 条款行2（行高36） ==========
  worksheet.getCell(`A${currentRow}`).value = 2;
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Trade Terms:';
  worksheet.getCell(`B${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'EXW Trade Term';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT, bold: true, color: { argb: 'FF0000' } };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 条款行3（行高36） ==========
  worksheet.getCell(`A${currentRow}`).value = 3;
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell(`B${currentRow}`).value = 'Delivery:';
  worksheet.getCell(`B${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = 'Within 1 week after deposit';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 银行信息标题行（行高36） ==========
  worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'Bank information:';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
  currentRow++;
  
  // ========== 签名行（行高36） ==========
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'The Buyer';
  worksheet.getCell(`A${currentRow}`).font = { ...DEFAULT_FONT, bold: true };
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`C${currentRow}`).value = customerName || '';
  worksheet.getCell(`C${currentRow}`).font = { ...DEFAULT_FONT };
  worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell(`E${currentRow}`).value = 'Seller:';
  worksheet.getCell(`E${currentRow}`).font = { ...DEFAULT_FONT };
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells(`F${currentRow}:${lastColLetter}${currentRow}`);
  worksheet.getCell(`F${currentRow}`).value = 'Guangzhou Explorer Auto Parts Co., Ltd';
  worksheet.getCell(`F${currentRow}`).font = { ...DEFAULT_FONT };
  worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
  for (let col = 1; col <= totalColCount; col++) {
    setBorder(worksheet.getCell(currentRow, col));
  }
  worksheet.getRow(currentRow).height = 36;
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
