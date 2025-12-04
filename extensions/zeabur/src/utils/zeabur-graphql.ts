import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import {
  Template,
  TemplateInfo,
  Project,
  ProjectInfo,
  ProjectServices,
  ServiceInfo,
  ServiceStatus,
  DomainData,
  Groups,
  Deployments,
  DeleteProject,
  DeleteService,
  SuspendService,
  RestartService,
  RedeployService,
  ProjectUsage,
} from "../type";
import {
  getTemplateQuery,
  getProjectQuery,
  getProjectServicesQuery,
  getServiceStatusQuery,
  getDomainsDataQuery,
  getGroupsQuery,
  getLast5DeploymentsQuery,
  getLatestRunningDeploymentQuery,
  getProjectUsageQuery,
  deleteProjectQuery,
  deleteServiceQuery,
  suspendServiceQuery,
  restartServiceQuery,
  redeployServiceQuery,
} from "../constants/queries";

const preferences = getPreferenceValues();
const zeaburToken = preferences.zeaburToken;

const api = "https://api.zeabur.com/graphql";

export async function getTemplates() {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(getTemplateQuery),
  });

  const json = (await res.json()) as Template;
  const templates: TemplateInfo[] = json.data.templates.edges.map((edge) => {
    const node = edge.node;
    return {
      code: node.code,
      name: node.name,
      description: node.description,
      iconURL: node.iconURL,
    };
  });
  return templates;
}

export async function getProjects() {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(getProjectQuery),
  });

  const json = (await res.json()) as Project;
  const projects: ProjectInfo[] = json.data.projects.edges.map((edge) => {
    const node = edge.node;
    return {
      name: node.name,
      description: node.description,
      iconURL: node.iconURL,
      _id: node._id,
      region: node.region,
      environments: node.environments,
    };
  });
  return projects;
}

export async function getServices(projectID: string, environmentID: string) {
  const query = getProjectServicesQuery;
  query.variables.projectID = projectID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as ProjectServices;
  const groups = await getGroups(projectID);

  const services: ServiceInfo[] = await Promise.all(
    json.data.project.services.map(async (service) => {
      const status = await getServiceStatus(service._id, environmentID);
      const domains = await getDomainsData(service._id, environmentID);
      const groupName = groups.find((group) => group.serviceIDs.includes(service._id))?.name ?? "";
      const groupIndex = groups.findIndex((group) => group.serviceIDs.includes(service._id));

      return {
        _id: service._id,
        name: service.name,
        spec: service.spec,
        status: status,
        domain: domains[0] ? domains[0].domain : "",
        groupName: groupName,
        groupIndex: groupIndex,
      };
    }),
  );
  return services;
}

export async function getServiceStatus(serviceID: string, environmentID: string) {
  const query = getServiceStatusQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as ServiceStatus;
  return json.data.service.status;
}

export async function getDomainsData(serviceID: string, environmentID: string) {
  const query = getDomainsDataQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as DomainData;
  return json.data.service.domains;
}

export async function getGroups(projectID: string) {
  const query = getGroupsQuery;
  query.variables.projectID = projectID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as Groups;
  return json.data.project.groups;
}

export async function getLast5Deployments(serviceID: string, environmentID: string) {
  const query = getLast5DeploymentsQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as Deployments;
  return json.data.deployments.edges;
}

export async function getLatestRunningDeployment(serviceID: string, environmentID: string) {
  const query = getLatestRunningDeploymentQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as Deployments;
  return json.data.deployments.edges[0];
}

export async function getProjectUsage(projectID: string) {
  const query = getProjectUsageQuery;
  query.variables.projectID = projectID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as ProjectUsage;
  return json.data.projectUsage;
}

export async function deleteProject(projectID: string) {
  const query = deleteProjectQuery;
  query.variables.projectID = projectID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as DeleteProject;
  return json.data.deleteProject;
}

export async function deleteService(serviceID: string) {
  const query = deleteServiceQuery;
  query.variables.serviceID = serviceID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as DeleteService;
  return json.data.deleteService;
}

export async function suspendService(serviceID: string, environmentID: string) {
  const query = suspendServiceQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as SuspendService;
  return json.data.suspendService;
}

export async function restartService(serviceID: string, environmentID: string) {
  const query = restartServiceQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as RestartService;
  return json.data.restartService;
}

export async function redeployService(serviceID: string, environmentID: string) {
  const query = redeployServiceQuery;
  query.variables.serviceID = serviceID;
  query.variables.environmentID = environmentID;
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${zeaburToken}`,
    },
    body: JSON.stringify(query),
  });

  const json = (await res.json()) as RedeployService;
  if (json.errors && json.errors.length > 0) {
    return {
      message: json.errors[0].message,
      status: false,
    };
  }
  return {
    message: "",
    status: true,
  };
}
