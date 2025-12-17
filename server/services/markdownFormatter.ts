/**
 * Markdown Formatter Utility
 * 
 * Validates and fixes common markdown formatting issues to ensure proper rendering.
 * Applied after response extraction but before returning to client.
 */

/**
 * Fix markdown formatting issues in a response string
 * @param content - The markdown content to fix
 * @returns Properly formatted markdown string
 */
export function fixMarkdownFormatting(content: string): string {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let fixed = content;

  // 1. Fix headers that are stuck to previous text with just spaces (inline headers)
  // e.g., "some text ## Header" -> "some text\n\n## Header"
  // Only match when there's non-whitespace before the space(s) before ##
  fixed = fixed.replace(/(\S)[ \t]+(#{1,6}\s)/g, '$1\n\n$2');

  // 2. Fix citation markers followed immediately by headers
  // e.g., "[1] ## 2." -> "[1]\n\n## 2."
  fixed = fixed.replace(/(\[\d+\])[ \t]*(#{1,6}\s)/g, '$1\n\n$2');

  // 3. Ensure headers at start of line have blank line before (if not at start of content)
  // Only add newline if preceded by text on previous line (not already blank)
  fixed = fixed.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

  // 4. Ensure blank line after headers (header followed immediately by non-blank content)
  // Match header lines followed by content without blank line
  fixed = fixed.replace(/(#{1,6}\s+[^\n]+)\n([^\n#\-\*\d>\s])/g, '$1\n\n$2');

  // 5. Ensure blank lines before unordered list items (- or *)
  // Only if preceded by non-list content on previous line
  fixed = fixed.replace(/([^\n\-\*\s])\n([\-\*]\s)/g, '$1\n\n$2');

  // 6. Ensure blank lines before numbered list items
  // Only if preceded by non-list content
  fixed = fixed.replace(/([^\n\d\s])\n(\d+\.\s)/g, '$1\n\n$2');

  // 7. Ensure blank lines before code blocks (```)
  fixed = fixed.replace(/([^\n])\n(```)/g, '$1\n\n$2');

  // 8. Ensure blank lines after code blocks
  fixed = fixed.replace(/(```[^\n]*)\n([^\n`])/g, '$1\n\n$2');

  // 9. Ensure blank lines before blockquotes (>)
  fixed = fixed.replace(/([^\n>])\n(>\s)/g, '$1\n\n$2');

  // 10. Fix horizontal rules (--- or ***) - ensure blank lines around them
  fixed = fixed.replace(/([^\n])\n(---+|\*\*\*+)\n/g, '$1\n\n$2\n');
  fixed = fixed.replace(/\n(---+|\*\*\*+)\n([^\n])/g, '\n$1\n\n$2');

  // 11. Ensure tables have blank lines before and after
  fixed = fixed.replace(/([^\n\|])\n(\|[^\n]+\|)/g, '$1\n\n$2');
  fixed = fixed.replace(/(\|[^\n]+\|)\n([^\n\|\s])/g, '$1\n\n$2');

  // 12. Clean up excessive blank lines (more than 2 consecutive newlines -> 2)
  fixed = fixed.replace(/\n{3,}/g, '\n\n');

  // 13. Trim leading/trailing whitespace but preserve internal structure
  fixed = fixed.trim();

  return fixed;
}

/**
 * Validate markdown structure and return issues found
 * @param content - The markdown content to validate
 * @returns Array of issues found (empty if valid)
 */
export function validateMarkdown(content: string): string[] {
  const issues: string[] = [];

  if (!content || typeof content !== 'string') {
    return ['Content is empty or not a string'];
  }

  // Check for headers without preceding blank lines
  const headerWithoutBlankLine = /[^\n]\n#{1,6}\s+/g;
  if (headerWithoutBlankLine.test(content)) {
    issues.push('Headers found without preceding blank line');
  }

  // Check for unclosed code blocks
  const codeBlocks = content.match(/```/g);
  if (codeBlocks && codeBlocks.length % 2 !== 0) {
    issues.push('Unclosed code block detected');
  }

  // Check for unclosed bold markers
  const boldMarkers = content.match(/\*\*/g);
  if (boldMarkers && boldMarkers.length % 2 !== 0) {
    issues.push('Unclosed bold markers detected');
  }

  // Check for malformed links
  const malformedLinks = /\[[^\]]*\]\([^)]*$/gm;
  if (malformedLinks.test(content)) {
    issues.push('Malformed link detected');
  }

  return issues;
}

/**
 * Fix and validate markdown content
 * @param content - The markdown content
 * @returns Object with fixed content and any remaining issues
 */
export function processMarkdown(content: string): {
  content: string;
  wasFixed: boolean;
  issues: string[];
} {
  const originalContent = content;
  const fixedContent = fixMarkdownFormatting(content);
  const issues = validateMarkdown(fixedContent);

  return {
    content: fixedContent,
    wasFixed: originalContent !== fixedContent,
    issues
  };
}

