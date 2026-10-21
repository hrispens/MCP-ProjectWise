import fetch, { Response } from 'node-fetch';
import { ProjectWiseConfig } from './config.js';

/**
 * ProjectWise WSG REST API Client
 * Handles authentication and common API operations
 */
export class ProjectWiseClient {
  private config: ProjectWiseConfig;
  private readonly repoPath: string;

  constructor(config: ProjectWiseConfig) {
    this.config = config;
    this.validateGuid(config.repositoryId, 'repository ID');
    this.repoPath = `/Repositories/${config.repositoryId}`;
  }

  private validateGuid(value: string, label: string): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error(`Invalid ProjectWise ${label}: expected a GUID`);
    }
  }

  /**
   * Build common headers required by WSG
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Mas-App-Guid': this.config.appGuid,
      'Mas-Uuid': this.config.sessionUuid,
    };

    headers['Authorization'] = `Bearer ${this.config.token}`;

    return headers;
  }

  /**
   * Build full URL for WSG endpoint
   */
  private buildUrl(endpoint: string, queryParams?: Record<string, string>): string {
    const url = new URL(endpoint, this.config.baseUrl);
    const base = new URL(this.config.baseUrl);
    const repositoryPrefix = `${this.repoPath}/`;
    if (
      url.origin !== base.origin ||
      (url.pathname !== this.repoPath && !url.pathname.startsWith(repositoryPrefix))
    ) {
      throw new Error('Refusing WSG request outside the configured repository');
    }

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Make a GET request to WSG
   */
  async get<T>(endpoint: string, queryParams?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(endpoint, queryParams);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    await this.checkResponse(response);
    return response.json() as Promise<T>;
  }

  /**
   * Check response and throw on error
   */
  private async checkResponse(response: Response): Promise<void> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `WSG API Error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ProjectWise-specific API methods
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get repository information
   */
  async getRepository(): Promise<unknown> {
    return this.get(this.repoPath);
  }

  /**
   * List folders in a parent folder (or root if parentId is null)
   */
  async listFolders(parentId?: string): Promise<unknown> {
    const endpoint = `${this.repoPath}/PW_WSG/Project`;
    const filters = ["TypeString eq 'Folder'"];
    if (parentId !== undefined) {
      this.validateGuid(parentId, 'folder ID');
      filters.push(`ParentGuid eq '${parentId}'`);
    } else {
      filters.push('ParentGuid eq null');
    }
    return this.get(endpoint, { '$filter': filters.join(' and ') });
  }

  /**
   * List documents in a folder
   */
  async listDocuments(folderId: string): Promise<unknown> {
    this.validateGuid(folderId, 'folder ID');
    const endpoint = `${this.repoPath}/PW_WSG/Document`;
    return this.get(endpoint, { '$filter': `ParentGuid eq '${folderId}'` });
  }

  /**
   * Get document metadata by ID
   */
  async getDocument(documentId: string): Promise<unknown> {
    this.validateGuid(documentId, 'document ID');
    const endpoint = `${this.repoPath}/PW_WSG/Document/${documentId}`;
    return this.get(endpoint);
  }

  /**
   * Search documents by name pattern
   */
  async searchDocuments(namePattern: string, maxResults: number = 50): Promise<unknown> {
    const endpoint = `${this.repoPath}/PW_WSG/Document`;
    return this.get(endpoint, {
      '$filter': `contains(Name,'${namePattern.replace(/'/g, "''")}')`,
      '$top': maxResults.toString(),
    });
  }

  /**
   * Get folder by ID
   */
  async getFolder(folderId: string): Promise<unknown> {
    this.validateGuid(folderId, 'folder ID');
    const endpoint = `${this.repoPath}/PW_WSG/Project/${folderId}`;
    return this.get(endpoint);
  }

  /**
   * Get project information
   */
  async listProjects(): Promise<unknown> {
    const endpoint = `${this.repoPath}/PW_WSG/Project`;
    return this.get(endpoint);
  }
}
