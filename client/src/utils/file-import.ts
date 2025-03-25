// Utility functions for handling file imports

/**
 * Extracts the file extension from a file name
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Checks if the file is a CSV file
 */
export function isCSVFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return extension === 'csv';
}

/**
 * Checks if the file is an Excel file (xls or xlsx)
 */
export function isExcelFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return extension === 'xlsx' || extension === 'xls';
}

/**
 * Parses CSV data to extract rows and cells
 * Uses a proper CSV parser that handles quotes and commas within cells
 */
export function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  const result: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    
    cells.push(currentCell.trim());
    result.push(cells);
  }
  
  return result;
}