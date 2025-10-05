export interface BlockedDomain {
    domain: string;
    dateAdded: string;
    notes?: string;
}
export interface BlockingStatus {
    isActive: boolean;
    lastActivated?: string;
    lastDeactivated?: string;
}
export declare function getBlockedDomains(): Promise<BlockedDomain[]>;
export declare function saveBlockedDomains(domains: BlockedDomain[]): Promise<void>;
export declare function addBlockedDomain(domain: string, notes?: string): Promise<boolean>;
export declare function removeBlockedDomain(domain: string): Promise<boolean>;
export declare function getBlockingStatus(): Promise<BlockingStatus>;
export declare function setBlockingStatus(isActive: boolean): Promise<void>;
export declare function getBlockedDomainList(): Promise<string[]>;
export declare function clearAllBlockedDomains(): Promise<void>;
//# sourceMappingURL=storage.d.ts.map