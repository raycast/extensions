/**
 * ServiceHub Service - Centralizes management of Google Cloud service activation
 * Provides a unified interface for enabling and disabling GCP services
 */

import { executeGcloudCommand } from "../../gcloud";

export interface GCPService {
  name: string;
  displayName: string;
  description?: string;
  isEnabled: boolean;
  state?: string;
  dependsOn?: string[];
  category?: string;
}

export interface ServiceEnableOptions {
  async?: boolean;
}

export interface ServiceListOptions {
  filter?: string;
  limit?: number;
  pageSize?: number;
  includeDisabled?: boolean;
}

export class ServiceHubService {
  private gcloudPath: string;
  private projectId: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds cache TTL
  private readonly CACHE_TTL_DETAILS = 300000; // 5 minutes cache TTL for details
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * List available services in Google Cloud
   */
  async listServices(options: ServiceListOptions = {}): Promise<GCPService[]> {
    const cacheKey = `services:${this.projectId}:${JSON.stringify(options)}`;
    
    // Check if there's a pending request for this exact query
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService[]>;
    }
    
    // Check cache
    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      return cachedData.data;
    }
    
    // Create the promise for this request
    const requestPromise = this.fetchServices(options, cacheKey);
    
    // Store the promise so parallel calls can use it
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      return await requestPromise;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  /**
   * Actual implementation of fetching services
   */
  private async fetchServices(options: ServiceListOptions, cacheKey: string): Promise<GCPService[]> {
    try {
      let command = "services list";
      
      if (options.filter) {
        command += ` --filter=${options.filter}`;
      }
      
      if (options.limit) {
        command += ` --limit=${options.limit}`;
      }
      
      if (options.pageSize) {
        command += ` --page-size=${options.pageSize}`;
      }
      
      if (options.includeDisabled) {
        command += " --available";
      }
      
      const services = await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      
      const formattedServices: GCPService[] = services.map((service: any) => ({
        name: service.name || service.config?.name,
        displayName: service.displayName || service.config?.title,
        description: service.description || service.config?.documentation?.summary,
        isEnabled: service.state === "ENABLED",
        state: service.state,
        category: this.getCategoryForService(service.name || service.config?.name)
      }));
      
      // Store in cache
      const now = Date.now();
      this.cache.set(cacheKey, { data: formattedServices, timestamp: now });
      
      return formattedServices;
    } catch (error: unknown) {
      console.error("Error listing services:", error);
      throw new Error(`Failed to list services: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enable a Google Cloud service
   */
  async enableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services enable ${serviceName}`;
      
      if (options.async) {
        command += " --async";
      }
      
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      
      // Clear cache after enabling a service
      this.clearServiceCache();
      
      return true;
    } catch (error: unknown) {
      console.error(`Error enabling service ${serviceName}:`, error);
      throw new Error(`Failed to enable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disable a Google Cloud service
   */
  async disableService(serviceName: string, options: ServiceEnableOptions = {}): Promise<boolean> {
    try {
      let command = `services disable ${serviceName}`;
      
      if (options.async) {
        command += " --async";
      }
      
      await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      
      // Clear cache after disabling a service
      this.clearServiceCache();
      
      return true;
    } catch (error: unknown) {
      console.error(`Error disabling service ${serviceName}:`, error);
      throw new Error(`Failed to disable service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get details about a specific service
   */
  async getServiceDetails(serviceName: string): Promise<GCPService> {
    const cacheKey = `service:${this.projectId}:${serviceName}`;
    
    // Check if there's a pending request for this service
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<GCPService>;
    }
    
    // Check cache with longer TTL for details
    const cachedData = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL_DETAILS)) {
      return cachedData.data;
    }
    
    // Create the promise for this request
    const requestPromise = this.fetchServiceDetails(serviceName, cacheKey);
    
    // Store the promise so parallel calls can use it
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      return await requestPromise;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  /**
   * Actual implementation of fetching service details
   */
  private async fetchServiceDetails(serviceName: string, cacheKey: string): Promise<GCPService> {
    try {
      const command = `services describe ${serviceName}`;
      
      const result = await executeGcloudCommand(this.gcloudPath, command, this.projectId);
      const serviceData = result[0]; // Get the first item since describe returns a single item
      
      const formattedService: GCPService = {
        name: serviceData.name || serviceData.config?.name,
        displayName: serviceData.displayName || serviceData.config?.title,
        description: serviceData.description || serviceData.config?.documentation?.summary,
        isEnabled: serviceData.state === "ENABLED",
        state: serviceData.state,
        dependsOn: serviceData.dependsOn || [],
        category: this.getCategoryForService(serviceData.name || serviceData.config?.name)
      };
      
      // Store in cache with timestamp
      const now = Date.now();
      this.cache.set(cacheKey, { data: formattedService, timestamp: now });
      
      return formattedService;
    } catch (error: unknown) {
      console.error(`Error getting service details for ${serviceName}:`, error);
      throw new Error(`Failed to get service details for ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a service is enabled
   */
  async isServiceEnabled(serviceName: string): Promise<boolean> {
    try {
      const service = await this.getServiceDetails(serviceName);
      return service.isEnabled;
    } catch (error: unknown) {
      console.error(`Error checking if service ${serviceName} is enabled:`, error);
      throw new Error(`Failed to check if service ${serviceName} is enabled: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear the service cache
   */
  private clearServiceCache(): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith('service:') || key.startsWith('services:')) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Prefetch service details for a list of services
   * This can be used to warm up the cache
   */
  async prefetchServiceDetails(serviceNames: string[]): Promise<void> {
    // Use Promise.all to fetch details in parallel
    await Promise.all(
      serviceNames.map(name => this.getServiceDetails(name).catch(err => {
        console.warn(`Failed to prefetch details for ${name}:`, err);
        return null;
      }))
    );
  }

  /**
   * Get category for a service based on its name
   * This is a helper method to organize services into logical groups
   */
  private getCategoryForService(serviceName: string): string {
    const serviceCategories: Record<string, string[]> = {
      "Compute": [
        "compute.googleapis.com",
        "appengine.googleapis.com",
        "run.googleapis.com",
        "cloudfunctions.googleapis.com",
        "cloudscheduler.googleapis.com"
      ],
      "Storage": [
        "storage.googleapis.com",
        "firestore.googleapis.com",
        "bigtable.googleapis.com",
        "spanner.googleapis.com",
        "datastore.googleapis.com"
      ],
      "Database": [
        "sqladmin.googleapis.com",
        "redis.googleapis.com",
        "memcache.googleapis.com",
        "mongodb.googleapis.com"
      ],
      "Networking": [
        "dns.googleapis.com",
        "compute.googleapis.com",
        "networkservices.googleapis.com",
        "networksecurity.googleapis.com",
        "vpcaccess.googleapis.com"
      ],
      "Security": [
        "iam.googleapis.com",
        "cloudkms.googleapis.com",
        "secretmanager.googleapis.com",
        "cloudasset.googleapis.com"
      ],
      "Analytics": [
        "bigquery.googleapis.com",
        "dataflow.googleapis.com",
        "dataproc.googleapis.com",
        "pubsub.googleapis.com"
      ],
      "AI & ML": [
        "ml.googleapis.com",
        "aiplatform.googleapis.com",
        "speech.googleapis.com",
        "vision.googleapis.com",
        "translate.googleapis.com"
      ],
      "DevOps": [
        "cloudbuild.googleapis.com",
        "containerregistry.googleapis.com",
        "artifactregistry.googleapis.com",
        "sourcerepo.googleapis.com"
      ]
    };

    for (const [category, services] of Object.entries(serviceCategories)) {
      if (services.includes(serviceName)) {
        return category;
      }
    }

    return "Other";
  }
} 