// Implement CSV generation and browser download utilities
export const generateCSV = (data: string[]): string => {
  if (data.length === 0) return '';
  // Construct a standard CSV string with a header row
  return 'Phone Number\n' + data.join('\n');
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
  
  // Release the object URL to prevent memory leaks
  URL.revokeObjectURL(url);
};
