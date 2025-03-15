/**
 * IAM Service - Provides efficient access to Google Cloud IAM functionality
 * Optimized for performance and user experience
 */

import { exec } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";

const execPromise = promisify(exec);

export interface IAMPrincipal {
  type: string; // user, group, serviceAccount, etc.
  id: string;
  email: string;
  displayName: string;
  roles: IAMRole[];
}

export interface IAMRole {
  role: string;
  title: string;
  description: string;
  condition?: IAMCondition;
}

export interface IAMCondition {
  title: string;
  description?: string;
  expression: string;
}

export interface IAMBinding {
  role: string;
  members: string[];
  condition?: IAMCondition;
}

export interface IAMPolicy {
  version: number;
  etag: string;
  bindings: IAMBinding[];
}

export interface IAMServiceAccount {
  name: string;
  email: string;
  displayName: string;
  description?: string;
  disabled: boolean;
  oauth2ClientId?: string;
}

export interface IAMCustomRole {
  name: string;
  title: string;
  description: string;
  permissions: string[];
  stage: string;
  etag: string;
}

/**
 * IAM Service class - provides optimized access to IAM functionality
 */
export class IAMService {
  private gcloudPath: string;
  private projectId: string;
  private policyCache: Map<string, { policy: IAMPolicy; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache TTL

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Get IAM policy for a project or resource
   * Uses caching for improved performance
   */
  async getIAMPolicy(resourceType?: string, resourceName?: string): Promise<IAMPolicy> {
    const cacheKey = resourceType && resourceName 
      ? `${resourceType}:${resourceName}` 
      : `project:${this.projectId}`;
    
    const cachedPolicy = this.policyCache.get(cacheKey);
    const now = Date.now();
    
    // Return cached policy if it exists and is not expired
    if (cachedPolicy && (now - cachedPolicy.timestamp < this.CACHE_TTL)) {
      return cachedPolicy.policy;
    }
    
    let command = "";
    
    if (resourceType === "storage" && resourceName) {
      command = `storage buckets get-iam-policy gs://${resourceName} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances get-iam-policy ${resourceName} --project=${this.projectId}`;
    } else {
      command = `projects get-iam-policy ${this.projectId}`;
    }
    
    try {
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error("No IAM policy found or empty result");
      }
      
      const policy = Array.isArray(result) ? result[0] : result;
      
      if (!policy.bindings || !Array.isArray(policy.bindings)) {
        throw new Error("Invalid IAM policy format: no bindings found");
      }
      
      // Cache the policy
      this.policyCache.set(cacheKey, { policy, timestamp: now });
      
      return policy;
    } catch (error: any) {
      console.error("Error fetching IAM policy:", error);
      throw new Error(`Failed to fetch IAM policy: ${error.message}`);
    }
  }

  /**
   * Get IAM principals (members) with their roles
   * Optimized for performance with caching
   */
  async getIAMPrincipals(resourceType?: string, resourceName?: string): Promise<IAMPrincipal[]> {
    try {
      const policy = await this.getIAMPolicy(resourceType, resourceName);
      
      // Process the bindings into a member-centric structure
      const principalsMap = new Map<string, IAMPrincipal>();
      
      for (const binding of policy.bindings) {
        for (const member of binding.members) {
          const [type, id] = member.includes(':') ? member.split(':', 2) : [member, ''];
          const principalKey = `${type}:${id}`;
          
          if (!principalsMap.has(principalKey)) {
            principalsMap.set(principalKey, {
              type,
              id,
              email: id,
              displayName: this.formatMemberType(type),
              roles: []
            });
          }
          
          const principal = principalsMap.get(principalKey)!;
          const roleInfo = this.getRoleInfo(binding.role);
          
          principal.roles.push({
            role: binding.role,
            title: roleInfo.title,
            description: roleInfo.description,
            condition: binding.condition
          });
        }
      }
      
      // Convert map to array and sort by type and email
      const principalsArray = Array.from(principalsMap.values());
      principalsArray.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.id.localeCompare(b.id);
      });
      
      return principalsArray;
    } catch (error: any) {
      console.error("Error getting IAM principals:", error);
      throw new Error(`Failed to get IAM principals: ${error.message}`);
    }
  }

  /**
   * Add a member to a role
   */
  async addMember(role: string, memberType: string, memberId: string, resourceType?: string, resourceName?: string): Promise<void> {
    // Validate the member ID format
    if (!this.validateMemberId(memberType, memberId)) {
      throw new Error(`Invalid member ID format for ${memberType}`);
    }
    
    let command = "";
    
    if (resourceType === "storage" && resourceName) {
      command = `storage buckets add-iam-policy-binding gs://${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances add-iam-policy-binding ${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else {
      command = `projects add-iam-policy-binding ${this.projectId} --member=${memberType}:${memberId} --role=${role}`;
    }
    
    try {
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Invalidate cache
      const cacheKey = resourceType && resourceName 
        ? `${resourceType}:${resourceName}` 
        : `project:${this.projectId}`;
      this.policyCache.delete(cacheKey);
    } catch (error: any) {
      console.error("Error adding member:", error);
      throw new Error(`Failed to add member: ${error.message}`);
    }
  }

  /**
   * Remove a member from a role
   */
  async removeMember(role: string, memberType: string, memberId: string, resourceType?: string, resourceName?: string): Promise<void> {
    let command = "";
    
    if (resourceType === "storage" && resourceName) {
      command = `storage buckets remove-iam-policy-binding gs://${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else if (resourceType === "compute" && resourceName) {
      command = `compute instances remove-iam-policy-binding ${resourceName} --member=${memberType}:${memberId} --role=${role} --project=${this.projectId}`;
    } else {
      command = `projects remove-iam-policy-binding ${this.projectId} --member=${memberType}:${memberId} --role=${role}`;
    }
    
    try {
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Invalidate cache
      const cacheKey = resourceType && resourceName 
        ? `${resourceType}:${resourceName}` 
        : `project:${this.projectId}`;
      this.policyCache.delete(cacheKey);
    } catch (error: any) {
      console.error("Error removing member:", error);
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  /**
   * Get service accounts for the project
   */
  async getServiceAccounts(): Promise<IAMServiceAccount[]> {
    try {
      const command = `iam service-accounts list --project=${this.projectId}`;
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!Array.isArray(result)) {
        return [];
      }
      
      return result.map((sa: any) => ({
        name: sa.name,
        email: sa.email,
        displayName: sa.displayName || sa.email.split('@')[0],
        description: sa.description,
        disabled: sa.disabled || false,
        oauth2ClientId: sa.oauth2ClientId
      }));
    } catch (error: any) {
      console.error("Error getting service accounts:", error);
      throw new Error(`Failed to get service accounts: ${error.message}`);
    }
  }

  /**
   * Get custom roles for the project
   */
  async getCustomRoles(): Promise<IAMCustomRole[]> {
    try {
      const command = `iam roles list --project=${this.projectId}`;
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!Array.isArray(result)) {
        return [];
      }
      
      return result.map((role: any) => ({
        name: role.name,
        title: role.title || this.formatRoleName(role.name),
        description: role.description || "",
        permissions: role.includedPermissions || [],
        stage: role.stage || "GA",
        etag: role.etag || ""
      }));
    } catch (error: any) {
      console.error("Error getting custom roles:", error);
      throw new Error(`Failed to get custom roles: ${error.message}`);
    }
  }

  /**
   * Format a member type for display
   */
  formatMemberType(type: string): string {
    switch (type) {
      case 'user':
        return 'User';
      case 'group':
        return 'Group';
      case 'serviceAccount':
        return 'Service Account';
      case 'domain':
        return 'Domain';
      case 'allUsers':
        return 'All Users (Public)';
      case 'allAuthenticatedUsers':
        return 'All Authenticated Users';
      case 'projectEditor':
        return 'Project Editor';
      case 'projectOwner':
        return 'Project Owner';
      case 'projectViewer':
        return 'Project Viewer';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  /**
   * Get information about a role
   */
  getRoleInfo(role: string): { title: string; description: string } {
    // Import from utils/iamRoles
    const { getRoleInfo, formatRoleName } = require('../../utils/iamRoles');
    const roleInfo = getRoleInfo(role);
    
    return {
      title: roleInfo.title || formatRoleName(role),
      description: roleInfo.description || ""
    };
  }

  /**
   * Format a role name for display
   */
  formatRoleName(role: string): string {
    // Import from utils/iamRoles
    const { formatRoleName } = require('../../utils/iamRoles');
    return formatRoleName(role);
  }

  /**
   * Validate a member ID format based on type
   */
  validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case 'user':
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'serviceAccount':
        // Service account email validation
        return /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'group':
        // Group email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'domain':
        // Domain validation
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      case 'allUsers':
      case 'allAuthenticatedUsers':
      case 'projectEditor':
      case 'projectOwner':
      case 'projectViewer':
        // These types don't have IDs
        return true;
      default:
        // For unknown types, just check it's not empty
        return id.trim() !== '';
    }
  }
} 