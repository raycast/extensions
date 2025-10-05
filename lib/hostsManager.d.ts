export interface HostsOperationResult {
    success: boolean;
    message: string;
    backupCreated?: boolean;
}
export declare function isSudoAvailable(): Promise<boolean>;
export declare function readHostsFile(): Promise<string>;
export declare function createHostsBackup(): Promise<HostsOperationResult>;
export declare function restoreHostsFromBackup(): Promise<HostsOperationResult>;
export declare function addDomainsToHosts(domains: string[]): Promise<HostsOperationResult>;
export declare function removeDomainsFromHosts(): Promise<HostsOperationResult>;
export declare function checkDomainsBlocked(domains: string[]): Promise<{
    [domain: string]: boolean;
}>;
export declare function getBlockedDomainsFromHosts(): Promise<string[]>;
//# sourceMappingURL=hostsManager.d.ts.map