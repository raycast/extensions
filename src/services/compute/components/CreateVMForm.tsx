import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  useNavigation,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { executeGcloudCommand } from "../../../gcloud";
import { ComputeService } from "../ComputeService";

interface CreateVMFormProps {
  projectId: string;
  gcloudPath: string;
  onVMCreated: () => void;
}

interface MachineType {
  name: string;
  description: string;
}

interface DiskImage {
  name: string;
  project: string;
  family?: string;
  description?: string;
}

export default function CreateVMForm({ projectId, gcloudPath, onVMCreated }: CreateVMFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zones, setZones] = useState<string[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [diskImages, setDiskImages] = useState<DiskImage[]>([]);
  const [networks, setNetworks] = useState<string[]>([]);
  const [subnetworks, setSubnetworks] = useState<Record<string, string[]>>({});
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [serviceAccounts, setServiceAccounts] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  
  const { pop } = useNavigation();
  
  // Initialize data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Loading resources...",
      });
      
      try {
        const service = new ComputeService(gcloudPath, projectId);
        
        // Fetch zones
        const zonesList = await service.listZones();
        setZones(zonesList);
        
        // Fetch machine types for the first zone
        const machineTypesList = await fetchMachineTypes(zonesList[0]);
        setMachineTypes(machineTypesList);
        
        // Fetch disk images - common ones
        const imagesList = await fetchDiskImages();
        setDiskImages(imagesList);
        
        // Fetch networks
        const networksList = await fetchNetworks();
        setNetworks(networksList);
        
        // Fetch service accounts
        const serviceAccountsList = await fetchServiceAccounts();
        setServiceAccounts(serviceAccountsList);
        
        setIsLoading(false);
        toast.hide();
      } catch (error: any) {
        console.error("Error loading resources:", error);
        toast.hide();
        
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load resources",
          message: error.message,
        });
        
        // Load with default values instead of failing
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [gcloudPath, projectId]);
  
  const fetchMachineTypes = async (zone: string): Promise<MachineType[]> => {
    try {
      const result = await executeGcloudCommand(
        gcloudPath,
        `compute machine-types list --zones=${zone}`,
        projectId
      );
      
      return result.map((mt: any) => ({
        name: mt.name,
        description: `${mt.guestCpus} vCPUs, ${mt.memoryMb} MB RAM`,
      }));
    } catch (error) {
      console.error("Error fetching machine types:", error);
      return [];
    }
  };
  
  const fetchDiskImages = async (): Promise<DiskImage[]> => {
    try {
      // Only fetch common images to avoid long loading times
      const result = await executeGcloudCommand(
        gcloudPath,
        `compute images list --standard-images --filter="(family~'^debian|^ubuntu|^cos|^rhel|^windows')"`,
        projectId
      );
      
      return result.map((img: any) => ({
        name: img.name,
        project: img.selfLink.split('/')[6],
        family: img.family,
        description: img.description || img.family,
      }));
    } catch (error) {
      console.error("Error fetching disk images:", error);
      return [];
    }
  };
  
  const fetchNetworks = async (): Promise<string[]> => {
    try {
      const result = await executeGcloudCommand(
        gcloudPath,
        "compute networks list",
        projectId
      );
      
      // Fetch subnets for each network
      const subnetworksMap: Record<string, string[]> = {};
      
      for (const network of result) {
        const networkName = network.name;
        subnetworksMap[networkName] = await fetchSubnetworks(networkName);
      }
      
      setSubnetworks(subnetworksMap);
      
      return result.map((net: any) => net.name);
    } catch (error) {
      console.error("Error fetching networks:", error);
      return ["default"];
    }
  };
  
  const fetchSubnetworks = async (network: string): Promise<string[]> => {
    try {
      const result = await executeGcloudCommand(
        gcloudPath,
        `compute networks subnets list --filter="network:${network}"`,
        projectId
      );
      
      return result.map((subnet: any) => subnet.name);
    } catch (error) {
      console.error(`Error fetching subnets for network ${network}:`, error);
      return [];
    }
  };
  
  const fetchServiceAccounts = async (): Promise<string[]> => {
    try {
      const result = await executeGcloudCommand(
        gcloudPath,
        "iam service-accounts list",
        projectId
      );
      
      return result.map((sa: any) => sa.email);
    } catch (error) {
      console.error("Error fetching service accounts:", error);
      return [];
    }
  };
  
  const handleZoneChange = async (newZone: string) => {
    // Update machine types for the selected zone
    const machineTypesList = await fetchMachineTypes(newZone);
    setMachineTypes(machineTypesList);
  };
  
  const handleNetworkChange = async (newNetwork: string) => {
    setSelectedNetwork(newNetwork);
  };
  
  const validateName = (name: string) => {
    if (!name) {
      setNameError("Name is required");
      return false;
    }
    
    if (!/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
      setNameError("Name must start with a letter, can contain lowercase letters, numbers, and hyphens, and must end with a letter or number");
      return false;
    }
    
    setNameError(undefined);
    return true;
  };
  
  const handleSubmit = async (values: Record<string, string>) => {
    if (!validateName(values.name)) {
      return;
    }
    
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating VM instance...",
      message: values.name,
    });
    
    try {
      // Build the command
      let command = `compute instances create ${values.name} --zone=${values.zone} --machine-type=${values.machineType}`;
      
      // Add boot disk options
      command += ` --image-project=${values.imageProject} --image-family=${values.imageFamily}`;
      
      // Add network options
      command += ` --network=${values.network}`;
      if (values.subnet) {
        command += ` --subnet=${values.subnet}`;
      }
      
      // Add public IP option
      if (values.externalIP === "none") {
        command += " --no-address";
      }
      
      // Add boot disk type
      if (values.bootDiskType) {
        command += ` --boot-disk-type=${values.bootDiskType}`;
      }
      
      // Add boot disk size
      if (values.bootDiskSize) {
        command += ` --boot-disk-size=${values.bootDiskSize}GB`;
      }
      
      // Add service account
      if (values.serviceAccount) {
        command += ` --service-account=${values.serviceAccount}`;
      }
      
      // Add metadata
      if (values.metadata) {
        command += ` --metadata=${values.metadata}`;
      }
      
      // Add advanced options
      if (advancedMode) {
        // Add tags
        if (values.tags) {
          command += ` --tags=${values.tags}`;
        }
        
        // Add custom machine type
        if (values.customCores && values.customMemory && values.machineType === "custom") {
          command += ` --custom-cpu=${values.customCores} --custom-memory=${values.customMemory}`;
        }
        
        // Add preemptible option
        if (values.preemptible === "true") {
          command += " --preemptible";
        }
        
        // Add spot option
        if (values.spot === "true") {
          command += " --spot";
        }
        
        // Add maintenance policy
        if (values.onHostMaintenance) {
          command += ` --maintenance-policy=${values.onHostMaintenance}`;
        }
        
        // Add disk auto-delete option
        if (values.bootDiskAutoDelete === "false") {
          command += " --no-boot-disk-auto-delete";
        }
        
        // Add min CPU platform
        if (values.minCpuPlatform) {
          command += ` --min-cpu-platform=${values.minCpuPlatform}`;
        }
        
        // Add scopes
        if (values.scopes) {
          command += ` --scopes=${values.scopes}`;
        }
        
        // Add startup script
        if (values.startupScript) {
          command += ` --metadata-from-file startup-script=${values.startupScript}`;
        }
        
        // Add reservation
        if (values.reservation) {
          command += ` --reservation=${values.reservation}`;
        }
      }
      
      // Execute the command
      await executeGcloudCommand(gcloudPath, command, projectId, { skipCache: true });
      
      toast.hide();
      showToast({
        style: Toast.Style.Success,
        title: "VM instance created",
        message: values.name,
      });
      
      // Trigger refresh
      onVMCreated();
      
      // Navigate back
      pop();
    } catch (error: any) {
      toast.hide();
      
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create VM instance",
        message: error.message,
      });
    }
  };
  
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create VM Instance"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create VM Instance" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action
            title={advancedMode ? "Simple Mode" : "Advanced Mode"}
            icon={advancedMode ? Icon.List : Icon.Cog}
            onAction={() => setAdvancedMode(!advancedMode)}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new Compute Engine virtual machine instance" />
      
      {/* Basic settings */}
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Enter instance name"
        info="Must start with a letter, contain only lowercase letters, numbers, and hyphens"
        error={nameError}
        onChange={(value) => validateName(value)}
      />
      
      <Form.Dropdown
        id="zone"
        title="Zone"
        placeholder="Select a zone"
        onChange={handleZoneChange}
      >
        {zones.map((zone) => (
          <Form.Dropdown.Item key={zone} value={zone} title={zone} />
        ))}
      </Form.Dropdown>
      
      <Form.Dropdown
        id="machineType"
        title="Machine Type"
        placeholder="Select a machine type"
      >
        {machineTypes.map((machineType) => (
          <Form.Dropdown.Item
            key={machineType.name}
            value={machineType.name}
            title={`${machineType.name} (${machineType.description})`}
          />
        ))}
        {advancedMode && <Form.Dropdown.Item key="custom" value="custom" title="Custom" />}
      </Form.Dropdown>
      
      {advancedMode && (
        <>
          <Form.TextField
            id="customCores"
            title="Custom CPU Cores"
            placeholder="Number of CPU cores (1-96)"
            info="Required for custom machine type"
          />
          
          <Form.TextField
            id="customMemory"
            title="Custom Memory (MiB)"
            placeholder="Memory in MiB (must be multiple of 256)"
            info="Required for custom machine type"
          />
        </>
      )}
      
      {/* Boot Disk Configuration */}
      <Form.Separator />
      <Form.Description title="Boot Disk" text="Configure the boot disk for this instance" />
      
      <Form.Dropdown
        id="imageProject"
        title="Image Project"
        placeholder="Select an image project"
        defaultValue="debian-cloud"
      >
        <Form.Dropdown.Item key="debian-cloud" value="debian-cloud" title="Debian Cloud" />
        <Form.Dropdown.Item key="ubuntu-os-cloud" value="ubuntu-os-cloud" title="Ubuntu Cloud" />
        <Form.Dropdown.Item key="cos-cloud" value="cos-cloud" title="Container-Optimized OS" />
        <Form.Dropdown.Item key="centos-cloud" value="centos-cloud" title="CentOS Cloud" />
        <Form.Dropdown.Item key="rhel-cloud" value="rhel-cloud" title="Red Hat Enterprise Linux" />
        <Form.Dropdown.Item key="rocky-linux-cloud" value="rocky-linux-cloud" title="Rocky Linux" />
        <Form.Dropdown.Item key="windows-cloud" value="windows-cloud" title="Windows Cloud" />
      </Form.Dropdown>
      
      <Form.Dropdown
        id="imageFamily"
        title="Image Family"
        placeholder="Select an image family"
        defaultValue="debian-11"
      >
        {/* Debian */}
        <Form.Dropdown.Section title="Debian">
          <Form.Dropdown.Item key="debian-11" value="debian-11" title="Debian 11 (Bullseye)" />
          <Form.Dropdown.Item key="debian-10" value="debian-10" title="Debian 10 (Buster)" />
          <Form.Dropdown.Item key="debian-9" value="debian-9" title="Debian 9 (Stretch)" />
        </Form.Dropdown.Section>
        
        {/* Ubuntu */}
        <Form.Dropdown.Section title="Ubuntu">
          <Form.Dropdown.Item key="ubuntu-2204-lts" value="ubuntu-2204-lts" title="Ubuntu 22.04 LTS" />
          <Form.Dropdown.Item key="ubuntu-2004-lts" value="ubuntu-2004-lts" title="Ubuntu 20.04 LTS" />
          <Form.Dropdown.Item key="ubuntu-1804-lts" value="ubuntu-1804-lts" title="Ubuntu 18.04 LTS" />
        </Form.Dropdown.Section>
        
        {/* CentOS */}
        <Form.Dropdown.Section title="CentOS">
          <Form.Dropdown.Item key="centos-7" value="centos-7" title="CentOS 7" />
          <Form.Dropdown.Item key="centos-stream-8" value="centos-stream-8" title="CentOS Stream 8" />
        </Form.Dropdown.Section>
        
        {/* RHEL */}
        <Form.Dropdown.Section title="RHEL">
          <Form.Dropdown.Item key="rhel-9" value="rhel-9" title="RHEL 9" />
          <Form.Dropdown.Item key="rhel-8" value="rhel-8" title="RHEL 8" />
          <Form.Dropdown.Item key="rhel-7" value="rhel-7" title="RHEL 7" />
        </Form.Dropdown.Section>
        
        {/* Windows */}
        <Form.Dropdown.Section title="Windows">
          <Form.Dropdown.Item key="windows-2022" value="windows-2022" title="Windows Server 2022" />
          <Form.Dropdown.Item key="windows-2019" value="windows-2019" title="Windows Server 2019" />
          <Form.Dropdown.Item key="windows-2016" value="windows-2016" title="Windows Server 2016" />
        </Form.Dropdown.Section>
        
        {/* Container-Optimized OS */}
        <Form.Dropdown.Section title="Container-Optimized OS">
          <Form.Dropdown.Item key="cos-stable" value="cos-stable" title="COS Stable" />
          <Form.Dropdown.Item key="cos-beta" value="cos-beta" title="COS Beta" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      
      <Form.Dropdown
        id="bootDiskType"
        title="Boot Disk Type"
        defaultValue="pd-balanced"
      >
        <Form.Dropdown.Item key="pd-standard" value="pd-standard" title="Standard persistent disk" />
        <Form.Dropdown.Item key="pd-balanced" value="pd-balanced" title="Balanced persistent disk" />
        <Form.Dropdown.Item key="pd-ssd" value="pd-ssd" title="SSD persistent disk" />
        {advancedMode && <Form.Dropdown.Item key="pd-extreme" value="pd-extreme" title="Extreme persistent disk" />}
        {advancedMode && <Form.Dropdown.Item key="hyperdisk-balanced" value="hyperdisk-balanced" title="Hyperdisk Balanced" />}
        {advancedMode && <Form.Dropdown.Item key="hyperdisk-extreme" value="hyperdisk-extreme" title="Hyperdisk Extreme" />}
      </Form.Dropdown>
      
      <Form.TextField
        id="bootDiskSize"
        title="Boot Disk Size (GB)"
        placeholder="Size in GB"
        defaultValue="10"
      />
      
      {advancedMode && (
        <Form.Dropdown
          id="bootDiskAutoDelete"
          title="Auto Delete Boot Disk"
          defaultValue="true"
        >
          <Form.Dropdown.Item key="true" value="true" title="Yes" />
          <Form.Dropdown.Item key="false" value="false" title="No" />
        </Form.Dropdown>
      )}
      
      {/* Network settings */}
      <Form.Separator />
      <Form.Description title="Network" text="Configure network settings for this instance" />
      
      <Form.Dropdown
        id="network"
        title="Network"
        defaultValue="default"
        onChange={handleNetworkChange}
      >
        {networks.map((network) => (
          <Form.Dropdown.Item key={network} value={network} title={network} />
        ))}
      </Form.Dropdown>
      
      <Form.Dropdown
        id="subnet"
        title="Subnetwork"
        placeholder="Select a subnetwork"
      >
        {selectedNetwork && subnetworks[selectedNetwork]?.map((subnet) => (
          <Form.Dropdown.Item key={subnet} value={subnet} title={subnet} />
        ))}
      </Form.Dropdown>
      
      <Form.Dropdown
        id="externalIP"
        title="External IP"
        defaultValue="auto"
      >
        <Form.Dropdown.Item key="auto" value="auto" title="Automatic (ephemeral)" />
        <Form.Dropdown.Item key="none" value="none" title="None (private instance)" />
      </Form.Dropdown>
      
      {/* Service Account */}
      <Form.Separator />
      <Form.Description title="Identity" text="Configure identity and access control" />
      
      <Form.Dropdown
        id="serviceAccount"
        title="Service Account"
        placeholder="Select a service account"
      >
        <Form.Dropdown.Item key="default" value="default" title="Default compute service account" />
        {serviceAccounts.map((sa) => (
          <Form.Dropdown.Item key={sa} value={sa} title={sa} />
        ))}
      </Form.Dropdown>
      
      {advancedMode && (
        <>
          <Form.TextField
            id="scopes"
            title="Access Scopes"
            placeholder="Comma-separated list of scopes"
            info="Example: https://www.googleapis.com/auth/compute,https://www.googleapis.com/auth/devstorage.read_only"
            defaultValue="https://www.googleapis.com/auth/cloud-platform"
          />
        </>
      )}
      
      {/* Additional settings in advanced mode */}
      {advancedMode && (
        <>
          <Form.Separator />
          <Form.Description title="Additional Settings" text="Configure advanced VM options" />
          
          <Form.TextField
            id="tags"
            title="Network Tags"
            placeholder="Comma-separated list of tags"
            info="Example: http-server,https-server"
          />
          
          <Form.TextField
            id="metadata"
            title="Metadata"
            placeholder="Key=value,key=value format"
            info="Example: enable-oslogin=true,serial-port-enable=true"
          />
          
          <Form.Dropdown
            id="preemptible"
            title="Preemptible VM"
            defaultValue="false"
          >
            <Form.Dropdown.Item key="false" value="false" title="No" />
            <Form.Dropdown.Item key="true" value="true" title="Yes" />
          </Form.Dropdown>
          
          <Form.Dropdown
            id="spot"
            title="Spot VM"
            defaultValue="false"
          >
            <Form.Dropdown.Item key="false" value="false" title="No" />
            <Form.Dropdown.Item key="true" value="true" title="Yes" />
          </Form.Dropdown>
          
          <Form.Dropdown
            id="onHostMaintenance"
            title="On Host Maintenance"
            defaultValue="MIGRATE"
          >
            <Form.Dropdown.Item key="MIGRATE" value="MIGRATE" title="Migrate VM instance" />
            <Form.Dropdown.Item key="TERMINATE" value="TERMINATE" title="Terminate VM instance" />
          </Form.Dropdown>
          
          <Form.TextField
            id="minCpuPlatform"
            title="Minimum CPU Platform"
            placeholder="Example: Intel Cascade Lake"
          />
          
          <Form.TextField
            id="startupScript"
            title="Startup Script File Path"
            placeholder="Local file path to startup script"
          />
          
          <Form.TextField
            id="reservation"
            title="Reservation"
            placeholder="Reservation name"
            info="Specific reservation to use for this VM"
          />
        </>
      )}
    </Form>
  );
} 