import { getBaseUrl, request } from "./request";

export type Environment = {
  env_key: string;
  namespace: string;
  production: boolean;
  status: string;
  update_by: string;
  update_time: number;
  cluster_id: string;
  registry_id: string;
};

type EnvironmentDetailResponse = {
  services: { service_name: string; containers: { image: string }[] | null }[] | null;
};

export type EnvironmentService = {
  serviceName: string;
  images: string[];
};

type SubEnvironmentInput = {
  name: string;
  namespace: string;
  baseEnvironment: Environment;
};

const ENVIRONMENT_READY_POLL_MILLISECONDS = 5_000;
const ENVIRONMENT_READY_POLL_ATTEMPTS = 24;

const getEnvironmentsPath = (production: boolean) => (production ? "/environments/production" : "/environments");

const getEnvironmentPath = (environmentKey: string, production: boolean) =>
  `${getEnvironmentsPath(production)}/${encodeURIComponent(environmentKey)}`;

export const getEnvironments = async (projectKey: string, production: boolean) =>
  (await request<Environment[] | null>(getEnvironmentsPath(production), { params: { projectKey } })) ?? [];

export async function getEnvironmentServices(
  projectKey: string,
  environmentKey: string,
  production: boolean,
): Promise<EnvironmentService[]> {
  const { services } = await request<EnvironmentDetailResponse>(getEnvironmentPath(environmentKey, production), {
    params: { projectKey },
  });

  return (services ?? []).map(({ service_name, containers }) => ({
    serviceName: service_name,
    images: (containers ?? []).map(({ image }) => image),
  }));
}

export const createHelmSubEnvironment = (
  projectKey: string,
  { name, namespace, baseEnvironment }: SubEnvironmentInput,
) =>
  request<void>("/environments/helm", {
    method: "POST",
    params: { projectKey },
    body: {
      project_key: projectKey,
      env_name: name,
      namespace,
      cluster_id: baseEnvironment.cluster_id,
      registry_id: baseEnvironment.registry_id,
      production: false,
      sub_env: { enable: true, base_env: baseEnvironment.env_key },
    },
  });

// NOTE: Zadig accepts the create before the environment exists, so services can only be added once it is ready.
export async function waitForEnvironmentToBeReady(projectKey: string, environmentKey: string) {
  for (let attempt = 1; attempt <= ENVIRONMENT_READY_POLL_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, ENVIRONMENT_READY_POLL_MILLISECONDS));
    const environment = (await getEnvironments(projectKey, false)).find(({ env_key }) => env_key === environmentKey);

    if (environment?.status === "success") {
      return environment;
    }

    if (environment?.status === "failed") {
      throw new Error(`${environmentKey} failed to start`);
    }
  }

  throw new Error(`${environmentKey} is not ready yet`);
}

export const addHelmServices = (projectKey: string, environment: Environment, serviceNames: string[]) =>
  request<void>(`/environments/helm/${encodeURIComponent(environment.env_key)}/services`, {
    method: "POST",
    params: { projectKey },
    body: {
      env_name: environment.env_key,
      production: environment.production,
      services: serviceNames.map(service_name => ({ service_name, deploy_strategy: "deploy" })),
    },
  });

export const restartService = (projectKey: string, environment: Environment, serviceName: string) =>
  request<void>(
    `${getEnvironmentPath(environment.env_key, environment.production)}/service/${encodeURIComponent(serviceName)}/restart`,
    { method: "POST", params: { projectKey } },
  );

export const deleteEnvironment = (projectKey: string, environment: Environment) =>
  request<void>(getEnvironmentPath(environment.env_key, environment.production), {
    method: "DELETE",
    params: { projectKey, isDelete: true },
  });

export const getEnvironmentUrl = (projectKey: string, environmentKey: string) =>
  `${getBaseUrl()}/v1/projects/detail/${encodeURIComponent(projectKey)}/envs/detail?${new URLSearchParams({ envName: environmentKey })}`;
