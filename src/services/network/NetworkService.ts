/**
 * Network Service - Provides efficient access to Google Cloud VPC, IP, and Firewall functionality
 * Optimized for performance and user experience
 */

import { executeGcloudCommand } from "../../gcloud";

// Interfaces
export interface VPC {
  id: string;
  name: string;
  description?: string;
  autoCreateSubnetworks: boolean;
  subnetworkRange?: string;
  creationTimestamp: string;
  routingConfig?: {
    routingMode: string;
  };
  mtu?: number;
  gatewayIPv4?: string;
}

export interface Subnet {
  id: string;
  name: string;
  network: string;
  region: string;
  ipCidrRange: string;
  privateIpGoogleAccess: boolean;
  enableFlowLogs?: boolean;
  gatewayAddress?: string;
  secondaryIpRanges?: {
    rangeName: string;
    ipCidrRange: string;
  }[];
  creationTimestamp: string;
}

export interface IPAddress {
  id: string;
  name: string;
  description?: string;
  address: string;
  addressType: string; // "INTERNAL" or "EXTERNAL"
  purpose?: string;
  network?: string;
  subnetwork?: string;
  region?: string;
  status: string; // "RESERVED" or "IN_USE"
  users?: string[];
  creationTimestamp: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  description?: string;
  network: string;
  priority: number;
  direction: string; // "INGRESS" or "EGRESS"
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  sourceServiceAccounts?: string[];
  targetServiceAccounts?: string[];
  disabled: boolean;
  allowed?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  denied?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  creationTimestamp: string;
  logConfig?: {
    enable: boolean;
  };
}

/**
 * Network Service class - provides optimized access to VPC, IP, and Firewall functionality
 */
export class NetworkService {
  private gcloudPath: string;
  private projectId: string;
  private vpcCache: Map<string, { data: VPC[]; timestamp: number }> = new Map();
  private subnetCache: Map<string, { data: Subnet[]; timestamp: number }> = new Map();
  private ipCache: Map<string, { data: IPAddress[]; timestamp: number }> = new Map();
  private firewallCache: Map<string, { data: FirewallRule[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL
  
  // Static cache shared between instances for improved performance
  private static regionsCache: { regions: string[], timestamp: number } | null = null;
  private static readonly REGIONS_CACHE_TTL = 3600000; // 1 hour for regions cache

  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Get list of VPC networks
   * @returns Promise with array of VPC networks
   */
  async getVPCs(): Promise<VPC[]> {
    const cacheKey = 'vpcs';
    const cachedData = this.vpcCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached VPC data`);
      return cachedData.data;
    }
    
    try {
      const command = ["compute", "networks", "list", `--project=${this.projectId}`, "--format=json"];
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { timeout: 30000 }
      );
      
      const vpcs: VPC[] = result;
      
      // Cache the result
      this.vpcCache.set(cacheKey, { data: vpcs, timestamp: now });
      
      return vpcs;
    } catch (error: any) {
      console.error("Error fetching VPC networks:", error);
      
      // If we have cached data, return it even if expired
      if (cachedData) {
        console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }
      
      // Return empty array instead of throwing to prevent UI from breaking
      return [];
    }
  }

  /**
   * Get a specific VPC network by name
   * @param name Name of the VPC to retrieve
   * @returns Promise with VPC if found, null otherwise
   */
  async getVPC(name: string): Promise<VPC | null> {
    try {
      // First try to find in cache
      const cachedVPCs = this.vpcCache.get('vpcs');
      if (cachedVPCs) {
        const cachedVPC = cachedVPCs.data.find(vpc => vpc.name === name);
        if (cachedVPC) return cachedVPC;
      }
      
      // If not found in cache or cache is expired, fetch directly
      const command = ["compute", "networks", "describe", name, `--project=${this.projectId}`, "--format=json"];
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { skipCache: true }
      );
      
      return result[0] as VPC;
    } catch (error) {
      console.error(`Error fetching VPC ${name}:`, error);
      return null;
    }
  }

  /**
   * Create a new VPC network
   * @param name Name of the new VPC
   * @param description Optional description
   * @param autoCreateSubnetworks Whether to auto-create subnetworks
   * @param subnetMode "auto" or "custom"
   * @param mtu Optional MTU value
   * @returns Promise with success or failure
   */
  async createVPC(
    name: string, 
    description?: string,
    subnetMode: "auto" | "custom" = "auto",
    mtu?: number
  ): Promise<boolean> {
    try {
      // Build command
      const command = ["compute", "networks", "create", name];
      
      // Add subnet mode option
      if (subnetMode === "auto") {
        command.push("--subnet-mode=auto");
      } else {
        command.push("--subnet-mode=custom");
      }
      
      // Add optional parameters
      if (description) {
        command.push(`--description="${description}"`);
      }
      
      if (mtu) {
        command.push(`--mtu=${mtu}`);
      }
      
      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");
      
      await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { skipCache: true }
      );
      
      // Clear the VPC cache
      this.vpcCache.delete('vpcs');
      
      return true;
    } catch (error) {
      console.error("Error creating VPC:", error);
      return false;
    }
  }

  /**
   * Get list of subnets, optionally filtered by region
   * @param region Optional region filter
   * @returns Promise with array of subnets
   */
  async getSubnets(region?: string): Promise<Subnet[]> {
    const cacheKey = region ? `subnets:${region}` : 'subnets:all';
    const cachedData = this.subnetCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached subnet data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      // Build command
      const command = ["compute", "networks", "subnets", "list"];
      
      // Add region filter if specified
      if (region) {
        command.push(`--regions=${region}`);
      }
      
      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { timeout: 30000 }
      );
      
      const subnets: Subnet[] = result;
      
      // Cache the result
      this.subnetCache.set(cacheKey, { data: subnets, timestamp: now });
      
      return subnets;
    } catch (error: any) {
      console.error("Error fetching subnets:", error);
      
      // If we have cached data, return it even if expired
      if (cachedData) {
        console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }
      
      // Return empty array
      return [];
    }
  }

  /**
   * Get list of IP addresses, optionally filtered by region
   * @param region Optional region filter
   * @returns Promise with array of IP addresses
   */
  async getIPs(region?: string): Promise<IPAddress[]> {
    const cacheKey = region ? `ips:${region}` : 'ips:all';
    const cachedData = this.ipCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached IP data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      // Build command
      const command = ["compute", "addresses", "list"];
      
      // Add region filter if specified
      if (region) {
        command.push(`--regions=${region}`);
      }
      
      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { timeout: 30000 }
      );
      
      const ips: IPAddress[] = result;
      
      // Cache the result
      this.ipCache.set(cacheKey, { data: ips, timestamp: now });
      
      return ips;
    } catch (error: any) {
      console.error("Error fetching IP addresses:", error);
      
      // If we have cached data, return it even if expired
      if (cachedData) {
        console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }
      
      // Return empty array
      return [];
    }
  }

  /**
   * Create a new IP address
   * @param name Name of the new IP address
   * @param region Region to create the IP in
   * @param addressType "INTERNAL" or "EXTERNAL"
   * @param addressOptions Additional options
   * @returns Promise with success or failure
   */
  async createIP(
    name: string,
    region: string,
    addressType: "INTERNAL" | "EXTERNAL" = "EXTERNAL",
    addressOptions: {
      description?: string;
      subnet?: string;
      address?: string;
      purpose?: string;
    } = {}
  ): Promise<boolean> {
    try {
      // Build command
      const command = ["compute", "addresses", "create", name];
      
      // Add required parameters
      command.push(`--region=${region}`);
      
      // Add address type
      if (addressType === "INTERNAL") {
        command.push("--subnet=" + (addressOptions.subnet || "default"));
      }
      
      // Add optional parameters
      if (addressOptions.description) {
        command.push(`--description="${addressOptions.description}"`);
      }
      
      if (addressOptions.address) {
        command.push(`--addresses=${addressOptions.address}`);
      }
      
      if (addressOptions.purpose && addressType === "INTERNAL") {
        command.push(`--purpose=${addressOptions.purpose}`);
      }
      
      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");
      
      await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { skipCache: true }
      );
      
      // Clear the IP cache
      this.clearIPCache();
      
      return true;
    } catch (error) {
      console.error("Error creating IP address:", error);
      return false;
    }
  }

  /**
   * Get list of firewall rules
   * @returns Promise with array of firewall rules
   */
  async getFirewallRules(): Promise<FirewallRule[]> {
    const cacheKey = 'firewalls';
    const cachedData = this.firewallCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached firewall data`);
      return cachedData.data;
    }
    
    try {
      const command = ["compute", "firewall-rules", "list", `--project=${this.projectId}`, "--format=json"];
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { timeout: 30000 }
      );
      
      const rules: FirewallRule[] = result;
      
      // Cache the result
      this.firewallCache.set(cacheKey, { data: rules, timestamp: now });
      
      return rules;
    } catch (error: any) {
      console.error("Error fetching firewall rules:", error);
      
      // If we have cached data, return it even if expired
      if (cachedData) {
        console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }
      
      // Return empty array
      return [];
    }
  }

  /**
   * Create a new firewall rule
   * @param name Name of the new firewall rule
   * @param network Name of the network for the rule
   * @param ruleOptions Firewall rule configuration
   * @returns Promise with success or failure
   */
  async createFirewallRule(
    name: string,
    network: string,
    ruleOptions: {
      description?: string;
      direction?: "INGRESS" | "EGRESS";
      priority?: number;
      sourceRanges?: string[];
      destinationRanges?: string[];
      sourceTags?: string[];
      targetTags?: string[];
      sourceServiceAccounts?: string[];
      targetServiceAccounts?: string[];
      allowed?: {
        protocol: string;
        ports?: string[];
      }[];
      denied?: {
        protocol: string;
        ports?: string[];
      }[];
      disabled?: boolean;
      enableLogging?: boolean;
    }
  ): Promise<boolean> {
    try {
      // Build command
      const command = ["compute", "firewall-rules", "create", name];
      
      // Add required parameters
      command.push(`--network=${network}`);
      
      // Add optional parameters
      if (ruleOptions.description) {
        command.push(`--description="${ruleOptions.description}"`);
      }
      
      if (ruleOptions.direction) {
        command.push(`--direction=${ruleOptions.direction}`);
      }
      
      if (ruleOptions.priority) {
        command.push(`--priority=${ruleOptions.priority}`);
      }
      
      if (ruleOptions.sourceRanges) {
        command.push(`--source-ranges=${ruleOptions.sourceRanges.join(',')}`);
      }
      
      if (ruleOptions.destinationRanges) {
        command.push(`--destination-ranges=${ruleOptions.destinationRanges.join(',')}`);
      }
      
      if (ruleOptions.sourceTags) {
        command.push(`--source-tags=${ruleOptions.sourceTags.join(',')}`);
      }
      
      if (ruleOptions.targetTags) {
        command.push(`--target-tags=${ruleOptions.targetTags.join(',')}`);
      }
      
      if (ruleOptions.allowed) {
        for (const allowed of ruleOptions.allowed) {
          if (allowed.ports && allowed.ports.length > 0) {
            command.push(`--allow=${allowed.protocol}:${allowed.ports.join(',')}`);
          } else {
            command.push(`--allow=${allowed.protocol}`);
          }
        }
      }
      
      if (ruleOptions.denied) {
        for (const denied of ruleOptions.denied) {
          if (denied.ports && denied.ports.length > 0) {
            command.push(`--deny=${denied.protocol}:${denied.ports.join(',')}`);
          } else {
            command.push(`--deny=${denied.protocol}`);
          }
        }
      }
      
      if (ruleOptions.disabled) {
        command.push('--disabled');
      }
      
      if (ruleOptions.enableLogging) {
        command.push('--enable-logging');
      }
      
      // Add project and format
      command.push(`--project=${this.projectId}`);
      command.push("--format=json");
      
      await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        undefined,
        { skipCache: true }
      );
      
      // Clear the firewall cache
      this.firewallCache.delete('firewalls');
      
      return true;
    } catch (error) {
      console.error("Error creating firewall rule:", error);
      return false;
    }
  }

  /**
   * Get list of regions
   * @returns Promise with array of region names
   */
  async listRegions(): Promise<string[]> {
    // Check static cache
    const now = Date.now();
    if (NetworkService.regionsCache && (now - NetworkService.regionsCache.timestamp < NetworkService.REGIONS_CACHE_TTL)) {
      return NetworkService.regionsCache.regions;
    }
    
    try {
      const command = ["compute", "regions", "list", "--format=json"];
      
      const result = await executeGcloudCommand(
        this.gcloudPath,
        command.join(" "),
        this.projectId,
        { cacheTTL: NetworkService.REGIONS_CACHE_TTL }
      );
      
      // Extract region names from full response
      const regions = result.map((region: any) => region.name);
      
      // Update static cache
      NetworkService.regionsCache = { regions, timestamp: now };
      
      return regions;
    } catch (error) {
      console.error("Error fetching regions:", error);
      
      // Return empty array or static cache if available
      return NetworkService.regionsCache ? NetworkService.regionsCache.regions : [];
    }
  }

  /**
   * Clear various caches
   */
  private clearVPCCache(): void {
    this.vpcCache.clear();
  }
  
  private clearSubnetCache(): void {
    this.subnetCache.clear();
  }
  
  private clearIPCache(): void {
    this.ipCache.clear();
  }
  
  private clearFirewallCache(): void {
    this.firewallCache.clear();
  }
  
  public clearAllCaches(): void {
    this.clearVPCCache();
    this.clearSubnetCache();
    this.clearIPCache();
    this.clearFirewallCache();
  }
  
  /**
   * Format helper methods
   */
  formatRegion(region: string): string {
    // Extract region name from full path
    const parts = region.split('/');
    return parts[parts.length - 1];
  }
  
  formatNetwork(network: string): string {
    // Extract network name from full path
    const parts = network.split('/');
    return parts[parts.length - 1];
  }
  
  getAddressStatusColor(status: string): string {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "reserved") return "green";
    if (lowerStatus === "in_use") return "blue";
    return "primaryText";
  }
  
  getFirewallStatusColor(disabled: boolean): string {
    return disabled ? "red" : "green";
  }
} 