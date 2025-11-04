export const getTemplateQuery = {
  operationName: "GetTemplates",
  variables: {},
  query:
    "query GetTemplates {\n  templates {\n    edges {\n      node {\n        code\n        name\n        description\n        iconURL\n        deploymentCnt\n        services {\n          name\n          template\n          marketplaceItem {\n            code\n            __typename\n          }\n          planMeta\n          planType\n          prebuiltItem {\n            icon\n            __typename\n          }\n          __typename\n        }\n        previewURL\n        variables {\n          desc\n          key\n          question\n          type\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getProjectQuery = {
  operationName: "GetProjects",
  variables: {},
  query:
    "query GetProjects {\n  projects {\n    edges {\n      node {\n        name\n        description\n        iconURL\n        _id\n        region {\n          providerInfo {\n            code\n            icon\n            name\n            __typename\n          }\n          name\n          id\n          country\n          city\n          continent\n          __typename\n        }\n        environments {\n          _id\n          name\n          __typename\n        }\n        owner {\n          avatarURL\n          name\n          email\n          __typename\n        }\n        collaborators {\n          avatarURL\n          name\n          email\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getProjectServicesQuery = {
  operationName: "GetProjectServicesWithPlan",
  variables: {
    projectID: "",
    environmentID: "",
  },
  query:
    "query GetProjectServicesWithPlan($projectID: ObjectID!, $environmentID: ObjectID!) {\n  project(_id: $projectID) {\n    services {\n      _id\n      name\n      template\n      onceProduct\n      planMeta(environmentID: $environmentID)\n      planType(environmentID: $environmentID)\n      marketplaceItem {\n        name\n        code\n        iconURL\n        networkType\n        __typename\n      }\n      spec {\n        icon\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getServiceStatusQuery = {
  operationName: "GetServiceStatus",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "query GetServiceStatus($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  service(_id: $serviceID) {\n    status(environmentID: $environmentID)\n    __typename\n  }\n}",
};

export const getDomainsDataQuery = {
  operationName: "GetDomainsData",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "query GetDomainsData($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  service(_id: $serviceID) {\n    dnsName\n    template\n    portForwardedHost\n    spec {\n      ports {\n        type\n        __typename\n      }\n      __typename\n    }\n    marketplaceItem {\n      networkType\n      __typename\n    }\n    ports(environmentID: $environmentID) {\n      port\n      id\n      type\n      forwardedPort\n      __typename\n    }\n    domains(environmentID: $environmentID) {\n      _id\n      domain\n      status\n      redirectTo\n      portName\n      isGenerated\n      dnsRecords {\n        recordType\n        recordName\n        recordValue\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getGroupsQuery = {
  operationName: "GetGroups",
  variables: {
    projectID: "",
  },
  query:
    "query GetGroups($projectID: ObjectID!) {\n  project(_id: $projectID) {\n    _id\n    groups {\n      name\n      serviceIDs\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getLast5DeploymentsQuery = {
  operationName: "GetLast5Deployments",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "query GetLast5Deployments($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  deployments(serviceID: $serviceID, environmentID: $environmentID, perPage: 5) {\n    edges {\n      cursor\n      node {\n        _id\n        status\n        commitMessage\n        createdAt\n        finishedAt\n        serviceID\n        environmentID\n        planMeta\n        planType\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getLatestRunningDeploymentQuery = {
  operationName: "GetLatestRunningDeployment",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "query GetLatestRunningDeployment($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  deployments(\n    serviceID: $serviceID\n    environmentID: $environmentID\n    perPage: 1\n    filter: RUNNING\n  ) {\n    edges {\n      cursor\n      node {\n        _id\n        status\n        planMeta\n        createdAt\n        planType\n        commitMessage\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}",
};

export const getProjectUsageQuery = {
  operationName: "GetProjectUsage",
  variables: {
    projectID: "",
  },
  query:
    "query GetProjectUsage($projectID: ObjectID!) {\n  projectUsage(projectID: $projectID, usageGroupByEntity: CATEGORY) {\n    usages {\n      entity\n      usage\n      __typename\n    }\n    periodStart\n    periodEnd\n    budget\n    __typename\n  }\n}",
};

export const deleteProjectQuery = {
  operationName: "DeleteProject",
  variables: {
    projectID: "",
  },
  query: "mutation DeleteProject($projectID: ObjectID!) {\n  deleteProject(_id: $projectID)\n}",
};

export const deleteServiceQuery = {
  operationName: "DeleteService",
  variables: {
    serviceID: "",
  },
  query: "mutation DeleteService($serviceID: ObjectID!) {\n  deleteService(_id: $serviceID)\n}",
};

export const suspendServiceQuery = {
  operationName: "Suspend",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "mutation Suspend($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  suspendService(serviceID: $serviceID, environmentID: $environmentID)\n}",
};

export const restartServiceQuery = {
  operationName: "RestartService",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "mutation RestartService($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  restartService(serviceID: $serviceID, environmentID: $environmentID)\n}",
};

export const redeployServiceQuery = {
  operationName: "RedeployService",
  variables: {
    serviceID: "",
    environmentID: "",
  },
  query:
    "mutation RedeployService($serviceID: ObjectID!, $environmentID: ObjectID!) {\n  redeployService(serviceID: $serviceID, environmentID: $environmentID)\n}",
};
