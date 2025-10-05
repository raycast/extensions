/**
 * View Blocked Sites Command
 * Provides a list interface for viewing and managing blocked domains
 */

import React, { useState, useEffect } from 'react';
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Icon,
  Color
} from '@raycast/api';

import { BlockedDomain, getBlockedDomains, removeBlockedDomain, getBlockingStatus } from './lib/storage';
import { formatDomainForDisplay } from './lib/domainUtils';
import AddWebsite from './add-website';

export default function ViewBlockedSites() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockingActive, setIsBlockingActive] = useState(false);

  // Load domains and blocking status
  useEffect(() => {
    async function loadData() {
      try {
        const [blockedDomains, blockingStatus] = await Promise.all([
          getBlockedDomains(),
          getBlockingStatus()
        ]);
        
        setDomains(blockedDomains);
        setIsBlockingActive(blockingStatus.isActive);
      } catch (error) {
        console.error('Error loading blocked sites:', error);
        await showToast({
          style: Toast.Style.Failure,
          title: 'Failed to Load',
          message: 'Could not load blocked sites list'
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle domain deletion
  async function handleDeleteDomain(domain: string) {
    const confirmed = await confirmAlert({
      title: 'Remove Website',
      message: `Are you sure you want to remove "${domain}" from your block list?`,
      primaryAction: {
        title: 'Remove',
        style: Alert.ActionStyle.Destructive
      },
      dismissAction: {
        title: 'Cancel',
        style: Alert.ActionStyle.Cancel
      }
    });

    if (!confirmed) {
      return;
    }

    try {
      const success = await removeBlockedDomain(domain);
      
      if (success) {
        // Update local state
        setDomains(prevDomains => 
          prevDomains.filter(d => d.domain !== domain)
        );
        
        await showToast({
          style: Toast.Style.Success,
          title: 'Website Removed',
          message: `${domain} has been removed from your block list`
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Not Found',
          message: `${domain} was not found in your block list`
        });
      }
    } catch (error: any) {
      console.error('Error removing domain:', error);
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Remove',
        message: error.message || 'Could not remove website from block list'
      });
    }
  }

  // Format date for display
  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  }

  // Empty state
  if (!isLoading && domains.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Blocked Websites"
          description="You haven't added any websites to your block list yet."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Website"
                target={<AddWebsite />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {/* Header section showing current status */}
      <List.Section title="Status">
        <List.Item
          title={isBlockingActive ? "🚫 Blocking is ACTIVE" : "✅ Blocking is INACTIVE"}
          subtitle={
            isBlockingActive 
              ? `${domains.length} website(s) are currently blocked`
              : `${domains.length} website(s) in your list (not currently blocking)`
          }
          accessories={[
            {
              text: isBlockingActive ? "Active" : "Inactive",
              icon: isBlockingActive ? Icon.CheckCircle : Icon.XMarkCircle
            }
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Website"
                target={<AddWebsite />}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Blocked domains list */}
      <List.Section title={`Blocked Websites (${domains.length})`}>
        {domains.map((blockedDomain) => (
          <List.Item
            key={blockedDomain.domain}
            title={formatDomainForDisplay(blockedDomain.domain)}
            subtitle={blockedDomain.notes || 'No notes'}
            accessories={[
              {
                text: formatDate(blockedDomain.dateAdded),
                icon: Icon.Calendar
              }
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action
                    title="Remove Website"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDeleteDomain(blockedDomain.domain)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={blockedDomain.domain}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Manage">
                  <Action.Push
                    title="Add Website"
                    target={<AddWebsite />}
                    icon={Icon.Plus}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

