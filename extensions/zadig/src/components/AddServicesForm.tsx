import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { addHelmServices, getEnvironmentServices, type Environment } from "../api/environments";

type AddServicesFormProps = {
  projectKey: string;
  environment: Environment;
  sourceEnvironments: Environment[];
  onAdd: () => void;
};

type AddServicesValues = {
  sourceEnvironmentKey: string;
  serviceNames: string[];
};

const pluralRules = new Intl.PluralRules("en-US");

const formatServiceCount = (count: number) =>
  `${count} ${pluralRules.select(count) === "one" ? "service" : "services"}`;

export default function AddServicesForm({ projectKey, environment, sourceEnvironments, onAdd }: AddServicesFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<AddServicesValues>({
    initialValues: { sourceEnvironmentKey: sourceEnvironments[0]?.env_key, serviceNames: [] },
    validation: {
      sourceEnvironmentKey: FormValidation.Required,
      serviceNames: serviceNames => (serviceNames?.length ? undefined : "Pick at least one service"),
    },
    async onSubmit({ serviceNames }) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Adding services to ${environment.env_key}`,
      });

      try {
        await addHelmServices(projectKey, environment, serviceNames);
        toast.style = Toast.Style.Success;
        toast.title = `Added ${formatServiceCount(serviceNames.length)} to ${environment.env_key}`;
        onAdd();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to add services to ${environment.env_key}`;
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
  });

  const { data: sourceServices, isLoading: isLoadingSource } = useCachedPromise(
    getEnvironmentServices,
    [projectKey, values.sourceEnvironmentKey, false],
    { execute: Boolean(values.sourceEnvironmentKey) },
  );

  const { data: targetServices, isLoading: isLoadingTarget } = useCachedPromise(getEnvironmentServices, [
    projectKey,
    environment.env_key,
    environment.production,
  ]);

  const existingServiceNames = new Set(targetServices?.map(({ serviceName }) => serviceName));
  const addableServices =
    targetServices && sourceServices?.filter(({ serviceName }) => !existingServiceNames.has(serviceName));

  return (
    <Form
      navigationTitle={`Add Services to ${environment.env_key}`}
      isLoading={isLoadingSource || isLoadingTarget}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Services" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        title="Source Environment"
        info="The services this environment runs are offered below. Each one deploys from its definition in the project."
        {...itemProps.sourceEnvironmentKey}
      >
        {sourceEnvironments.map(({ env_key }) => (
          <Form.Dropdown.Item key={env_key} title={env_key} value={env_key} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker title="Services" {...itemProps.serviceNames}>
        {addableServices?.map(({ serviceName }) => (
          <Form.TagPicker.Item key={serviceName} title={serviceName} value={serviceName} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
