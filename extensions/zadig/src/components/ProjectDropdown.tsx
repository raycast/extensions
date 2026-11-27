import { List } from "@raycast/api";
import type { Project } from "../api/projects";

type ProjectDropdownProps = {
  projects: Project[];
  value: string | undefined;
  onChange: (projectKey: string) => void;
};

export default function ProjectDropdown({ projects, value, onChange }: ProjectDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Project" value={value} onChange={onChange}>
      {projects.map(({ project_key, project_name }) => (
        <List.Dropdown.Item key={project_key} title={project_name} value={project_key} />
      ))}
    </List.Dropdown>
  );
}
