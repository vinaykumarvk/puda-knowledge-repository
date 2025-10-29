// Export utilities for RFP responses

export function generateMarkdownContent(data: any): string {
  // Generate markdown content from data
  return `# RFP Response\n\n${data.requirement}\n\n## Response\n\n${data.finalResponse || data.moaResponse || data.openaiResponse || ''}`;
}

export function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sendEmailWithContent(content: string, recipient: string) {
  // Placeholder for email sending functionality
  console.log('Email sending not implemented yet');
  return Promise.reject(new Error('Email functionality not implemented'));
}

export async function downloadExcelFile(data: any[], filename: string) {
  // Placeholder for Excel export - requires xlsx library
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RFP Responses');
  XLSX.writeFile(workbook, filename);
}
