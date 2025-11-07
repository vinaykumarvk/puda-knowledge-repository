// @ts-nocheck
import OpenAI from 'openai';
import fs from 'fs';
import pdf from 'pdf-parse';
import { storage } from '../storage';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface VectorStoreAnalysisResult {
  documentType: string;
  classification: string;
  confidence: number;
  keyInformation: {
    amounts?: string[];
    dates?: string[];
    parties?: string[];
    riskFactors?: string[];
    companyName?: string;
    financialMetrics?: Record<string, string>;
  };
  summary: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    score: number;
  };
  recommendations: string[];
  extractedText: string;
}

export class SimpleDocumentAnalysisService {
  
  /**
   * Simplified document analysis using direct OpenAI completion
   * Extracts text from PDF and analyzes directly without vector store complexity
   */
  async analyzeDocumentFromVectorStore(
    documentId: number,
    filePath: string,
    fileName: string
  ): Promise<VectorStoreAnalysisResult> {
    console.log(`Starting simplified document analysis for document ${documentId}: ${fileName}`);
    
    try {
      // Step 1: Extract text from PDF
      const fileBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(fileBuffer);
      const extractedText = pdfData.text;
      
      console.log(`Extracted ${extractedText.length} characters from PDF`);
      
      // Step 2: Analyze using GPT-4 directly
      const analysisPrompt = `
        Analyze the following investment document and provide a comprehensive analysis.
        
        Document: ${fileName}
        
        Content:
        ${extractedText.substring(0, 8000)}
        
        Please provide analysis in JSON format with the following structure:
        {
          "documentType": "type of document (e.g., financial_report, investment_proposal, etc.)",
          "classification": "document classification",
          "confidence": "confidence score between 0-1",
          "keyInformation": {
            "amounts": ["list of key amounts mentioned"],
            "dates": ["important dates"],
            "parties": ["key parties/companies mentioned"],
            "riskFactors": ["identified risk factors"],
            "companyName": "main company/entity",
            "financialMetrics": {"metric": "value"}
          },
          "summary": "detailed summary of the document",
          "riskAssessment": {
            "level": "low|medium|high",
            "factors": ["risk factors identified"],
            "score": "numeric score 1-10"
          },
          "recommendations": ["list of recommendations"]
        }
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a financial document analysis expert. Analyze documents thoroughly and provide structured insights." },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      });
      
      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      
      // Step 3: Format result according to interface
      const analysis: VectorStoreAnalysisResult = {
        documentType: analysisResult.documentType || 'unknown',
        classification: analysisResult.classification || 'unclassified',
        confidence: analysisResult.confidence || 0.5,
        keyInformation: analysisResult.keyInformation || {},
        summary: analysisResult.summary || 'Analysis completed',
        riskAssessment: {
          level: analysisResult.riskAssessment?.level || 'medium',
          factors: analysisResult.riskAssessment?.factors || [],
          score: analysisResult.riskAssessment?.score || 5
        },
        recommendations: analysisResult.recommendations || [],
        extractedText: extractedText.substring(0, 1000) // First 1000 chars for preview
      };
      
      // Step 4: Update database with results
      await this.updateDatabaseWithAnalysis(documentId, analysis);
      
      console.log(`Document analysis completed for document ${documentId}`);
      return analysis;
      
    } catch (error) {
      console.error(`Document analysis failed for document ${documentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Update database with analysis results
   */
  private async updateDatabaseWithAnalysis(
    documentId: number,
    analysis: VectorStoreAnalysisResult
  ): Promise<void> {
    try {
      await storage.updateDocument(documentId, {
        analysisResult: JSON.stringify(analysis),
        analysisStatus: 'completed'
      });
      
      console.log(`Database updated with analysis results for document ${documentId}`);
    } catch (error) {
      console.error(`Failed to update database for document ${documentId}:`, error);
      throw error;
    }
  }
}

export const simpleDocumentAnalysisService = new SimpleDocumentAnalysisService();