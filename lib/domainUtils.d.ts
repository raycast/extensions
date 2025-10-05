export declare function sanitizeDomain(input: string): string;
export declare function isValidDomain(domain: string): boolean;
export declare function processDomainInput(input: string): {
    domain: string;
    isValid: boolean;
    error?: string;
};
export declare function isDuplicateDomain(domain: string, existingDomains: string[]): boolean;
export declare function formatDomainForDisplay(domain: string): string;
//# sourceMappingURL=domainUtils.d.ts.map