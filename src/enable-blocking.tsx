/**
 * Enable Blocking Command
 * Activates website blocking by adding domains to the hosts file
 */

import {
  showToast,
  Toast,
  showHUD,
  confirmAlert,
  Alert
} from '@raycast/api';

import { getBlockedDomainList, setBlockingStatus } from './storage';
import { addDomainsToHosts, isSudoAvailable } from './hostsManager';

export default async function EnableBlocking() {
  try {
    // Check if there are domains to block
    const domainsToBlock = await getBlockedDomainList();
    
    if (domainsToBlock.length === 0) {
      await showHUD('❌ No websites in your block list. Add some websites first!');
      return;
    }

    // Check if sudo is available
    const sudoAvailable = await isSudoAvailable();
    if (!sudoAvailable) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'System Error',
        message: 'Administrator privileges are required but sudo is not available'
      });
      return;
    }

    // Show confirmation dialog with details
    const confirmed = await confirmAlert({
      title: 'Enable Site Blocking',
      message: `This will block ${domainsToBlock.length} website(s) by modifying your system's hosts file. You'll need to enter your password.`,
      primaryAction: {
        title: 'Enable Blocking',
        style: Alert.ActionStyle.Default
      },
      dismissAction: {
        title: 'Cancel',
        style: Alert.ActionStyle.Cancel
      }
    });

    if (!confirmed) {
      return;
    }

    // Show loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: 'Enabling Site Blocking...',
      message: 'Please enter your password when prompted'
    });

    try {
      // Add domains to hosts file
      const result = await addDomainsToHosts(domainsToBlock);
      
      if (result.success) {
        // Update blocking status
        await setBlockingStatus(true);
        
        // Show success feedback
        await showToast({
          style: Toast.Style.Success,
          title: '🚫 Site Blocking Enabled',
          message: `Successfully blocked ${domainsToBlock.length} website(s)`
        });
        
        // Show additional info if backup was created
        if (result.backupCreated) {
          await showHUD('✅ Backup created at /etc/hosts.siteblocker.bak');
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Enable Blocking',
          message: result.message
        });
      }
    } catch (error: any) {
      loadingToast.hide();
      
      // Handle specific error cases
      if (error.message.includes('Authentication was canceled')) {
        await showHUD('⚠️ Authentication canceled - blocking not enabled');
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Error Enabling Blocking',
          message: error.message || 'An unexpected error occurred'
        });
      }
      
      console.error('Error enabling blocking:', error);
    }
    
  } catch (error: any) {
    console.error('Error in EnableBlocking command:', error);
    await showToast({
      style: Toast.Style.Failure,
      title: 'Unexpected Error',
      message: 'Failed to enable site blocking'
    });
  }
}