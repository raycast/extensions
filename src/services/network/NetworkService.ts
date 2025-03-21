/**
 * Network Service - Provides efficient access to Google Cloud Network functionality
 * Optimized for performance and user experience
 */

import { exec } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";

const execPromise = promisify(exec);

// Network Interfaces
export interface VPCNetwork {
  id: string;
  name: string;
  description?: string;
  autoCreateSubnets: boolean;
  subnetworks: string[];
  routingMode: string;
  mtu: number;
  creationTimestamp: string;
  selfLink: string;
}

export interface Subnetwork {
  id: string;
  name: string;
  network: string;
  region: string;
  ipCidrRange: string;
  gatewayAddress: string;
  privateIpGoogleAccess: boolean;
  secondaryIpRanges?: SecondaryIpRange[];
  creationTimestamp: string;
  purpose?: string;
  role?: string;
  logConfig?: LogConfig;
}

export interface SecondaryIpRange {
  rangeName: string;
  ipCidrRange: string;
}

export interface LogConfig {
  enable: boolean;
  aggregationInterval: string;
  flowSampling: number;
  metadata: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  network: string;
  priority: number;
  direction: string;
  logConfig?: { enable: boolean };
  disabled: boolean;
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  targetTags?: string[];
  sourceServiceAccounts?: string[];
  targetServiceAccounts?: string[];
  allowed?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  denied?: {
    IPProtocol: string;
    ports?: string[];
  }[];
  creationTimestamp: string;
  description?: string;
}

export interface Route {
  id: string;
  name: string;
  network: string;
  destRange: string;
  priority: number;
  tags?: string[];
  nextHopGateway?: string;
  nextHopInstance?: string;
  nextHopIp?: string;
  nextHopVpnTunnel?: string;
  nextHopIlb?: string;
  nextHopNetwork?: string;
  creationTimestamp: string;
  description?: string;
}

export interface VpnGateway {
  id: string;
  name: string;
  network: string;
  region: string;
  vpnInterfaces: VpnInterface[];
  creationTimestamp: string;
  description?: string;
}

export interface VpnInterface {
  id: number;
  ipAddress: string;
}

export interface VpnTunnel {
  id: string;
  name: string;
  vpnGateway: string;
  peerGateway: string;
  region: string;
  peerIp: string;
  status: string;
  localTrafficSelector?: string[];
  remoteTrafficSelector?: string[];
  creationTimestamp: string;
  description?: string;
  sharedSecret?: string;
  sharedSecretHash?: string;
}

/**
 * Network Service class - provides optimized access to Network functionality
 */
export class NetworkService {
  private gcloudPath: string;
  private projectId: string;
  private vpcCache: Map<string, { data: VPCNetwork[]; timestamp: number }> = new Map();
  private subnetworkCache: Map<string, { data: Subnetwork[]; timestamp: number }> = new Map();
  private firewallCache: Map<string, { data: FirewallRule[]; timestamp: number }> = new Map();
  private routeCache: Map<string, { data: Route[]; timestamp: number }> = new Map();
  private vpnGatewayCache: Map<string, { data: VpnGateway[]; timestamp: number }> = new Map();
  private vpnTunnelCache: Map<string, { data: VpnTunnel[]; timestamp: number }> = new Map();
  private regionsCache: Map<string, { data: string[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes cache TTL
  
  constructor(gcloudPath: string, projectId: string) {
    this.gcloudPath = gcloudPath;
    this.projectId = projectId;
  }

  /**
   * Get list of VPC networks
   * @returns Promise with array of VPC networks
   */
  async getVPCNetworks(): Promise<VPCNetwork[]> {
    const cacheKey = 'vpc-networks';
    const cachedData = this.vpcCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached VPC network data`);
      return cachedData.data;
    }
    
    try {
      const command = `compute networks list --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const networks: VPCNetwork[] = Array.isArray(result) ? result : [result];
      
      // Cache the result
      this.vpcCache.set(cacheKey, { data: networks, timestamp: now });
      
      return networks;
    } catch (error: any) {
      console.error("Error fetching VPC networks:", error);
      
      // If we have cached data, return it even if expired
      if (cachedData) {
        console.log("Returning expired cached data as fallback");
        return cachedData.data;
      }
      
      // Return empty array instead of throwing to prevent UI from breaking
      console.log("No cached data available, returning empty array");
      return [];
    }
  }

  /**
   * Get details of a specific VPC network
   * @param networkName The name of the VPC network
   * @returns Promise with the VPC network details
   */
  async getVPCNetworkDetails(networkName: string): Promise<VPCNetwork | null> {
    try {
      const command = `compute networks describe ${networkName} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error: any) {
      console.error(`Error fetching VPC network details for ${networkName}:`, error);
      return null;
    }
  }

  /**
   * List all subnetworks, optionally filtered by region
   * @param region Optional region to filter subnetworks
   * @returns Promise with array of subnetworks
   */
  async getSubnetworks(region?: string): Promise<Subnetwork[]> {
    const cacheKey = region ? `subnetworks-${region}` : 'subnetworks';
    const cachedData = this.subnetworkCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached subnetwork data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      const regionFlag = region ? ` --regions=${region}` : '';
      const command = `compute networks subnets list${regionFlag} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const subnetworks: Subnetwork[] = Array.isArray(result) ? result : [result];
      
      // Cache the result
      this.subnetworkCache.set(cacheKey, { data: subnetworks, timestamp: now });
      
      return subnetworks;
    } catch (error: any) {
      console.error("Error fetching subnetworks:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Get details of a specific subnetwork
   * @param subnetworkName The name of the subnetwork
   * @param region The region of the subnetwork
   * @returns Promise with the subnetwork details
   */
  async getSubnetworkDetails(subnetworkName: string, region: string): Promise<Subnetwork | null> {
    try {
      const command = `compute networks subnets describe ${subnetworkName} --region=${region} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error: any) {
      console.error(`Error fetching subnetwork details for ${subnetworkName}:`, error);
      return null;
    }
  }

  /**
   * Get list of firewall rules, optionally filtered by network
   * @param networkName Optional network to filter firewall rules
   * @returns Promise with array of firewall rules
   */
  async getFirewallRules(networkName?: string): Promise<FirewallRule[]> {
    const cacheKey = networkName ? `firewall-${networkName}` : 'firewall';
    const cachedData = this.firewallCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached firewall rule data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      const command = `compute firewall-rules list --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const rules: FirewallRule[] = Array.isArray(result) ? result : [result];
      
      // Filter by network if provided
      const filteredRules = networkName 
        ? rules.filter(rule => rule.network && rule.network.includes(`/${networkName}`) || rule.network === networkName)
        : rules;
      
      // Cache the result
      this.firewallCache.set(cacheKey, { data: filteredRules, timestamp: now });
      
      return filteredRules;
    } catch (error: any) {
      console.error("Error fetching firewall rules:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Get details of a specific firewall rule
   * @param ruleName The name of the firewall rule
   * @returns Promise with the firewall rule details
   */
  async getFirewallRuleDetails(ruleName: string): Promise<FirewallRule | null> {
    try {
      const command = `compute firewall-rules describe ${ruleName} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return result[0];
    } catch (error: any) {
      console.error(`Error fetching firewall rule details for ${ruleName}:`, error);
      return null;
    }
  }

  /**
   * Get list of routes, optionally filtered by network
   * @param networkName Optional network to filter routes
   * @returns Promise with array of routes
   */
  async getRoutes(networkName?: string): Promise<Route[]> {
    const cacheKey = networkName ? `routes-${networkName}` : 'routes';
    const cachedData = this.routeCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached route data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      const command = `compute routes list --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const routes: Route[] = Array.isArray(result) ? result : [result];
      
      // Filter by network if provided
      const filteredRoutes = networkName 
        ? routes.filter(route => route.network && route.network.includes(`/${networkName}`) || route.network === networkName)
        : routes;
      
      // Cache the result
      this.routeCache.set(cacheKey, { data: filteredRoutes, timestamp: now });
      
      return filteredRoutes;
    } catch (error: any) {
      console.error("Error fetching routes:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Get list of VPN gateways, optionally filtered by region
   * @param region Optional region to filter VPN gateways
   * @returns Promise with array of VPN gateways
   */
  async getVPNGateways(region?: string): Promise<VpnGateway[]> {
    const cacheKey = region ? `vpn-gateways-${region}` : 'vpn-gateways';
    const cachedData = this.vpnGatewayCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached VPN gateway data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      const regionFlag = region ? ` --regions=${region}` : '';
      const command = `compute vpn-gateways list${regionFlag} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const gateways: VpnGateway[] = Array.isArray(result) ? result : (result ? [result] : []);
      
      // Cache the result
      this.vpnGatewayCache.set(cacheKey, { data: gateways, timestamp: now });
      
      return gateways;
    } catch (error: any) {
      console.error("Error fetching VPN gateways:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Get list of VPN tunnels, optionally filtered by region
   * @param region Optional region to filter VPN tunnels
   * @returns Promise with array of VPN tunnels
   */
  async getVPNTunnels(region?: string): Promise<VpnTunnel[]> {
    const cacheKey = region ? `vpn-tunnels-${region}` : 'vpn-tunnels';
    const cachedData = this.vpnTunnelCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached VPN tunnel data for ${cacheKey}`);
      return cachedData.data;
    }
    
    try {
      const regionFlag = region ? ` --regions=${region}` : '';
      const command = `compute vpn-tunnels list${regionFlag} --project=${this.projectId} --format=json`;
      
      console.log(`Executing command: ${command}`);
      
      const result = await executeGcloudCommand(this.gcloudPath, command);
      
      const tunnels: VpnTunnel[] = Array.isArray(result) ? result : (result ? [result] : []);
      
      // Cache the result
      this.vpnTunnelCache.set(cacheKey, { data: tunnels, timestamp: now });
      
      return tunnels;
    } catch (error: any) {
      console.error("Error fetching VPN tunnels:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Create a new VPC network
   * @param name Network name
   * @param options Additional network options
   * @returns Promise with success boolean
   */
  async createVPCNetwork(name: string, options: {
    description?: string;
    subnetMode?: 'auto' | 'custom';
    bgpRoutingMode?: 'regional' | 'global';
    mtu?: number;
  } = {}): Promise<boolean> {
    try {
      const { description, subnetMode, bgpRoutingMode, mtu } = options;
      
      let command = `compute networks create ${name}`;
      
      if (description) {
        command += ` --description="${description}"`;
      }
      
      if (subnetMode === 'auto') {
        command += ` --subnet-mode=auto`;
      } else if (subnetMode === 'custom') {
        command += ` --subnet-mode=custom`;
      }
      
      if (bgpRoutingMode) {
        command += ` --bgp-routing-mode=${bgpRoutingMode}`;
      }
      
      if (mtu) {
        command += ` --mtu=${mtu}`;
      }
      
      command += ` --project=${this.projectId}`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearVPCCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error creating VPC network ${name}:`, error);
      return false;
    }
  }

  /**
   * Create a new subnetwork
   * @param name Subnetwork name
   * @param network Parent VPC network name
   * @param region Region for the subnetwork
   * @param ipRange CIDR range for the subnetwork
   * @param options Additional subnetwork options
   * @returns Promise with success boolean
   */
  async createSubnetwork(
    name: string,
    network: string,
    region: string, 
    ipRange: string,
    options: {
      description?: string;
      privateIpGoogleAccess?: boolean;
      secondaryIpRanges?: {name: string, range: string}[];
      enableFlowLogs?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const { description, privateIpGoogleAccess, secondaryIpRanges, enableFlowLogs } = options;
      
      let command = `compute networks subnets create ${name} --network=${network} --region=${region} --range=${ipRange}`;
      
      if (description) {
        command += ` --description="${description}"`;
      }
      
      if (privateIpGoogleAccess) {
        command += ` --enable-private-ip-google-access`;
      }
      
      if (secondaryIpRanges && secondaryIpRanges.length > 0) {
        const rangeSpecs = secondaryIpRanges.map(r => `${r.name}:${r.range}`).join(',');
        command += ` --secondary-range=${rangeSpecs}`;
      }
      
      if (enableFlowLogs) {
        command += ` --enable-flow-logs`;
      }
      
      command += ` --project=${this.projectId}`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearSubnetworkCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error creating subnetwork ${name}:`, error);
      return false;
    }
  }

  /**
   * Create a new firewall rule
   * @param name Firewall rule name
   * @param network Network name
   * @param options Firewall rule options
   * @returns Promise with success boolean
   */
  async createFirewallRule(
    name: string,
    network: string,
    options: {
      description?: string;
      direction?: 'ingress' | 'egress';
      priority?: number;
      sourceRanges?: string[];
      destinationRanges?: string[];
      sourceTags?: string[];
      targetTags?: string[];
      allowed?: {protocol: string, ports?: string[]}[];
      denied?: {protocol: string, ports?: string[]}[];
      disabled?: boolean;
      logConfig?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const { 
        description, direction, priority, sourceRanges, destinationRanges,
        sourceTags, targetTags, allowed, denied, disabled, logConfig
      } = options;
      
      let command = `compute firewall-rules create ${name} --network=${network}`;
      
      if (description) {
        command += ` --description="${description}"`;
      }
      
      if (direction) {
        command += ` --direction=${direction}`;
      }
      
      if (priority !== undefined) {
        command += ` --priority=${priority}`;
      }
      
      if (sourceRanges && sourceRanges.length > 0) {
        command += ` --source-ranges=${sourceRanges.join(',')}`;
      }
      
      if (destinationRanges && destinationRanges.length > 0) {
        command += ` --destination-ranges=${destinationRanges.join(',')}`;
      }
      
      if (sourceTags && sourceTags.length > 0) {
        command += ` --source-tags=${sourceTags.join(',')}`;
      }
      
      if (targetTags && targetTags.length > 0) {
        command += ` --target-tags=${targetTags.join(',')}`;
      }
      
      if (allowed && allowed.length > 0) {
        for (const rule of allowed) {
          let ruleSpec = rule.protocol;
          if (rule.ports && rule.ports.length > 0) {
            ruleSpec += `:${rule.ports.join(',')}`;
          }
          command += ` --allow=${ruleSpec}`;
        }
      }
      
      if (denied && denied.length > 0) {
        for (const rule of denied) {
          let ruleSpec = rule.protocol;
          if (rule.ports && rule.ports.length > 0) {
            ruleSpec += `:${rule.ports.join(',')}`;
          }
          command += ` --deny=${ruleSpec}`;
        }
      }
      
      if (disabled) {
        command += ` --disabled`;
      }
      
      if (logConfig) {
        command += ` --enable-logging`;
      }
      
      command += ` --project=${this.projectId}`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearFirewallCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error creating firewall rule ${name}:`, error);
      return false;
    }
  }

  /**
   * List available regions for the project
   * @returns Promise with array of region names
   */
  async listRegions(): Promise<string[]> {
    const cacheKey = 'regions';
    const cachedData = this.regionsCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < this.CACHE_TTL)) {
      console.log(`Using cached region data`);
      return cachedData.data;
    }
    
    try {
      const command = `compute regions list --project=${this.projectId} --format="value(name)"`;
      
      console.log(`Executing command: ${command}`);
      
      const { stdout } = await execPromise(`${this.gcloudPath} ${command}`);
      const regions = stdout.trim().split('\n').filter(Boolean);
      
      // Cache the result
      this.regionsCache.set(cacheKey, { data: regions, timestamp: now });
      
      return regions;
    } catch (error: any) {
      console.error("Error fetching regions:", error);
      
      if (cachedData) {
        return cachedData.data;
      }
      
      return [];
    }
  }

  /**
   * Delete a VPC network
   * @param name Network name
   * @returns Promise with success boolean
   */
  async deleteVPCNetwork(name: string): Promise<boolean> {
    try {
      const command = `compute networks delete ${name} --project=${this.projectId} --quiet`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearVPCCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error deleting VPC network ${name}:`, error);
      return false;
    }
  }

  /**
   * Delete a subnetwork
   * @param name Subnetwork name
   * @param region Region of the subnetwork
   * @returns Promise with success boolean
   */
  async deleteSubnetwork(name: string, region: string): Promise<boolean> {
    try {
      const command = `compute networks subnets delete ${name} --region=${region} --project=${this.projectId} --quiet`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearSubnetworkCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error deleting subnetwork ${name}:`, error);
      return false;
    }
  }

  /**
   * Delete a firewall rule
   * @param name Firewall rule name
   * @returns Promise with success boolean
   */
  async deleteFirewallRule(name: string): Promise<boolean> {
    try {
      const command = `compute firewall-rules delete ${name} --project=${this.projectId} --quiet`;
      
      console.log(`Executing command: ${command}`);
      
      await executeGcloudCommand(this.gcloudPath, command);
      
      // Clear the cache to force a refresh
      this.clearFirewallCache();
      
      return true;
    } catch (error: any) {
      console.error(`Error deleting firewall rule ${name}:`, error);
      return false;
    }
  }

  // Helper methods to clear cache
  private clearVPCCache(): void {
    this.vpcCache.clear();
  }
  
  private clearSubnetworkCache(): void {
    this.subnetworkCache.clear();
  }
  
  private clearFirewallCache(): void {
    this.firewallCache.clear();
  }
  
  private clearRouteCache(): void {
    this.routeCache.clear();
  }
  
  private clearVPNGatewayCache(): void {
    this.vpnGatewayCache.clear();
  }
  
  private clearVPNTunnelCache(): void {
    this.vpnTunnelCache.clear();
  }
  
  // Formatting helpers
  formatNetworkName(network: string): string {
    if (!network) return '';
    // Extract the network name from the URL or path
    const parts = network.split('/');
    return parts[parts.length - 1];
  }
  
  formatRegionName(region: string): string {
    if (!region) return '';
    // Extract the region name from the URL or path
    const parts = region.split('/');
    return parts[parts.length - 1];
  }
  
  getFirewallRuleTypeIcon(rule: FirewallRule): { source: string; tintColor: string } {
    // Determine the icon based on rule type (ingress/egress) and allow/deny
    let source = 'globe';
    let tintColor = '#4285F4'; // Google Blue
    
    if (rule.direction === 'INGRESS') {
      source = rule.allowed ? 'arrow-down' : 'slash-circle';
      tintColor = rule.allowed ? '#34A853' : '#EA4335'; // Google Green : Google Red
    } else {
      source = rule.allowed ? 'arrow-up' : 'slash-circle'; 
      tintColor = rule.allowed ? '#34A853' : '#EA4335'; // Google Green : Google Red
    }
    
    return { source, tintColor };
  }
  
  getVPNStatusColor(status: string): string {
    if (!status) return '#FBBC05'; // Google Yellow
    
    switch (status.toUpperCase()) {
      case 'ESTABLISHED':
      case 'ACTIVE':
      case 'RUNNING': 
        return '#34A853'; // Google Green
      case 'ESTABLISHING':
      case 'PROVISIONING':
        return '#FBBC05'; // Google Yellow
      case 'FAILED':
      case 'TERMINATED':
        return '#EA4335'; // Google Red
      default:
        return '#4285F4'; // Google Blue
    }
  }
} 