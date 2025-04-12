import { ListMembers, Member, Project } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

const tool = (): Promise<Project[]> => shortcut.listProjects().then((response) => response.data);

export default tool;
