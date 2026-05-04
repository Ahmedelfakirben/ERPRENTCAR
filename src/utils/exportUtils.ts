/**
 * Universal utility for exporting data to CSV
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  // 1. Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // 2. Map data to rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      let val = row[header];
      
      // Handle nested objects (like clients.full_name)
      if (val && typeof val === 'object') {
        val = val.full_name || val.plate || JSON.stringify(val);
      }
      
      // Escape commas and quotes
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // 3. Build final string
  const csvString = [headers.join(','), ...csvRows].join('\n');
  
  // 4. Create download link
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
