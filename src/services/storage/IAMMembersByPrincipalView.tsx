import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, Form, Detail, Color, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { executeGcloudCommand } from "../../gcloud";
import { getRoleInfo, formatRoleName } from "../../utils/iamRoles";

const execPromise = promisify(exec);

interface IAMMembersByPrincipalViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string; // Optional: specific resource (bucket, etc.) to view
  resourceType?: string; // Optional: type of resource (storage, compute, etc.)
}

interface IAMPrincipal {
  type: string; // user, group, serviceAccount, etc.
  id: string;
  email: string;
  displayName: string;
  roles: {
    role: string;
    title: string;
    description: string;
    condition?: {
      title: string;
      description?: string;
      expression: string;
    };
  }[];
}

export default function IAMMembersByPrincipalView({ projectId, gcloudPath, resourceName, resourceType }: IAMMembersByPrincipalViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [principals, setPrincipals] = useState<IAMPrincipal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { push, pop } = useNavigation();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchIAMPolicy();
  }, []);

  async function fetchIAMPolicy() {
    setIsLoading(true);
    setError(null);
    
    let command = "";
    let debugText = "";
    
    if (resourceType === "storage" && resourceName) {
      // For a specific storage bucket
      command = `storage buckets get-iam-policy gs://${resourceName} --project=${projectId}`;
      debugText = `Fetching IAM policy for bucket: ${resourceName}\n`;
    } else {
      // For project-level IAM
      command = `projects get-iam-policy ${projectId}`;
      debugText = `Fetching project-level IAM policy for: ${projectId}\n`;
    }
    
    showToast({
      style: Toast.Style.Animated,
      title: "Loading IAM policy...",
      message: resourceName || projectId,
    });
    
    try {
      const result = await executeGcloudCommand(gcloudPath, command);
      
      if (!Array.isArray(result) || result.length === 0) {
        setError("No IAM policy found or empty result");
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "No IAM policy found",
        });
        return;
      }
      
      const policy = Array.isArray(result) ? result[0] : result;
      
      if (!policy.bindings || !Array.isArray(policy.bindings)) {
        setError("Invalid IAM policy format: no bindings found");
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid IAM policy format",
          message: "No bindings found",
        });
        return;
      }
      
      // Process the bindings into a member-centric structure
      const principalsMap = new Map<string, IAMPrincipal>();
      
      for (const binding of policy.bindings) {
        const roleInfo = getRoleInfo(binding.role);
        
        for (const member of binding.members) {
          const [type, id] = member.includes(':') ? member.split(':', 2) : [member, ''];
          const principalKey = `${type}:${id}`;
          
          if (!principalsMap.has(principalKey)) {
            principalsMap.set(principalKey, {
              type,
              id,
              email: id,
              displayName: formatMemberType(type),
              roles: []
            });
          }
          
          const principal = principalsMap.get(principalKey)!;
          principal.roles.push({
            role: binding.role,
            title: roleInfo.title || formatRoleName(binding.role),
            description: roleInfo.description,
            condition: binding.condition
          });
        }
      }
      
      // Convert map to array and sort by type and email
      const principalsArray = Array.from(principalsMap.values());
      principalsArray.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return a.id.localeCompare(b.id);
      });
      
      setPrincipals(principalsArray);
      setDebugInfo(debugText + `Found ${principalsArray.length} principals with IAM roles\n`);
      
      showToast({
        style: Toast.Style.Success,
        title: "IAM policy loaded",
        message: `Found ${principalsArray.length} principals`,
      });
    } catch (error: any) {
      console.error("Error fetching IAM policy:", error);
      setError(`Failed to fetch IAM policy: ${error.message}`);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch IAM policy",
        message: error.message,
      });
    } finally {
      setDebugInfo(debugText);
      setIsLoading(false);
    }
  }
  
  function formatMemberType(type: string): string {
    switch (type) {
      case 'user':
        return 'User';
      case 'group':
        return 'Group';
      case 'serviceAccount':
        return 'Service Account';
      case 'domain':
        return 'Domain';
      case 'allUsers':
        return 'All Users (Public)';
      case 'allAuthenticatedUsers':
        return 'All Authenticated Users';
      case 'projectEditor':
        return 'Project Editor';
      case 'projectOwner':
        return 'Project Owner';
      case 'projectViewer':
        return 'Project Viewer';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
  
  function getMemberIcon(type: string) {
    switch (type) {
      case 'user':
        return { source: Icon.Person, tintColor: Color.Blue };
      case 'group':
        return { source: Icon.PersonCircle, tintColor: Color.Green };
      case 'serviceAccount':
        return { source: Icon.Terminal, tintColor: Color.Orange };
      case 'domain':
        return { source: Icon.Globe, tintColor: Color.Purple };
      case 'allUsers':
        return { source: Icon.Globe, tintColor: Color.Red };
      case 'allAuthenticatedUsers':
        return { source: Icon.Key, tintColor: Color.Yellow };
      case 'projectEditor':
        return { source: Icon.Pencil, tintColor: Color.Blue };
      case 'projectOwner':
        return { source: Icon.Star, tintColor: Color.Orange };
      case 'projectViewer':
        return { source: Icon.Eye, tintColor: Color.Green };
      default:
        return { source: Icon.Person, tintColor: Color.PrimaryText };
    }
  }
  
  function getRoleIcon(role: string) {
    if (role.includes('admin') || role.includes('Admin')) {
      return { source: Icon.Star, tintColor: Color.Red };
    } else if (role.includes('owner') || role.includes('Owner')) {
      return { source: Icon.Key, tintColor: Color.Orange };
    } else if (role.includes('editor') || role.includes('Editor') || role.includes('write')) {
      return { source: Icon.Pencil, tintColor: Color.Blue };
    } else if (role.includes('viewer') || role.includes('Viewer') || role.includes('read')) {
      return { source: Icon.Eye, tintColor: Color.Green };
    } else {
      return { source: Icon.Circle, tintColor: Color.PrimaryText };
    }
  }

  async function addMember(values: { role: string; memberType: string; memberId: string }) {
    const addingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding member...",
      message: `${values.memberType}:${values.memberId} to ${values.role}`,
    });
    
    try {
      // Validate the member ID format based on type
      if (!validateMemberId(values.memberType, values.memberId)) {
        addingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid member ID format",
          message: `The format for ${values.memberType} is incorrect. Please check and try again.`,
        });
        return;
      }
      
      let command = "";
      
      if (resourceType === "storage" && resourceName) {
        command = `storage buckets add-iam-policy-binding gs://${resourceName} --member=${values.memberType}:${values.memberId} --role=${values.role} --project=${projectId}`;
      } else {
        command = `projects add-iam-policy-binding ${projectId} --member=${values.memberType}:${values.memberId} --role=${values.role}`;
      }
      
      await executeGcloudCommand(gcloudPath, command);
      
      addingToast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "Member added",
        message: `${values.memberType}:${values.memberId} to ${values.role}`,
      });
      
      // Refresh the policy
      fetchIAMPolicy();
    } catch (error: any) {
      addingToast.hide();
      
      // Provide more specific error messages
      let errorMessage = error.message;
      let errorTitle = "Failed to add member";
      
      if (error.message.includes("does not exist")) {
        errorTitle = "User not found";
        errorMessage = `The user ${values.memberId} does not exist. Please check the email address and try again.`;
      } else if (error.message.includes("Permission denied") || error.message.includes("403")) {
        errorTitle = "Permission denied";
        errorMessage = "You don't have permission to modify IAM policies for this resource.";
      }
      
      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
    }
  }

  // Helper function to validate member ID format based on type
  function validateMemberId(type: string, id: string): boolean {
    switch (type) {
      case 'user':
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'serviceAccount':
        // Service account email validation
        return /^[a-zA-Z0-9-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(id) || 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'group':
        // Group email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id);
      case 'domain':
        // Domain validation
        return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(id);
      case 'allUsers':
      case 'allAuthenticatedUsers':
      case 'projectEditor':
      case 'projectOwner':
      case 'projectViewer':
        // These types don't have IDs
        return true;
      default:
        // For unknown types, just check it's not empty
        return id.trim() !== '';
    }
  }

  async function removeMember(principal: IAMPrincipal, role: string) {
    const options: any = {
      title: "Remove Role",
      message: `Are you sure you want to remove role "${formatRoleName(role)}" from ${principal.type}:${principal.id}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Remove",
        style: Action.Style.Destructive,
      },
    };
    
    if (await confirmAlert(options)) {
      const removingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing role...",
        message: `${role} from ${principal.type}:${principal.id}`,
      });
      
      try {
        let command = "";
        
        if (resourceType === "storage" && resourceName) {
          command = `storage buckets remove-iam-policy-binding gs://${resourceName} --member=${principal.type}:${principal.id} --role=${role} --project=${projectId}`;
        } else {
          command = `projects remove-iam-policy-binding ${projectId} --member=${principal.type}:${principal.id} --role=${role}`;
        }
        
        await executeGcloudCommand(gcloudPath, command);
        
        removingToast.hide();
        showToast({
          style: Toast.Style.Success,
          title: "Role removed",
          message: `${role} removed from ${principal.type}:${principal.id}`,
        });
        
        // Refresh the policy
        fetchIAMPolicy();
      } catch (error: any) {
        removingToast.hide();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove role",
          message: error.message,
        });
      }
    }
  }

  function showAddMemberForm() {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Member"
              onSubmit={addMember}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="role" title="Role" defaultValue="">
          <Form.Dropdown.Item value="roles/storage.admin" title="Storage Admin" />
          <Form.Dropdown.Item value="roles/storage.objectAdmin" title="Storage Object Admin" />
          <Form.Dropdown.Item value="roles/storage.objectCreator" title="Storage Object Creator" />
          <Form.Dropdown.Item value="roles/storage.objectViewer" title="Storage Object Viewer" />
          <Form.Dropdown.Item value="roles/storage.legacyBucketOwner" title="Storage Legacy Bucket Owner" />
          <Form.Dropdown.Item value="roles/storage.legacyBucketReader" title="Storage Legacy Bucket Reader" />
          <Form.Dropdown.Item value="roles/storage.legacyBucketWriter" title="Storage Legacy Bucket Writer" />
          <Form.Dropdown.Item value="roles/storage.legacyObjectOwner" title="Storage Legacy Object Owner" />
          <Form.Dropdown.Item value="roles/storage.legacyObjectReader" title="Storage Legacy Object Reader" />
        </Form.Dropdown>
        
        <Form.Dropdown id="memberType" title="Member Type" defaultValue="user">
          <Form.Dropdown.Item value="user" title="User" />
          <Form.Dropdown.Item value="group" title="Group" />
          <Form.Dropdown.Item value="serviceAccount" title="Service Account" />
          <Form.Dropdown.Item value="domain" title="Domain" />
          <Form.Dropdown.Item value="allUsers" title="All Users (Public)" />
          <Form.Dropdown.Item value="allAuthenticatedUsers" title="All Authenticated Users" />
          <Form.Dropdown.Item value="projectEditor" title="Project Editor" />
          <Form.Dropdown.Item value="projectOwner" title="Project Owner" />
          <Form.Dropdown.Item value="projectViewer" title="Project Viewer" />
        </Form.Dropdown>
        
        <Form.TextField
          id="memberId"
          title="Member ID"
          placeholder="user@example.com or domain.com"
        />
      </Form>
    );
  }

  function showDebugInfo() {
    push(<Detail markdown={`# Debug Information\n\n${debugInfo}`} />);
  }

  function showPrincipalDetails(principal: IAMPrincipal) {
    // Generate markdown for the principal's details
    let markdown = `# ${principal.displayName}: ${principal.id}\n\n`;
    
    markdown += `## Roles\n\n`;
    
    principal.roles.forEach((role) => {
      markdown += `### ${role.title}\n\n`;
      markdown += `**Role ID:** \`${role.role}\`\n\n`;
      
      if (role.description) {
        markdown += `**Description:** ${role.description}\n\n`;
      }
      
      if (role.condition) {
        markdown += `**Condition:** ${role.condition.title}\n\n`;
        markdown += `\`\`\`\n${role.condition.expression}\n\`\`\`\n\n`;
        
        if (role.condition.description) {
          markdown += `${role.condition.description}\n\n`;
        }
      }
    });
    
    push(
      <Detail
        navigationTitle={`${principal.displayName}: ${principal.id}`}
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Type" text={principal.displayName} />
            <Detail.Metadata.Label title="ID" text={principal.id} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Roles" text={`${principal.roles.length}`} />
            {principal.roles.map((role, index) => (
              <Detail.Metadata.Label 
                key={`role-${index}`}
                title={role.title} 
                text={role.role}
                icon={getRoleIcon(role.role)}
              />
            ))}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action
              title="Add Role"
              icon={Icon.Plus}
              onAction={showAddMemberForm}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={fetchIAMPolicy}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Filter principals based on search text and selected type
  const filteredPrincipals = principals.filter((principal) => {
    // If there's a selected type and this principal doesn't match, filter it out
    if (selectedType && principal.type !== selectedType) {
      return false;
    }
    
    // If there's search text, check if the principal or any roles match
    if (searchText) {
      const principalMatches = 
        principal.id.toLowerCase().includes(searchText.toLowerCase()) ||
        principal.type.toLowerCase().includes(searchText.toLowerCase());
      
      const roleMatches = principal.roles.some(role => 
        role.role.toLowerCase().includes(searchText.toLowerCase()) ||
        role.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(searchText.toLowerCase()))
      );
      
      return principalMatches || roleMatches;
    }
    
    return true;
  });

  // Get unique principal types for the dropdown
  const principalTypes = Array.from(new Set(principals.map(p => p.type)));

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={fetchIAMPolicy} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search members or roles..."
      onSearchTextChange={setSearchText}
      navigationTitle={resourceName ? `IAM for ${resourceName}` : "IAM Members"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Member Type"
          value={selectedType || ""}
          onChange={setSelectedType}
        >
          <List.Dropdown.Item title="All Types" value="" />
          {principalTypes.map((type) => (
            <List.Dropdown.Item 
              key={type} 
              title={formatMemberType(type)} 
              value={type} 
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Add Member" icon={Icon.Plus} onAction={showAddMemberForm} />
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchIAMPolicy} />
          <Action title="Show Debug Info" icon={Icon.Terminal} onAction={showDebugInfo} />
          {selectedType && (
            <Action 
              title="Clear Type Filter" 
              icon={Icon.XmarkCircle} 
              onAction={() => setSelectedType(null)} 
            />
          )}
        </ActionPanel>
      }
    >
      {filteredPrincipals.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No IAM Members Found"
          description={searchText ? "Try a different search term" : "Add a member to get started"}
          icon={{ source: Icon.Person }}
        />
      ) : (
        principalTypes
          .filter(type => !selectedType || type === selectedType)
          .map(type => {
            const typePrincipals = filteredPrincipals.filter(p => p.type === type);
            if (typePrincipals.length === 0) return null;
            
            return (
              <List.Section 
                key={type} 
                title={formatMemberType(type)} 
                subtitle={`${typePrincipals.length} members`}
              >
                {typePrincipals.map((principal) => (
                  <List.Item
                    key={`${principal.type}-${principal.id}`}
                    title={principal.id || principal.type}
                    subtitle={`${principal.roles.length} roles`}
                    icon={getMemberIcon(principal.type)}
                    accessories={[
                      { text: `${principal.roles.length} roles` }
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={`# ${principal.displayName}: ${principal.id}\n\n## Roles\n\n${principal.roles.map(role => `- **${role.title}** (${role.role})`).join('\n\n')}`}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Type" text={principal.displayName} />
                            <List.Item.Detail.Metadata.Label title="ID" text={principal.id} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Roles" />
                            {principal.roles.map((role, index) => (
                              <List.Item.Detail.Metadata.Label 
                                key={`role-${index}`}
                                title={role.title} 
                                text={role.role}
                                icon={getRoleIcon(role.role)}
                              />
                            ))}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action
                          title="View Details"
                          icon={Icon.Eye}
                          onAction={() => showPrincipalDetails(principal)}
                        />
                        <Action
                          title="Add Role"
                          icon={Icon.Plus}
                          onAction={showAddMemberForm}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          onAction={fetchIAMPolicy}
                        />
                        <ActionPanel.Submenu
                          title="Remove Role"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        >
                          {principal.roles.map((role) => (
                            <Action
                              key={role.role}
                              title={role.title}
                              icon={getRoleIcon(role.role)}
                              style={Action.Style.Destructive}
                              onAction={() => removeMember(principal, role.role)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          }).filter(Boolean)
      )}
    </List>
  );
} 