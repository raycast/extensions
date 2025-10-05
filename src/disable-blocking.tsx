/**
 * Disable Blocking Command
 * Deactivates website blocking by removing domains from the hosts file
 */

import {
  showToast,
  Toast,
  showHUD,
  confirmAlert,
  Alert
} from '@raycast/api';

import { setBlockingStatus, getBlockingStatus } from './lib/storage';
import { removeDomainsFromHosts, isSudoAvailable } from './lib/hostsManager';

export default async function DisableBlocking() {
  try {
    // Check current blocking status
    const status = await getBlockingStatus();
    
    if (!status.isActive) {
      await showHUD('ℹ️ Site blocking is already disabled');
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

    // Show confirmation dialog
    const confirmed = await confirmAlert({
      title: 'Disable Site Blocking',
      message: 'This will remove all SiteBlocker entries from your hosts file and restore access to blocked websites. You\'ll need to enter your password.',
      primaryAction: {
        title: 'Disable Blocking',
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
      title: 'Disabling Site Blocking...',
      message: 'Please enter your password when prompted'
    });

    try {
      // Remove domains from hosts file
      const result = await removeDomainsFromHosts();
      
      if (result.success) {
        // Update blocking status
        await setBlockingStatus(false);
        
        // Show success feedback
        await showToast({
          style: Toast.Style.Success,
          title: '✅ Site Blocking Disabled',
          message: 'All websites are now accessible again'
        });
        
        // Additional info about what happened
        if (result.message.includes('No blocked domains found')) {
          await showHUD('ℹ️ No blocked domains were found in hosts file');
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Disable Blocking',
          message: result.message
        });
      }
    } catch (error: any) {
      loadingToast.hide();
      
      // Handle specific error cases
      if (error.message.includes('Authentication was canceled')) {
        await showHUD('⚠️ Authentication canceled - blocking remains enabled');
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Error Disabling Blocking',
          message: error.message || 'An unexpected error occurred'
        });
      }
      
      console.error('Error disabling blocking:', error);
    }
    
  } catch (error: any) {
    console.error('Error in DisableBlocking command:', error);
    await showToast({
      style: Toast.Style.Failure,
      title: 'Unexpected Error',
      message: 'Failed to disable site blocking'
    });
  }
}