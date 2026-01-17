// Implement CSV generation optimized for Google Contacts import
export const generateCSV = (data: string[]): string => {
  if (data.length === 0) return '';
  // Google Contacts compatible headers: Name, Phone 1 - Value
  const headers = 'Name,Phone 1 - Value';
  // Use sequential indexing for names to keep the stealth mode consistent
  const rows = data.map((num, idx) => `Contact ${idx + 1},${num}`);
  
  return `${headers}\n${rows.join('\n')}`;
};

export const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};