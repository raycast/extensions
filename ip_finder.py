# Copyright © 2025
# All rights reserved.

import ipaddress
import socket
import threading
import time
from typing import List, Set, Tuple
import argparse
import sys


class IPFinder:
    """
    A utility class to detect assigned IPs on a local network and recommend available ones.
    """
    
    def __init__(self, timeout: float = 1.0, max_threads: int = 100):
        """
        Initialize the IPFinder.
        
        Args:
            timeout: Timeout for ping attempts in seconds
            max_threads: Maximum number of concurrent threads for scanning
        """
        self.timeout = timeout
        self.max_threads = max_threads
        self.assigned_ips: Set[str] = set()
        self.lock = threading.Lock()
    
    def get_local_ip_and_subnet(self) -> Tuple[str, str]:
        """
        Get the local IP address and subnet.
        
        Returns:
            Tuple of (local_ip, subnet)
        """
        try:
            # Create a socket to get local IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
            
            # Get subnet by assuming /24 (common for home networks)
            # This can be enhanced to detect actual subnet mask
            subnet = f"{local_ip.rsplit('.', 1)[0]}.0/24"
            return local_ip, subnet
            
        except Exception as e:
            print(f"Error getting local IP: {e}")
            return "192.168.1.1", "192.168.1.0/24"  # Fallback
    
    def ping_ip(self, ip: str) -> bool:
        """
        Ping an IP address to check if it's reachable.
        
        Args:
            ip: IP address to ping
            
        Returns:
            True if IP is reachable, False otherwise
        """
        try:
            # Try to connect to the IP on a common port
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(self.timeout)
                result = s.connect_ex((ip, 80))  # Try port 80
                if result == 0:
                    return True
                
                # Try port 22 (SSH) as fallback
                s.settimeout(self.timeout)
                result = s.connect_ex((ip, 22))
                return result == 0
                
        except Exception:
            return False
    
    def scan_ip(self, ip: str):
        """
        Scan a single IP address and add to assigned list if reachable.
        
        Args:
            ip: IP address to scan
        """
        if self.ping_ip(ip):
            with self.lock:
                self.assigned_ips.add(ip)
    
    def scan_network(self, subnet: str) -> Set[str]:
        """
        Scan the entire subnet for assigned IPs.
        
        Args:
            subnet: Subnet in CIDR notation (e.g., "192.168.1.0/24")
            
        Returns:
            Set of assigned IP addresses
        """
        try:
            network = ipaddress.IPv4Network(subnet, strict=False)
            print(f"Scanning network: {subnet}")
            print(f"Total IPs to scan: {network.num_addresses}")
            
            # Create threads for scanning
            threads = []
            for ip in network.hosts():
                ip_str = str(ip)
                
                # Limit concurrent threads
                while len(threads) >= self.max_threads:
                    # Wait for some threads to complete
                    threads = [t for t in threads if t.is_alive()]
                    time.sleep(0.1)
                
                thread = threading.Thread(target=self.scan_ip, args=(ip_str,))
                thread.daemon = True
                thread.start()
                threads.append(thread)
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            print(f"Scan completed. Found {len(self.assigned_ips)} assigned IPs.")
            return self.assigned_ips
            
        except Exception as e:
            print(f"Error scanning network: {e}")
            return set()
    
    def recommend_ips(self, subnet: str, count: int = 10) -> List[str]:
        """
        Recommend available IPs from the subnet.
        
        Args:
            subnet: Subnet in CIDR notation
            count: Number of IPs to recommend
            
        Returns:
            List of recommended IP addresses
        """
        try:
            network = ipaddress.IPv4Network(subnet, strict=False)
            available_ips = []
            
            for ip in network.hosts():
                ip_str = str(ip)
                if ip_str not in self.assigned_ips:
                    available_ips.append(ip_str)
                    if len(available_ips) >= count:
                        break
            
            return available_ips
            
        except Exception as e:
            print(f"Error recommending IPs: {e}")
            return []
    
    def print_network_info(self, subnet: str, assigned_ips: Set[str], recommended_ips: List[str]):
        """
        Print formatted network information.
        
        Args:
            subnet: Subnet being analyzed
            assigned_ips: Set of assigned IP addresses
            recommended_ips: List of recommended IP addresses
        """
        print("\n" + "="*60)
        print("NETWORK ANALYSIS REPORT")
        print("="*60)
        print(f"Subnet: {subnet}")
        print(f"Total assigned IPs found: {len(assigned_ips)}")
        
        if assigned_ips:
            print("\nCurrently Assigned IPs:")
            print("-" * 30)
            for ip in sorted(assigned_ips, key=lambda x: ipaddress.IPv4Address(x)):
                print(f"  • {ip}")
        
        print(f"\nRecommended Available IPs:")
        print("-" * 30)
        for i, ip in enumerate(recommended_ips, 1):
            print(f"  {i:2d}. {ip}")
        
        print("\n" + "="*60)


def main():
    """Main function to run the IP finder application."""
    parser = argparse.ArgumentParser(
        description="Detect assigned IPs on local network and recommend available ones"
    )
    parser.add_argument(
        "--subnet", 
        help="Subnet to scan (e.g., 192.168.1.0/24). Auto-detected if not specified."
    )
    parser.add_argument(
        "--timeout", 
        type=float, 
        default=1.0,
        help="Timeout for ping attempts in seconds (default: 1.0)"
    )
    parser.add_argument(
        "--max-threads", 
        type=int, 
        default=100,
        help="Maximum concurrent threads for scanning (default: 100)"
    )
    parser.add_argument(
        "--recommendations", 
        type=int, 
        default=10,
        help="Number of IP recommendations to show (default: 10)"
    )
    
    args = parser.parse_args()
    
    # Create IP finder instance
    ip_finder = IPFinder(timeout=args.timeout, max_threads=args.max_threads)
    
    # Get subnet
    if args.subnet:
        subnet = args.subnet
        local_ip = "Unknown"
    else:
        local_ip, subnet = ip_finder.get_local_ip_and_subnet()
        print(f"Local IP: {local_ip}")
    
    # Scan network
    assigned_ips = ip_finder.scan_network(subnet)
    
    # Get recommendations
    recommended_ips = ip_finder.recommend_ips(subnet, args.recommendations)
    
    # Print results
    ip_finder.print_network_info(subnet, assigned_ips, recommended_ips)


if __name__ == "__main__":
    main() 