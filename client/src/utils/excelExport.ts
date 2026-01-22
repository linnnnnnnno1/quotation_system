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
  pcsPerCarton?: number | null;
  unitWeight?: string | null;
  unitVolume?: string | null;
  note?: string | null;
}

export interface ExportOptions {
  items: QuotationItem[];
  currency: 'CNY' | 'USD';
  exchangeRate: number;
  includeDimensions: boolean;
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
        // 解析data URL获取扩展名
        const match = result.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
          const ext = match[1].toLowerCase();
          const base64Data = match[2];
          const extension = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg';
          return { base64: base64Data, extension };
        }
        // 如果没有前缀，假设是jpeg
        return { base64: result, extension: 'jpeg' };
      }
    }
    
    // 直接尝试fetch（可能会因CORS失败）
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

export async function exportQuotationToExcel(options: ExportOptions): Promise<Blob> {
  const { items, currency, exchangeRate, includeDimensions, companyInfo, imageProxyFn } = options;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('报价单');
  
  const currencySymbol = currency === 'CNY' ? '¥' : '$';
  const rate = currency === 'CNY' ? 1 : exchangeRate;
  
  // 设置列宽 - 按新顺序：产品编号、产品名称、图片、客户级别、数量、单价、金额、一箱X套、尺寸
  const baseColumns = [
    { width: 8.93 },   // A - 序号
    { width: 15.53 },  // B - 产品编号
    { width: 19.07 },  // C - 产品名称
    { width: 15 },     // D - 图片
    { width: 10 },     // E - 客户级别
    { width: 10 },     // F - 数量
    { width: 15.73 },  // G - 单价
    { width: 19.73 },  // H - 金额
  ];
  
  const dimensionColumns = [
    { width: 12 },  // I - 一箱X套
    { width: 18 },  // J - 尺寸
  ];
  
  worksheet.columns = includeDimensions 
    ? [...baseColumns, ...dimensionColumns]
    : baseColumns;
  
  // 公司信息头部
  let currentRow = 1;
  const lastCol = includeDimensions ? 'J' : 'H';
  
  // 行1 - 公司名称
  worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
  const companyCell = worksheet.getCell(`A${currentRow}`);
  companyCell.value = companyInfo?.companyName || 'Company Name';
  companyCell.font = { size: 16, bold: true, color: { argb: '0000FF' } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 26.6;
  currentRow++;
  
  // 行2 - 报价单标题
  worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'QUOTATION';
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 27.6;
  currentRow++;
  
  // 行3 - 日期
  worksheet.mergeCells(`A${currentRow}:${lastCol}${currentRow}`);
  const dateCell = worksheet.getCell(`A${currentRow}`);
  dateCell.value = `Date: ${new Date().toLocaleDateString()}`;
  dateCell.font = { underline: true };
  dateCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 23.1;
  currentRow++;
  
  // 行4-7 - 客户信息区域
  for (let i = 0; i < 4; i++) {
    worksheet.getRow(currentRow + i).height = 20.3;
  }
  
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'To:';
  worksheet.getCell(`E${currentRow}`).value = 'Notify:';
  currentRow++;
  
  worksheet.getCell(`A${currentRow}`).value = 'Address';
  worksheet.getCell(`E${currentRow}`).value = 'Shipping Marks:';
  currentRow++;
  
  worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
  worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'Shipped VIA:';
  currentRow++;
  currentRow++;
  
  // 表头行 - 新顺序
  const headerRow = currentRow;
  const headers = ['No.', 'Item No.', 'Description', 'Image', 'Level', 'QTY', `Unit Price(${currencySymbol})`, `Amount(${currencySymbol})`];
  if (includeDimensions) {
    headers.push('一箱X套', '尺寸 (L×W×H cm)');
  }
  
  const headerRowObj = worksheet.getRow(headerRow);
  headers.forEach((header, index) => {
    const cell = headerRowObj.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E0E0E0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRowObj.height = 31.5;
  currentRow++;
  
  // 预先获取所有图片
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
  
  // 数据行
  let totalAmount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = worksheet.getRow(rowNum);
    
    const unitPriceConverted = item.unitPrice / 100 / rate;
    const subtotalConverted = item.subtotal / 100 / rate;
    totalAmount += subtotalConverted;
    
    // 新列顺序
    row.getCell(1).value = i + 1; // 序号
    row.getCell(2).value = item.productCode; // 产品编号
    row.getCell(3).value = item.productName; // 产品名称
    // 图片列 (4) 后面添加
    row.getCell(5).value = item.customerLevel ? CUSTOMER_LEVELS[item.customerLevel] : '零售价'; // 客户级别
    row.getCell(6).value = item.quantity; // 数量
    row.getCell(7).value = Number(unitPriceConverted.toFixed(2)); // 单价
    row.getCell(8).value = Number(subtotalConverted.toFixed(2)); // 金额
    
    if (includeDimensions) {
      // 一箱X套
      row.getCell(9).value = item.pcsPerCarton ? `一箱${item.pcsPerCarton}套` : '';
      
      // 尺寸
      const dimension = (item.length && item.width && item.height)
        ? `${item.length}×${item.width}×${item.height}`
        : (item.note || '');
      row.getCell(10).value = dimension;
    }
    
    // 设置行高和样式
    row.height = 80;
    const colCount = includeDimensions ? 10 : 8;
    for (let col = 1; col <= colCount; col++) {
      const cell = row.getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
  
  // 添加图片
  for (let i = 0; i < items.length; i++) {
    const imageData = imageDataMap.get(i);
    if (imageData) {
      const rowNum = currentRow + i;
      try {
        const imageId = workbook.addImage({
          base64: imageData.base64,
          extension: imageData.extension,
        });
        
        // 图片放在D列（索引3）
        worksheet.addImage(imageId, {
          tl: { col: 3.1, row: rowNum - 0.9 } as any,
          br: { col: 3.9, row: rowNum - 0.1 } as any,
        });
        console.log(`图片 ${i + 1} 已添加到Excel`);
      } catch (error) {
        console.error(`添加图片 ${i + 1} 到Excel失败:`, error);
      }
    }
  }
  
  currentRow += items.length;
  
  // Total行
  const totalRow = worksheet.getRow(currentRow);
  const totalColCount = includeDimensions ? 10 : 8;
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(8).value = Number(totalAmount.toFixed(2));
  totalRow.getCell(8).font = { bold: true };
  totalRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.height = 30;
  
  // 设置边框
  for (let col = 1; col <= totalColCount; col++) {
    totalRow.getCell(col).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }
  
  // 生成文件
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
