import { TagEditForm } from "./components/tag/tagEditForm";
import { createTag } from "./lib/zeitraumClient";

export default function CreateTagCommand(): JSX.Element {
  return <TagEditForm onSubmit={createTag} />;
}
