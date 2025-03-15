import { ActionPanel, Action, List, showToast, Toast, useNavigation, Icon, Detail, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { IAMService } from "./IAMService";
import { IAMMembersByPrincipalView } from "./";

interface IAMDashboardViewProps {
  projectId: string;
  gcloudPath: string;
}

export default function IAMDashboardView({ projectId, gcloudPath }: IAMDashboardViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Create IAM service instance
  const iamService = useMemo(() => new IAMService(gcloudPath, projectId), [gcloudPath, projectId]);

  useEffect(() => {
    checkIAMAccess();
  }, []);

  async function checkIAMAccess() {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to get IAM principals to check access
      await iamService.getIAMPrincipals();
      setDebugInfo(`Successfully verified IAM access for project: ${projectId}`);
    } catch (error: any) {
      console.error("Error checking IAM access:", error);
      setError(`Failed to access IAM: ${error.message}`);
      setDebugInfo(`Error checking IAM access: ${error.message}`);
      
      showToast({
        style: Toast.Style.Failure,
        title: "IAM Access Error",
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function showDebugInfo() {
    push(<Detail markdown={`# Debug Information\n\n${debugInfo}`} />);
  }

  function viewIAMMembers() {
    push(<IAMMembersByPrincipalView projectId={projectId} gcloudPath={gcloudPath} />);
  }

  if (error) {
    return (
      <Detail
        markdown={`# IAM Access Error\n\n${error}\n\nPlease check your permissions for this project.`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={checkIAMAccess} />
            <Action title="Show Debug Info" icon={Icon.Bug} onAction={showDebugInfo} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search IAM features..."
      navigationTitle={`IAM Dashboard - Project: ${projectId}`}
      isShowingDetail
    >
      <List.Section title="IAM Management">
        <List.Item
          title="Members & Permissions"
          subtitle="View and manage IAM members and their roles"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          detail={
            <List.Item.Detail
              markdown={`# Members & Permissions\n\nView and manage IAM members and their roles at the project level.\n\n- See all members with access to your project\n- Group members by principal type (user, service account, etc.)\n- Add or remove roles\n- Filter by service or role type`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Feature" text="IAM Members" />
                  <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text="View and manage who has what permissions in your project" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="View Members"
                icon={Icon.Eye}
                onAction={viewIAMMembers}
              />
            </ActionPanel>
          }
        />
        
        <List.Item
          title="Service Accounts"
          subtitle="Manage service accounts for your project"
          icon={{ source: Icon.Terminal, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`# Service Accounts\n\nManage service accounts for your project.\n\n- Create and delete service accounts\n- Manage service account keys\n- Assign roles to service accounts\n- View service account details`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Feature" text="Service Accounts" />
                  <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text="Manage service accounts and their access" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Coming Soon"
                icon={Icon.Clock}
              />
            </ActionPanel>
          }
        />
        
        <List.Item
          title="Custom Roles"
          subtitle="Create and manage custom IAM roles"
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          detail={
            <List.Item.Detail
              markdown={`# Custom Roles\n\nCreate and manage custom IAM roles for your project.\n\n- Create custom roles with specific permissions\n- Update existing custom roles\n- View and manage role permissions\n- Delete custom roles`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Feature" text="Custom Roles" />
                  <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text="Create and manage custom IAM roles" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Coming Soon"
                icon={Icon.Clock}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      
      <List.Section title="IAM Tools">
        <List.Item
          title="Policy Simulator"
          subtitle="Simulate the effect of policy changes"
          icon={{ source: Icon.LightBulb, tintColor: Color.Purple }}
          detail={
            <List.Item.Detail
              markdown={`# Policy Simulator\n\nSimulate the effect of IAM policy changes before applying them.\n\n- Test the effect of adding or removing roles\n- Verify access for specific users or service accounts\n- Understand the impact of policy changes\n- Identify potential security issues`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Feature" text="Policy Simulator" />
                  <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text="Simulate IAM policy changes" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Coming Soon"
                icon={Icon.Clock}
              />
            </ActionPanel>
          }
        />
        
        <List.Item
          title="IAM Recommender"
          subtitle="Get recommendations for IAM policies"
          icon={{ source: Icon.Star, tintColor: Color.Green }}
          detail={
            <List.Item.Detail
              markdown={`# IAM Recommender\n\nGet recommendations for IAM policies based on usage patterns.\n\n- Identify over-privileged accounts\n- Get suggestions for role adjustments\n- Improve security posture\n- Implement least privilege access`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Feature" text="IAM Recommender" />
                  <List.Item.Detail.Metadata.Label title="Project" text={projectId} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text="Get recommendations for IAM policies" />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Coming Soon"
                icon={Icon.Clock}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
} 