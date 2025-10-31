import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  // Enhanced markdown parser for investment proposals
  const parseMarkdown = (text: string): string => {
    if (!text) return '';

    return text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-10 mb-6 text-gray-900 dark:text-gray-100">$1</h1>')
      
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
      
      // Italic text
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Blockquotes
      .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300">$1</blockquote>')
      
      // Unordered lists
      .replace(/^\* (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      
      // Numbered lists
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>')
      
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br/>')
      
      // Wrap in paragraphs
      .replace(/^(?!<[h|l|b])(.+)/gm, '<p class="mb-4">$1</p>')
      
      // Clean up extra paragraph tags around headers and lists
      .replace(/<p class="mb-4">(<h[1-6].*<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<li.*<\/li>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<blockquote.*<\/blockquote>)<\/p>/g, '$1')
      
      // Wrap consecutive list items in ul tags
      .replace(/(<li class="ml-4 mb-1[^>]*>.*?<\/li>)/g, '<ul class="mb-4">$1</ul>')
      .replace(/<\/ul>\s*<ul class="mb-4">/g, '');
  };

  const parseTables = (text: string): string => {
    // Handle markdown tables
    const tableRegex = /\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)+)/g;
    
    return text.replace(tableRegex, (match, header, rows) => {
      const headerCells = header.split('|')
        .filter((cell: string) => cell.trim())
        .map((cell: string) => `<th class="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-50 dark:bg-gray-700 font-semibold text-left">${cell.trim()}</th>`)
        .join('');

      const bodyRows = rows.trim().split('\n')
        .filter((row: string) => row.trim())
        .map((row: string) => {
          const cells = row.split('|')
            .filter((cell: string) => cell.trim())
            .map((cell: string) => `<td class="border border-gray-300 dark:border-gray-600 px-4 py-2">${cell.trim()}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        }).join('');

      return `<div class="overflow-x-auto my-6">
        <table class="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    });
  };

  const renderContent = () => {
    let processed = parseMarkdown(content);
    processed = parseTables(processed);
    
    return { __html: processed };
  };

  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={renderContent()}
    />
  );
};