/**
 * Add Website Command
 * Provides a form interface for adding websites to the block list
 */

import React, { useState } from 'react';
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showHUD,
  popToRoot,
  useNavigation
} from '@raycast/api';

import { processDomainInput, isDuplicateDomain } from './domainUtils';
import { addBlockedDomain, getBlockedDomainList } from './storage';

interface FormValues {
  domain: string;
  notes: string;
}

export default function AddWebsite() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    
    try {
      // Process and validate domain input
      const { domain, isValid, error } = processDomainInput(values.domain);
      
      if (!isValid) {
        await showHUD(`❌ ${error}`);
        setIsLoading(false);
        return;
      }

      // Check for duplicates
      const existingDomains = await getBlockedDomainList();
      if (isDuplicateDomain(domain, existingDomains)) {
        await showHUD(`❌ ${domain} is already in your block list`);
        setIsLoading(false);
        return;
      }

      // Add domain to storage
      await addBlockedDomain(domain, values.notes.trim() || undefined);
      
      // Show success feedback
      await showToast({
        style: Toast.Style.Success,
        title: 'Website Added',
        message: `${domain} added to your block list`
      });

      // Close the form
      pop();
      
    } catch (error: any) {
      console.error('Error adding website:', error);
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Add Website',
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm 
            title="Add Website" 
            onSubmit={handleSubmit}
            icon="➕"
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Website"
        placeholder="Enter website to block (e.g., youtube.com, facebook.com)"
        info="Enter the domain name you want to block. Protocols (http/https) and paths will be automatically removed."
        storeValue={false}
      />
      
      <Form.TextArea
        id="notes"
        title="Notes (Optional)"
        placeholder="Why are you blocking this site? (e.g., distraction during work hours)"
        info="Add optional notes to remind you why you're blocking this website."
        storeValue={false}
      />
      
      <Form.Separator />
      
      <Form.Description 
        title="Info" 
        text="• This adds the website to your personal block list
• Use 'Enable Site Blocking' to activate blocking
• Blocked sites will redirect to localhost (127.0.0.1)
• You can view and manage your list anytime"
      />
    </Form>
  );
}