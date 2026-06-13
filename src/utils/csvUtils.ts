import { ParkingSpot } from '@/types/parking';

export function exportSpotsToCSV(spots: ParkingSpot[]): string {
  const headers = ['ID', '楼层', '行', '列', '是否占用', '车牌号', '车辆类型'];
  const rows = spots.map(spot => [
    spot.id,
    spot.floor,
    spot.row,
    spot.col,
    spot.isOccupied ? '是' : '否',
    spot.plateNumber || '',
    spot.vehicleType || 'none',
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
}

export function downloadCSV(content: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(csvText: string): ParkingSpot[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const spots: ParkingSpot[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 7) continue;
    
    const spot: ParkingSpot = {
      id: values[0].trim(),
      floor: parseInt(values[1]),
      row: parseInt(values[2]),
      col: parseInt(values[3]),
      isOccupied: values[4].trim() === '是' || values[4].trim() === 'true' || values[4].trim() === '1',
      plateNumber: values[5].trim() || undefined,
      vehicleType: (values[6].trim() as 'car' | 'suv' | 'none') || 'none',
      position: { x: 0, y: 0, z: 0 },
    };
    
    if (!isNaN(spot.floor) && !isNaN(spot.row) && !isNaN(spot.col)) {
      spots.push(spot);
    }
  }
  
  return spots;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
