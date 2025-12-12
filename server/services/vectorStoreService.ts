// @ts-nocheck
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set');
}

export interface VectorStoreDocument {
  id: string;
  documentId: number;
  fileId: string;
  vectorStoreId: string;
  status: 'uploading' | 'completed' | 'failed';
  fileName: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentQuery {
  query: string;
  vectorStoreId?: string;
  fileId?: string;
  limit?: number;
}

export interface QueryResult {
  content: string;
  fileName: string;
  fileId: string;
  score: number;
  metadata: {
    documentId: number;
    uploadDate: Date;
    fileSize: number;
  };
}

export interface VectorStoreInfo {
  id: string;
  name: string;
  fileCount: number;
  usageBytes: number;
  status: string;
  expiresAt?: Date;
}

export class VectorStoreService {
  private defaultVectorStoreName = 'ABCBank-Documents';
  private vectorStoreExpiry = 30; // days

  async getOrCreateVectorStore(name?: string): Promise<VectorStoreInfo> {
    const storeName = name || this.defaultVectorStoreName;
    
    try {
      // Check if OpenAI client is properly initialized
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }
      
      // Use real OpenAI Vector Store API
      const vectorStores = await openai.vectorStores.list();
      const existingStore = vectorStores.data.find(store => store.name === storeName);
          
      if (existingStore) {
        return {
          id: existingStore.id,
          name: existingStore.name,
          fileCount: existingStore.file_counts.total,
          usageBytes: existingStore.usage_bytes,
          status: existingStore.status,
          expiresAt: existingStore.expires_at ? new Date(existingStore.expires_at * 1000) : undefined
        };
      }
      
      // Create new vector store
      const vectorStore = await openai.vectorStores.create({
        name: storeName,
        expires_after: {
          anchor: 'last_active_at',
          days: this.vectorStoreExpiry
        }
      });
      
      return {
        id: vectorStore.id,
        name: vectorStore.name,
        fileCount: vectorStore.file_counts.total,
        usageBytes: vectorStore.usage_bytes,
        status: vectorStore.status,
        expiresAt: vectorStore.expires_at ? new Date(vectorStore.expires_at * 1000) : undefined
      };
    } catch (error) {
      console.error('Error creating/getting vector store:', error);
      throw new Error(`Failed to create vector store: ${error.message}`);
    }
  }

  async uploadDocumentToVectorStore(
    documentId: number, 
    filePath: string, 
    vectorStoreId?: string
  ): Promise<VectorStoreDocument> {
    try {
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Get or create vector store
      const vectorStore = await this.getOrCreateVectorStore();
      const storeId = vectorStoreId || vectorStore.id;

      // Upload file to OpenAI
      console.log('OpenAI client status:', {
        hasFiles: !!openai.files,
        hasVectorStores: !!openai.vectorStores,
        hasCreate: !!openai.files?.create
      });
      
      const fileStream = fs.createReadStream(filePath);
      const file = await openai.files.create({
        file: fileStream,
        purpose: 'assistants',
      });

      // Add file to vector store
      await openai.vectorStores.files.create(storeId, {
        file_id: file.id,
      });

      // Update document record with OpenAI file ID
      await storage.updateDocument(documentId, {
        analysisResult: JSON.stringify({
          openai_file_id: file.id,
          vector_store_id: storeId,
          upload_status: 'completed'
        })
      });

      const fileStats = fs.statSync(filePath);
      
      return {
        id: `${documentId}-${file.id}`,
        documentId,
        fileId: file.id,
        vectorStoreId: storeId,
        status: 'completed',
        fileName: document.fileName,
        fileSize: fileStats.size,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error uploading document to vector store:', error);
      
      // Update document status to failed
      await storage.updateDocument(documentId, {
        analysisResult: JSON.stringify({
          error: error.message,
          upload_status: 'failed'
        })
      });
      
      throw error;
    }
  }

  async batchUploadDocuments(documentIds: number[]): Promise<VectorStoreDocument[]> {
    const results: VectorStoreDocument[] = [];
    const vectorStore = await this.getOrCreateVectorStore();
    
    // Process documents in batches of 10 to avoid API limits
    const batchSize = 10;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (documentId) => {
        try {
          const document = await storage.getDocument(documentId);
          if (!document) {
            throw new Error(`Document ${documentId} not found`);
          }
          
          const { getUploadFilePath } = await import('../utils/uploadPaths');
          const filePath = getUploadFilePath(document.fileName);
          return await this.uploadDocumentToVectorStore(documentId, filePath, vectorStore.id);
        } catch (error) {
          console.error(`Failed to upload document ${documentId}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
    }
    
    return results;
  }

  async queryVectorStore(query: DocumentQuery): Promise<QueryResult[]> {
    try {
      const vectorStore = await this.getOrCreateVectorStore();
      const storeId = query.vectorStoreId || vectorStore.id;
      
      // Create a temporary assistant for querying
      const assistant = await openai.beta.assistants.create({
        name: 'Document Query Assistant',
        instructions: `You are a helpful assistant that searches through uploaded documents to answer questions. 
        Focus on providing accurate information from the documents and cite which document the information comes from.
        If information is not available in the documents, clearly state that.`,
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [storeId]
          }
        }
      });
      
      // Create a thread and run the query
      const thread = await openai.beta.threads.create();
      
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: query.query
      });
      
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id
      });
      
      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          // Extract file citations from the response
          const citations = assistantMessage.content[0].text.annotations || [];
          
          const results: QueryResult[] = [];
          
          // Parse the response and create results
          const responseText = assistantMessage.content[0].text.value;
          
          // For now, return a single result with the full response
          // In a more sophisticated implementation, we would parse citations
          results.push({
            content: responseText,
            fileName: 'Multiple documents',
            fileId: 'vector-store-search',
            score: 1.0,
            metadata: {
              documentId: 0,
              uploadDate: new Date(),
              fileSize: 0
            }
          });
          
          // Clean up temporary assistant
          await openai.beta.assistants.delete(assistant.id);
          
          return results;
        }
      }
      
      // Clean up temporary assistant
      await openai.beta.assistants.delete(assistant.id);
      
      throw new Error('Query execution failed');
    } catch (error) {
      console.error('Error querying vector store:', error);
      throw new Error(`Vector store query failed: ${error.message}`);
    }
  }

  async querySpecificDocument(fileId: string, query: string): Promise<QueryResult[]> {
    try {
      // Create a temporary assistant for querying specific file
      const assistant = await openai.beta.assistants.create({
        name: 'Document Query Assistant',
        instructions: `You are a helpful assistant that searches through a specific document to answer questions. 
        Focus on providing accurate information from the document and be specific about what information is available.
        If information is not available in the document, clearly state that.`,
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [] // We'll attach the file directly
          }
        }
      });
      
      // Create a thread and attach the specific file
      const thread = await openai.beta.threads.create({
        tool_resources: {
          file_search: {
            vector_store_ids: [] // File will be attached to message
          }
        }
      });
      
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: query,
        attachments: [
          {
            file_id: fileId,
            tools: [{ type: 'file_search' }]
          }
        ]
      });
      
      const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id
      });
      
      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const responseText = assistantMessage.content[0].text.value;
          
          // Get file info
          const fileInfo = await openai.files.retrieve(fileId);
          
          const results: QueryResult[] = [{
            content: responseText,
            fileName: fileInfo.filename,
            fileId: fileId,
            score: 1.0,
            metadata: {
              documentId: 0,
              uploadDate: new Date(fileInfo.created_at * 1000),
              fileSize: fileInfo.bytes
            }
          }];
          
          // Clean up temporary assistant
          await openai.beta.assistants.delete(assistant.id);
          
          return results;
        }
      }
      
      // Clean up temporary assistant
      await openai.beta.assistants.delete(assistant.id);
      
      throw new Error('Query execution failed');
    } catch (error) {
      console.error('Error querying specific document:', error);
      throw new Error(`Document query failed: ${error.message}`);
    }
  }

  async analyzeDocumentViaVectorStore(fileId: string, fileName: string): Promise<any> {
    try {
      console.log(`Starting vector store analysis for file: ${fileName} (${fileId})`);
      
      // Wait a moment for vector store to process the file
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Execute multiple analysis queries
      const analysisQueries = [
        {
          key: 'classification',
          query: `What type of document is this? Classify it as one of: financial_statement, annual_report, contract, proposal, due_diligence, legal_document, or other. Also provide a more specific subtype and confidence level (0-1). Respond in JSON format with keys: type, subtype, confidence.`
        },
        {
          key: 'keyInformation',
          query: `Extract key information from this document including: company name, financial metrics (revenue, profit, etc.), monetary amounts, important dates, parties involved, and risk factors. Respond in JSON format with keys: companyName, financialMetrics (object), amounts (array), dates (array), parties (array), riskFactors (array).`
        },
        {
          key: 'summary',
          query: `Provide a comprehensive summary of this document's main points, key findings, and critical information. Focus on the most important aspects that would be relevant for investment decisions. Keep it concise but informative (3-5 sentences).`
        },
        {
          key: 'riskAssessment',
          query: `Analyze the risks mentioned in this document. Categorize the overall risk level as low, medium, or high. List specific risk factors and provide a risk score from 1-100. Respond in JSON format with keys: level (low/medium/high), factors (array), score (number).`
        },
        {
          key: 'recommendations',
          query: `Based on the document content, provide actionable recommendations for investment decisions. Focus on specific steps or considerations that would be valuable for analysts and decision-makers. Provide as an array of recommendation strings.`
        }
      ];

      const results = {};
      
      // Execute queries sequentially to avoid rate limits
      for (const query of analysisQueries) {
        try {
          console.log(`Executing ${query.key} query...`);
          const queryResults = await this.querySpecificDocument(fileId, query.query);
          if (queryResults.length > 0) {
            let content = queryResults[0].content;
            
            // Try to parse JSON responses
            if (query.key === 'classification' || query.key === 'keyInformation' || query.key === 'riskAssessment') {
              try {
                // Extract JSON from response if it exists
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  content = JSON.parse(jsonMatch[0]);
                }
              } catch (parseError) {
                console.warn(`Failed to parse JSON for ${query.key}, using raw content`);
              }
            }
            
            // For recommendations, try to extract array
            if (query.key === 'recommendations') {
              try {
                const arrayMatch = content.match(/\[([\s\S]*)\]/);
                if (arrayMatch) {
                  content = JSON.parse(`[${arrayMatch[1]}]`);
                } else {
                  // Split by lines or bullet points
                  content = content.split('\n').filter(line => line.trim()).map(line => line.replace(/^[-*•]\s*/, ''));
                }
              } catch (parseError) {
                content = [content];
              }
            }
            
            results[query.key] = content;
          }
        } catch (queryError) {
          console.error(`Error in ${query.key} query:`, queryError);
          results[query.key] = null;
        }
      }

      // Structure the analysis result
      const documentAnalysis = {
        documentType: results.classification?.type || 'unknown',
        classification: results.classification?.subtype || 'unknown',
        confidence: results.classification?.confidence || 0.5,
        keyInformation: {
          companyName: results.keyInformation?.companyName || '',
          financialMetrics: results.keyInformation?.financialMetrics || {},
          amounts: results.keyInformation?.amounts || [],
          dates: results.keyInformation?.dates || [],
          parties: results.keyInformation?.parties || [],
          riskFactors: results.keyInformation?.riskFactors || []
        },
        summary: results.summary || 'Analysis summary not available',
        riskAssessment: {
          level: results.riskAssessment?.level || 'medium',
          factors: results.riskAssessment?.factors || [],
          score: results.riskAssessment?.score || 50
        },
        recommendations: Array.isArray(results.recommendations) ? results.recommendations : [results.recommendations || 'No recommendations available'],
        extractedText: 'Content processed via OpenAI Vector Store',
        analysisMethod: 'vector_store',
        processedAt: new Date().toISOString()
      };

      console.log(`Vector store analysis completed for ${fileName}`);
      return documentAnalysis;
      
    } catch (error) {
      console.error('Error in vector store document analysis:', error);
      throw new Error(`Vector store analysis failed: ${error.message}`);
    }
  }

  async getVectorStoreInfo(vectorStoreId?: string): Promise<VectorStoreInfo> {
    try {
      if (vectorStoreId) {
        // Try to retrieve specific vector store from OpenAI
        const vectorStore = await openai.vectorStores.retrieve(vectorStoreId);
        
        // Handle real OpenAI vector store response
        if (typeof vectorStore === 'object' && 'file_counts' in vectorStore && vectorStore.file_counts) {
          return {
            id: vectorStore.id,
            name: vectorStore.name,
            fileCount: vectorStore.file_counts.total,
            usageBytes: vectorStore.usage_bytes,
            status: vectorStore.status,
            expiresAt: vectorStore.expires_at ? new Date(vectorStore.expires_at * 1000) : undefined
          };
        }
        
        return vectorStore as VectorStoreInfo;
      } else {
        // Get or create default vector store
        const vectorStore = await this.getOrCreateVectorStore();
        
        // Check if this is a simulated vector store (our temporary implementation)
        if (typeof vectorStore === 'object' && 'id' in vectorStore && vectorStore.id.startsWith('vs_sim_')) {
          return vectorStore as VectorStoreInfo;
        }
        
        // Handle real OpenAI vector store response
        if (typeof vectorStore === 'object' && 'file_counts' in vectorStore && vectorStore.file_counts) {
          return {
            id: vectorStore.id,
            name: vectorStore.name,
            fileCount: vectorStore.file_counts.total,
            usageBytes: vectorStore.usage_bytes,
            status: vectorStore.status,
            expiresAt: vectorStore.expires_at ? new Date(vectorStore.expires_at * 1000) : undefined
          };
        }
        
        return vectorStore as VectorStoreInfo;
      }
    } catch (error) {
      console.error('Error getting vector store info:', error);
      throw new Error(`Failed to get vector store info: ${error.message}`);
    }
  }

  async listVectorStoreFiles(vectorStoreId?: string): Promise<Array<{
    id: string;
    fileName: string;
    status: string;
    createdAt: Date;
    usageBytes: number;
  }>> {
    try {
      const vectorStore = await this.getOrCreateVectorStore();
      const storeId = vectorStoreId || vectorStore.id;
      
      // Use real OpenAI vector store files API
      const files = await openai.vectorStores.files.list(storeId);
      
      return files.data.map(file => ({
        id: file.id,
        fileName: file.id, // We'll need to get filename from our database
        status: file.status,
        createdAt: new Date(file.created_at * 1000),
        usageBytes: file.usage_bytes
      }));
    } catch (error) {
      console.error('Error listing vector store files:', error);
      throw new Error(`Failed to list vector store files: ${error.message}`);
    }
  }

  async deleteDocumentFromVectorStore(fileId: string, vectorStoreId?: string): Promise<void> {
    try {
      const vectorStore = await this.getOrCreateVectorStore();
      const storeId = vectorStoreId || vectorStore.id;
      
      await openai.vectorStores.files.del(storeId, fileId);
      await openai.files.del(fileId);
    } catch (error) {
      console.error('Error deleting document from vector store:', error);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }
}

export const vectorStoreService = new VectorStoreService();