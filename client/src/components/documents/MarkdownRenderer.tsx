import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Enhanced markdown parser for formatting, tables, and source references
const parseMarkdown = (text: string): JSX.Element => {
  // First handle source references - convert them to a more readable format
  let processedText = text.replace(/【\d+:\d+†source】/g, (match) => {
    // Extract the numbers from the source reference
    const numbers = match.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      return `[Source: Page ${numbers[0]}, Section ${numbers[1]}]`;
    }
    return '[Source: Document]';
  });
  
  // Split text by lines to handle headers and tables
  const lines = processedText.split('\n');
  const processedElements: JSX.Element[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Handle headers
    if (line.startsWith('## ')) {
      processedElements.push(
        <h3 key={`h3-${i}`} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      processedElements.push(
        <h4 key={`h4-${i}`} className="text-base font-semibold mt-3 mb-2">{line.slice(4)}</h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      processedElements.push(
        <h5 key={`h5-${i}`} className="text-sm font-semibold mt-2 mb-1">{line.slice(5)}</h5>
      );
      i++;
      continue;
    }
    
    // Check if this line starts a table (contains pipe characters)
    if (line.includes('|') && line.trim().length > 0) {
      // Look ahead to find the table separator line and collect all table rows
      const tableRows: string[] = [line];
      let j = i + 1;
      
      // Check if next line is a table separator (contains ---|---)
      let hasSeparator = false;
      if (j < lines.length && lines[j].includes('-') && lines[j].includes('|')) {
        hasSeparator = true;
        j++; // Skip separator line
      }
      
      // Collect remaining table rows
      while (j < lines.length && lines[j].includes('|') && lines[j].trim().length > 0) {
        tableRows.push(lines[j]);
        j++;
      }
      
      // Only render as table if we have at least 2 rows and a separator
      if (tableRows.length >= 2 && hasSeparator) {
        const headerRow = tableRows[0];
        const dataRows = tableRows.slice(1);
        
        // Parse header
        const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
        
        processedElements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto">
            <table className="min-w-full border border-gray-300 dark:border-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {headers.map((header, headerIndex) => (
                    <th 
                      key={headerIndex} 
                      className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIndex) => {
                  const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
                  return (
                    <tr key={rowIndex} className="even:bg-gray-50 dark:even:bg-gray-800">
                      {cells.map((cell, cellIndex) => (
                        <td 
                          key={cellIndex} 
                          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                        >
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        
        i = j; // Skip all processed table lines
        continue;
      }
    }
    
    // Handle regular text lines with inline formatting
    if (line.trim().length > 0) {
      processedElements.push(
        <div key={`line-${i}`} className="mb-1">
          {parseInlineMarkdown(line)}
        </div>
      );
    } else {
      // Empty line for spacing
      processedElements.push(<div key={`space-${i}`} className="mb-2"></div>);
    }
    
    i++;
  }
  
  return <>{processedElements}</>;
};

// Helper function to parse inline markdown (bold, italic, sources)
const parseInlineMarkdown = (text: string): JSX.Element => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove the asterisks and make it bold
          const boldText = part.slice(2, -2);
          return <strong key={index}>{boldText}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          // Remove the asterisks and make it italic
          const italicText = part.slice(1, -1);
          return <em key={index}>{italicText}</em>;
        }
        // Check if this part contains source references and style them
        if (part.includes('[Source:')) {
          return (
            <span key={index}>
              {part.split(/(\[Source:.*?\])/g).map((subPart, subIndex) => {
                if (subPart.startsWith('[Source:')) {
                  return (
                    <span 
                      key={subIndex} 
                      className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs ml-1"
                      title="This information came from the analyzed document"
                    >
                      {subPart}
                    </span>
                  );
                }
                return <span key={subIndex}>{subPart}</span>;
              })}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;
  
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;