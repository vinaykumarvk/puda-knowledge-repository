// @ts-nocheck
import fetch from 'node-fetch';

const PYTHON_API_BASE_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

export class PythonVectorStoreService {
  
  /**
   * Upload file to OpenAI Files API via Python service
   */
  async uploadFileToOpenAI(filePath: string): Promise<{
    success: boolean;
    file?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/upload_file_to_openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error uploading file to OpenAI via Python service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Attach file to vector store with attributes via Python service
   */
  async attachFileToVectorStore(
    fileId: string,
    filename: string,
    vectorStoreId?: string,
    customAttributes?: Record<string, string>
  ): Promise<{
    success: boolean;
    vector_store_file?: any;
    applied_attributes?: Record<string, string>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/attach_file_to_vector_store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          filename: filename,
          vector_store_id: vectorStoreId,
          attributes: customAttributes || {}
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error attaching file to vector store via Python service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Combined upload and attach in one call
   */
  async uploadAndAttachFile(
    filePath: string,
    vectorStoreId?: string,
    customAttributes?: Record<string, string>
  ): Promise<{
    success: boolean;
    file?: any;
    vector_store_file?: any;
    applied_attributes?: Record<string, string>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/upload_and_attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          vector_store_id: vectorStoreId,
          attributes: customAttributes || {}
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error in upload and attach via Python service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check for Python service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${PYTHON_API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      
      const result = await response.json();
      return result.status === 'healthy';
    } catch (error) {
      console.error('Python service health check failed:', error);
      return false;
    }
  }
}

export const pythonVectorStoreService = new PythonVectorStoreService();