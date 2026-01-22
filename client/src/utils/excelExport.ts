import ExcelJS from 'exceljs';

export interface QuotationItem {
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
): Promise<string | null> {
  if (!url) return null;
  
  try {
    if (proxyFn) {
      return await proxyFn(url);
    }
    
    // 直接尝试fetch
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
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
  
  // 设置列宽
  const baseColumns = [
    { width: 8.93 },   // A - 序号
    { width: 15.53 },  // B - 产品编号
    { width: 19.07 },  // C - 产品名称
    { width: 15 },     // D - 图片
    { width: 15.27 },  // E - 数量
    { width: 15.73 },  // F - 单价
    { width: 19.73 },  // G - 金额
  ];
  
  const dimensionColumns = [
    { width: 8 },  // H - L/cm
    { width: 8 },  // I - W/cm
    { width: 8 },  // J - H/cm
    { width: 8 },  // K - m³
    { width: 8 },  // L - CTN
    { width: 8 },  // M - CBM/m³
    { width: 8 },  // N - NW/kg
    { width: 15 }, // O - 备注
  ];
  
  worksheet.columns = includeDimensions 
    ? [...baseColumns, ...dimensionColumns]
    : baseColumns;
  
  // 公司信息头部
  let currentRow = 1;
  
  // 行1 - 公司名称
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const companyCell = worksheet.getCell(`A${currentRow}`);
  companyCell.value = companyInfo?.companyName || 'Company Name';
  companyCell.font = { size: 16, bold: true, color: { argb: '0000FF' } };
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 26.6;
  currentRow++;
  
  // 行2 - 报价单标题
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = 'QUOTATION';
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 27.6;
  currentRow++;
  
  // 行3 - 日期
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
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
  
  // 表头行
  const headerRow = currentRow;
  const headers = ['No.', 'Item No.', 'Description', 'Image', 'QTY', `Unit Price(${currencySymbol})`, `Amount(${currencySymbol})`];
  if (includeDimensions) {
    headers.push('L/cm', 'W/cm', 'H/cm', 'm³', 'CTN', 'CBM/m³', 'NW/kg', 'Note');
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
  
  // 数据行
  let totalAmount = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = currentRow + i;
    const row = worksheet.getRow(rowNum);
    
    const unitPriceConverted = item.unitPrice / 100 / rate;
    const subtotalConverted = item.subtotal / 100 / rate;
    totalAmount += subtotalConverted;
    
    row.getCell(1).value = i + 1;
    row.getCell(2).value = item.productCode;
    row.getCell(3).value = item.productName;
    // 图片列暂时留空，后面添加
    row.getCell(5).value = item.quantity;
    row.getCell(6).value = Number(unitPriceConverted.toFixed(2));
    row.getCell(7).value = Number(subtotalConverted.toFixed(2));
    
    if (includeDimensions) {
      row.getCell(8).value = item.length ? Math.round(parseFloat(item.length)) : '';
      row.getCell(9).value = item.width ? Math.round(parseFloat(item.width)) : '';
      row.getCell(10).value = item.height ? Math.round(parseFloat(item.height)) : '';
      
      // 计算体积
      const volume = item.unitVolume 
        ? parseFloat(item.unitVolume)
        : (item.length && item.width && item.height)
          ? (parseFloat(item.length) * parseFloat(item.width) * parseFloat(item.height)) / 1000000
          : null;
      row.getCell(11).value = volume ? Number(volume.toFixed(1)) : '';
      
      row.getCell(12).value = item.pcsPerCarton || '';
      
      // CBM = 体积 * 数量
      const cbm = volume ? volume * item.quantity : null;
      row.getCell(13).value = cbm ? Number(cbm.toFixed(1)) : '';
      
      row.getCell(14).value = item.unitWeight ? Math.round(parseFloat(item.unitWeight)) : '';
      row.getCell(15).value = item.note || '';
    }
    
    // 设置行高和样式
    row.height = 160;
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // 尝试添加图片
    if (item.imageUrl) {
      try {
        const base64 = await imageUrlToBase64(item.imageUrl, imageProxyFn);
        if (base64) {
          const imageId = workbook.addImage({
            base64: base64.split(',')[1] || base64,
            extension: 'jpeg',
          });
          
          worksheet.addImage(imageId, {
            tl: { col: 3, row: rowNum - 1 } as any,
            br: { col: 4, row: rowNum } as any,
            editAs: 'oneCell',
          });
        }
      } catch (error) {
        console.error('Failed to add image:', error);
      }
    }
  }
  
  currentRow += items.length;
  
  // Total行
  const totalRow = worksheet.getRow(currentRow);
  worksheet.mergeCells(`A${currentRow}:F${currentRow}`);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(7).value = Number(totalAmount.toFixed(2));
  totalRow.getCell(7).font = { bold: true };
  totalRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.height = 30;
  
  // 设置边框
  for (let col = 1; col <= (includeDimensions ? 15 : 7); col++) {
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
