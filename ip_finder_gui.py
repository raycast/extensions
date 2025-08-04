# Copyright © 2025
# All rights reserved.

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import queue
import ipaddress
import socket
import time
from typing import List, Set, Tuple
from ip_finder import IPFinder


class IPFinderGUI:
    """
    GUI application for IP Finder using tkinter.
    """
    
    def __init__(self, root):
        """
        Initialize the GUI application.
        
        Args:
            root: The main tkinter window
        """
        self.root = root
        self.root.title("IP Finder - Network Scanner")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Initialize IP finder
        self.ip_finder = IPFinder(timeout=1.0, max_threads=100)
        
        # Threading
        self.scan_thread = None
        self.message_queue = queue.Queue()
        
        # GUI variables
        self.subnet_var = tk.StringVar()
        self.timeout_var = tk.DoubleVar(value=1.0)
        self.max_threads_var = tk.IntVar(value=100)
        self.recommendations_var = tk.IntVar(value=10)
        
        # Create GUI components
        self.create_widgets()
        self.setup_styles()
        
        # Start message processing
        self.process_messages()
    
    def setup_styles(self):
        """Setup modern styling for the GUI."""
        style = ttk.Style()
        
        # Configure styles
        style.configure('Title.TLabel', font=('Arial', 16, 'bold'))
        style.configure('Header.TLabel', font=('Arial', 12, 'bold'))
        style.configure('Info.TLabel', font=('Arial', 10))
        
        # Configure button styles
        style.configure('Scan.TButton', font=('Arial', 10, 'bold'))
        style.configure('Stop.TButton', font=('Arial', 10, 'bold'))
    
    def create_widgets(self):
        """Create and arrange all GUI widgets."""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(4, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="IP Finder - Network Scanner", style='Title.TLabel')
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Settings frame
        settings_frame = ttk.LabelFrame(main_frame, text="Scan Settings", padding="10")
        settings_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        settings_frame.columnconfigure(1, weight=1)
        
        # Subnet setting
        ttk.Label(settings_frame, text="Subnet:", style='Header.TLabel').grid(row=0, column=0, sticky=tk.W, padx=(0, 10))
        subnet_entry = ttk.Entry(settings_frame, textvariable=self.subnet_var, width=20)
        subnet_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(0, 10))
        ttk.Label(settings_frame, text="(e.g., 192.168.1.0/24) Leave empty for auto-detect", style='Info.TLabel').grid(row=0, column=2, sticky=tk.W)
        
        # Timeout setting
        ttk.Label(settings_frame, text="Timeout (seconds):", style='Header.TLabel').grid(row=1, column=0, sticky=tk.W, padx=(0, 10), pady=(10, 0))
        timeout_spinbox = ttk.Spinbox(settings_frame, from_=0.1, to=10.0, increment=0.1, textvariable=self.timeout_var, width=10)
        timeout_spinbox.grid(row=1, column=1, sticky=tk.W, padx=(0, 10), pady=(10, 0))
        
        # Max threads setting
        ttk.Label(settings_frame, text="Max Threads:", style='Header.TLabel').grid(row=1, column=2, sticky=tk.W, padx=(20, 10), pady=(10, 0))
        threads_spinbox = ttk.Spinbox(settings_frame, from_=1, to=500, increment=1, textvariable=self.max_threads_var, width=10)
        threads_spinbox.grid(row=1, column=3, sticky=tk.W, pady=(10, 0))
        
        # Recommendations setting
        ttk.Label(settings_frame, text="Recommendations:", style='Header.TLabel').grid(row=2, column=0, sticky=tk.W, padx=(0, 10), pady=(10, 0))
        rec_spinbox = ttk.Spinbox(settings_frame, from_=1, to=50, increment=1, textvariable=self.recommendations_var, width=10)
        rec_spinbox.grid(row=2, column=1, sticky=tk.W, padx=(0, 10), pady=(10, 0))
        
        # Control buttons frame
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=2, column=0, columnspan=3, pady=(10, 0))
        
        # Scan button
        self.scan_button = ttk.Button(button_frame, text="Start Scan", command=self.start_scan, style='Scan.TButton')
        self.scan_button.pack(side=tk.LEFT, padx=(0, 10))
        
        # Stop button
        self.stop_button = ttk.Button(button_frame, text="Stop Scan", command=self.stop_scan, style='Stop.TButton', state=tk.DISABLED)
        self.stop_button.pack(side=tk.LEFT, padx=(0, 10))
        
        # Clear button
        clear_button = ttk.Button(button_frame, text="Clear Results", command=self.clear_results)
        clear_button.pack(side=tk.LEFT, padx=(0, 10))
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(main_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(10, 0))
        
        # Status label
        self.status_var = tk.StringVar(value="Ready to scan")
        status_label = ttk.Label(main_frame, textvariable=self.status_var, style='Info.TLabel')
        status_label.grid(row=4, column=0, columnspan=3, sticky=tk.W, pady=(5, 0))
        
        # Results notebook
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        
        # Assigned IPs tab
        assigned_frame = ttk.Frame(self.notebook)
        self.notebook.add(assigned_frame, text="Assigned IPs")
        
        self.assigned_text = scrolledtext.ScrolledText(assigned_frame, height=15, width=80)
        self.assigned_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Recommended IPs tab
        recommended_frame = ttk.Frame(self.notebook)
        self.notebook.add(recommended_frame, text="Recommended IPs")
        
        self.recommended_text = scrolledtext.ScrolledText(recommended_frame, height=15, width=80)
        self.recommended_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Network Info tab
        info_frame = ttk.Frame(self.notebook)
        self.notebook.add(info_frame, text="Network Info")
        
        self.info_text = scrolledtext.ScrolledText(info_frame, height=15, width=80)
        self.info_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Bind events
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def start_scan(self):
        """Start the network scanning process in a separate thread."""
        if self.scan_thread and self.scan_thread.is_alive():
            messagebox.showwarning("Scan in Progress", "A scan is already running!")
            return
        
        # Clear previous results
        self.clear_results()
        
        # Update UI
        self.scan_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.progress_var.set(0)
        self.status_var.set("Initializing scan...")
        
        # Get settings
        subnet = self.subnet_var.get().strip()
        timeout = self.timeout_var.get()
        max_threads = self.max_threads_var.get()
        recommendations = self.recommendations_var.get()
        
        # Update IP finder settings
        self.ip_finder.timeout = timeout
        self.ip_finder.max_threads = max_threads
        
        # Start scan thread
        self.scan_thread = threading.Thread(
            target=self.scan_network_thread,
            args=(subnet, recommendations),
            daemon=True
        )
        self.scan_thread.start()
    
    def stop_scan(self):
        """Stop the current scan."""
        if self.scan_thread and self.scan_thread.is_alive():
            self.status_var.set("Stopping scan...")
            # The scan will stop when the thread completes naturally
            # For a more immediate stop, we'd need to implement a stop flag
    
    def scan_network_thread(self, subnet: str, recommendations: int):
        """Run the network scan in a separate thread."""
        try:
            # Get subnet if not provided
            if not subnet:
                local_ip, subnet = self.ip_finder.get_local_ip_and_subnet()
                self.message_queue.put(("status", f"Auto-detected subnet: {subnet}"))
                self.message_queue.put(("info", f"Local IP: {local_ip}\nSubnet: {subnet}\n"))
            else:
                self.message_queue.put(("status", f"Using specified subnet: {subnet}"))
                self.message_queue.put(("info", f"Subnet: {subnet}\n"))
            
            # Scan network
            self.message_queue.put(("status", "Scanning network..."))
            assigned_ips = self.ip_finder.scan_network(subnet)
            
            # Get recommendations
            self.message_queue.put(("status", "Generating recommendations..."))
            recommended_ips = self.ip_finder.recommend_ips(subnet, recommendations)
            
            # Update results
            self.message_queue.put(("assigned", assigned_ips))
            self.message_queue.put(("recommended", recommended_ips))
            self.message_queue.put(("status", "Scan completed successfully!"))
            self.message_queue.put(("progress", 100))
            
        except Exception as e:
            self.message_queue.put(("status", f"Error during scan: {str(e)}"))
            messagebox.showerror("Scan Error", f"An error occurred during scanning:\n{str(e)}")
        finally:
            self.message_queue.put(("scan_complete", None))
    
    def process_messages(self):
        """Process messages from the scan thread."""
        try:
            while True:
                try:
                    msg_type, data = self.message_queue.get_nowait()
                    
                    if msg_type == "status":
                        self.status_var.set(data)
                    elif msg_type == "progress":
                        self.progress_var.set(data)
                    elif msg_type == "assigned":
                        self.update_assigned_ips(data)
                    elif msg_type == "recommended":
                        self.update_recommended_ips(data)
                    elif msg_type == "info":
                        self.update_network_info(data)
                    elif msg_type == "scan_complete":
                        self.scan_button.config(state=tk.NORMAL)
                        self.stop_button.config(state=tk.DISABLED)
                    
                except queue.Empty:
                    break
                    
        except Exception as e:
            print(f"Error processing messages: {e}")
        
        # Schedule next check
        self.root.after(100, self.process_messages)
    
    def update_assigned_ips(self, assigned_ips: Set[str]):
        """Update the assigned IPs display."""
        self.assigned_text.delete(1.0, tk.END)
        if assigned_ips:
            self.assigned_text.insert(tk.END, f"Found {len(assigned_ips)} assigned IP addresses:\n\n")
            for ip in sorted(assigned_ips, key=lambda x: ipaddress.IPv4Address(x)):
                self.assigned_text.insert(tk.END, f"• {ip}\n")
        else:
            self.assigned_text.insert(tk.END, "No assigned IPs found.\n")
    
    def update_recommended_ips(self, recommended_ips: List[str]):
        """Update the recommended IPs display."""
        self.recommended_text.delete(1.0, tk.END)
        if recommended_ips:
            self.recommended_text.insert(tk.END, f"Recommended {len(recommended_ips)} available IP addresses:\n\n")
            for i, ip in enumerate(recommended_ips, 1):
                self.recommended_text.insert(tk.END, f"{i:2d}. {ip}\n")
        else:
            self.recommended_text.insert(tk.END, "No available IPs found.\n")
    
    def update_network_info(self, info: str):
        """Update the network info display."""
        self.info_text.delete(1.0, tk.END)
        self.info_text.insert(tk.END, info)
    
    def clear_results(self):
        """Clear all result displays."""
        self.assigned_text.delete(1.0, tk.END)
        self.recommended_text.delete(1.0, tk.END)
        self.info_text.delete(1.0, tk.END)
        self.progress_var.set(0)
        self.status_var.set("Ready to scan")
    
    def on_closing(self):
        """Handle window closing."""
        if self.scan_thread and self.scan_thread.is_alive():
            if messagebox.askokcancel("Quit", "A scan is in progress. Do you want to quit anyway?"):
                self.root.destroy()
        else:
            self.root.destroy()


def main():
    """Main function to run the GUI application."""
    root = tk.Tk()
    app = IPFinderGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main() 