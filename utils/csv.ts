
export function generateCSV(numbers: string[]): string {
  let csv = 'Number,Phone Number\n';
  numbers.forEach((num, index) => {
    csv += `${index + 1},${num}\n`;
  });
  return csv;
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
