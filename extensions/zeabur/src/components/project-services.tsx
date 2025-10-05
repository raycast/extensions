import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Image, Icon, confirmAlert, Alert, showToast, Toast, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  getServices,
  getServiceStatus,
  suspendService,
  restartService,
  deleteService,
  redeployService,
} from "../utils/zeabur-graphql";
import { ServiceInfo } from "../type";
import ProjectDeployments from "./project-deployments";

interface ProjectServicesProps {
  projectID: string;
  environmentID: string;
}

export default function ProjectServices({ projectID, environmentID }: ProjectServicesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await getServices(projectID, environmentID);
        services.sort((a, b) => a.groupIndex - b.groupIndex);
        setServices(services);
        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch services");
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [projectID, environmentID, isReloading]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search services">
      {services.length > 0 ? (
        services.map((service) => (
          <List.Item
            key={service._id}
            title={service.name}
            icon={{
              source: service.spec && service.spec.icon ? service.spec.icon : "extension-icon.png",
              fallback: "extension-icon.png",
              mask: Image.Mask.RoundedRectangle,
            }}
            accessories={[
              {
                tag: service.groupName ? { value: service.groupName } : undefined,
                tooltip: "Group",
              },
              {
                tag: { value: service.status, color: service.status === "RUNNING" ? Color.Green : Color.SecondaryText },
                tooltip: "Status",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Deployments"
                  icon={Icon.List}
                  target={
                    <ProjectDeployments projectID={projectID} serviceID={service._id} environmentID={environmentID} />
                  }
                />
                {service.domain && (
                  <Action.OpenInBrowser title="Open Service Domain" url={`https://${service.domain}`} />
                )}
                <Action.OpenInBrowser
                  title="Open Service Page"
                  url={`https://zeabur.com/projects/${projectID}/services/${service._id}?envID=${environmentID}`}
                />
                <Action
                  title="Suspend Service"
                  icon={Icon.Pause}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "s",
                  }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Suspend Service",
                        message: "Are you sure you want to suspend this service?",
                        icon: Icon.Pause,
                        primaryAction: {
                          title: "Confirm Suspend",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      try {
                        const res = await suspendService(service._id, environmentID);
                        if (res) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Service suspended successfully",
                          });
                          const status = await getServiceStatus(service._id, environmentID);
                          setServices(services.map((s) => (s._id === service._id ? { ...s, status: status } : s)));
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to suspend service",
                          });
                        }
                      } catch {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to suspend service",
                        });
                      }
                    }
                  }}
                />
                <Action
                  title="Redeploy Service"
                  icon={Icon.RotateClockwise}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "r",
                  }}
                  onAction={async () => {
                    try {
                      await showToast({
                        style: Toast.Style.Animated,
                        title: "Redeploying Service",
                      });
                      const res = await redeployService(service._id, environmentID);
                      if (res.status) {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Service redeployed successfully",
                        });
                      } else {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: res.message,
                        });
                      }
                    } catch {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to redeploy service",
                      });
                    }
                  }}
                />
                <Action
                  title="Restart Service"
                  icon={Icon.RotateClockwise}
                  onAction={async () => {
                    try {
                      const res = await restartService(service._id, environmentID);
                      if (res) {
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Service restarted successfully",
                        });
                        let retries = 0;
                        while (retries < 15) {
                          const status = await getServiceStatus(service._id, environmentID);
                          setServices(services.map((s) => (s._id === service._id ? { ...s, status: status } : s)));
                          if (status === "RUNNING") {
                            break;
                          }
                          await new Promise((resolve) => setTimeout(resolve, 2000));
                          retries++;
                        }
                      } else {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to restart service",
                        });
                      }
                    } catch {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to restart service",
                      });
                    }
                  }}
                />
                <Action
                  title="Delete Service"
                  icon={Icon.Trash}
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "d",
                  }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Service",
                        message: "Are you sure you want to delete this service?",
                        icon: Icon.Trash,
                        primaryAction: {
                          title: "Confirm Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      try {
                        const res = await deleteService(service._id);
                        if (res) {
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Service deleted successfully",
                          });
                          setServices(services.filter((s) => s._id !== service._id));
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to delete service",
                          });
                        }
                      } catch {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to delete service",
                        });
                      }
                    }
                  }}
                />
                <Action
                  title="Reload Services Data"
                  icon={Icon.ArrowClockwise}
                  shortcut={{
                    modifiers: ["cmd"],
                    key: "r",
                  }}
                  onAction={async () => {
                    setIsReloading(!isReloading);
                    setIsLoading(true);
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView title="No services found" />
      )}
    </List>
  );
}
