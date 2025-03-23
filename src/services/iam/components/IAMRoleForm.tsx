import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { IAMService } from "../IAMService";

interface IAMRoleFormProps {
  projectId: string;
  iamService: IAMService;
  rolesByService: { title: string; roles: { value: string; title: string }[] }[];
  onRoleAdded: () => void;
  onCancel: () => void;
}

export default function IAMRoleForm({ iamService, rolesByService, onRoleAdded, onCancel }: IAMRoleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<{ value: string; title: string }[]>([]);

  // Update available roles when service changes
  function handleServiceChange(value: string) {
    const service = rolesByService.find((s) => s.title === value);
    setAvailableRoles(service?.roles || []);
  }

  async function handleSubmit(values: {
    member: string;
    role: string;
    condition?: string;
    conditionTitle?: string;
    conditionDescription?: string;
  }) {
    if (!values.member || !values.role) {
      showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    setIsSubmitting(true);

    // Show loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding role...",
      message: `Adding ${values.role} to ${values.member}`,
    });

    try {
      // Parse member type and ID
      let memberType = "user";
      let memberId = values.member;

      if (values.member.includes(":")) {
        const parts = values.member.split(":", 2);
        memberType = parts[0];
        memberId = parts[1];
      } else if (values.member.includes("@")) {
        memberType = "user";
        memberId = values.member;
      } else {
        memberType = "serviceAccount";
        memberId = values.member;
      }

      // Add the member to the role
      await iamService.addMember(values.role, memberType, memberId);

      // Hide loading toast
      loadingToast.hide();

      showToast({
        style: Toast.Style.Success,
        title: "Role added successfully",
        message: `Added ${memberType}:${memberId} to ${values.role}`,
      });

      onRoleAdded();
    } catch (error) {
      console.error("Error adding role:", error);

      // Hide loading toast
      loadingToast.hide();

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add role",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Role" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="member"
        title="Member"
        placeholder="user:user@example.com or serviceAccount:name@project.iam.gserviceaccount.com"
        info="The principal to grant the role to"
      />

      <Form.Dropdown id="service" title="Service" placeholder="Select a service" onChange={handleServiceChange}>
        {rolesByService.map((service) => (
          <Form.Dropdown.Item key={service.title} value={service.title} title={service.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="role" title="Role" placeholder="Select a role" info="The role to grant to the member">
        {availableRoles.map((role) => (
          <Form.Dropdown.Item key={role.value} value={role.value} title={role.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        id="condition"
        title="Condition (Optional)"
        placeholder="resource.name.startsWith('projects/_/buckets/example-bucket')"
        info="CEL expression for conditional role binding"
      />

      <Form.TextField
        id="conditionTitle"
        title="Condition Title"
        placeholder="Access to specific bucket"
        info="A title for the condition"
      />

      <Form.TextField
        id="conditionDescription"
        title="Condition Description"
        placeholder="Grants access only to the specified bucket"
        info="A description of the condition"
      />
    </Form>
  );
}
