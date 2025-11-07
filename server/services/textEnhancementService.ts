// @ts-nocheck
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type EnhancementType = 'professional' | 'grammar' | 'clarity' | 'rewrite';

interface EnhancementPrompts {
  [key: string]: {
    systemPrompt: string;
    userPrompt: string;
  };
}

// Single comprehensive enhancement prompt
const comprehensiveEnhancementPrompt = `You are an expert financial writing advisor and investment analyst who specializes in transforming investment descriptions into professional, polished content suitable for investment committees and financial institutions.

Your task is to enhance the provided investment description by:

1. GRAMMAR & LANGUAGE MECHANICS:
   - Fix all grammatical errors and spelling mistakes
   - Correct punctuation and sentence structure
   - Ensure proper verb tenses and subject-verb agreement
   - Improve word choice and vocabulary

2. PROFESSIONAL TONE & TERMINOLOGY:
   - Convert informal language to formal business terminology
   - Use sophisticated financial vocabulary where appropriate
   - Maintain a confident, authoritative tone
   - Ensure the text sounds like it was written by a seasoned investment professional

3. CLARITY & STRUCTURE:
   - Improve sentence structure and flow for better readability
   - Organize information logically and coherently
   - Remove ambiguity and confusion
   - Use clear, concise language while maintaining sophistication

4. CONTENT PRESERVATION:
   - Preserve all numerical data and key facts exactly as provided
   - Maintain the core investment thesis and reasoning
   - Keep all important information intact

5. FORMATTING REQUIREMENTS:
   - Output PLAIN TEXT only - no markdown formatting
   - Do NOT use asterisks (**) for bold text
   - Do NOT use headers with # symbols
   - Use clear paragraph breaks and logical flow instead
   - Format as readable plain text suitable for a text input field

Please enhance the following investment description:

{originalText}

Return only the enhanced investment description as plain text with no markdown formatting, explanations, meta-commentary, or additional text.`;

export async function enhanceText(text: string, type: EnhancementType = 'professional'): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error('Text is required for enhancement');
  }

  // Create the comprehensive prompt with the user's text
  const enhancementInput = comprehensiveEnhancementPrompt.replace('{originalText}', text.trim());

  try {
    // Use the same OpenAI Responses API pattern as the working services
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: enhancementInput,
    });

    const enhancedText = response.output?.[0]?.content?.[0]?.text?.trim();
    
    if (!enhancedText) {
      throw new Error('No enhancement received from AI');
    }

    return enhancedText;
  } catch (error) {
    console.error('Text enhancement error:', error);
    throw new Error(`Failed to enhance text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}