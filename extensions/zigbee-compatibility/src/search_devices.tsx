import { useState, useEffect } from "react";
import { Color, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const baseURL = "https://zigbee.blakadder.com";

interface Device {
  model: string;
  name: string;
  vendor: string;
  category: string;
  image?: string;
  link: string;
  zigbeemodel?: string[];
  compatible?: string[];
}

interface Zigbee {
  devices: Device[];
}

const compatibleIcons: { [key: string]: string } = {
  z2m: "z2m-icon.png",
  zha: "zha-icon.png",
  z4d: "z4d-icon.png",
  deconz: "deconz-icon.png",
  iob: "iobroker-icon.png",
  tasmota: "tasmota-icon.png",
};

const compatibleAliases: { [key: string]: string } = {
  z2m: "Zigbee2MQTT",
  zha: "ZHA",
  z4d: "Zigbee for Domoticz",
  deconz: "deCONZ",
  iob: "ioBroker.zigbee",
  tasmota: "Tasmota",
};

function DeviceListItem(props: { device: Device }): JSX.Element {
  const d = props.device;
  const getAccessories = (d: Device) => {
    if (d.compatible === undefined) {
      return undefined;
    }

    const result: List.Item.Accessory[] | undefined = d.compatible?.map((c) => {
      const icon = compatibleIcons[c];
      if (icon === undefined) {
        return { text: c };
      } else {
        let tintColor: Color | undefined = undefined;
        if (c === "tasmota") {
          tintColor = Color.PrimaryText;
        }
        let tooltip = compatibleAliases[c];
        if (tooltip === undefined) {
          tooltip = c;
        }
        return { icon: { source: icon, tintColor: tintColor }, tooltip: tooltip };
      }
    });
    return result;
  };
  return (
    <List.Item
      title={d.name || "?"}
      icon={{ source: d.image || "", fallback: "zigbee.png" }}
      accessories={getAccessories(d)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={d.link} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchDevicesCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const [systemFilterText, setSystemFilterText] = useState("");
  const { isLoading, devices } = useDevices(searchText, systemFilterText);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by Name, Vendor or Model"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="System Filter" onChange={setSystemFilterText}>
          <List.Dropdown.Section title="Systems">
            <List.Dropdown.Item title="All" value="" />
            {Object.keys(compatibleIcons).map((k) => (
              <List.Dropdown.Item key={k} title={compatibleAliases[k]} value={k} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {devices?.map((d, i) => (
        <DeviceListItem key={i.toString()} device={d} />
      ))}
    </List>
  );
}

export function useDevices(
  query: string | undefined,
  systemFilterText: string
): {
  devices: Device[] | undefined;
  error?: Error | undefined;
  isLoading: boolean;
} {
  const [devices, setDevices] = useState<Device[]>();
  const {
    isLoading,
    data: rawData,
    error,
  } = useFetch<Zigbee>(`${baseURL}/devices.json`, {
    keepPreviousData: true,
  });
  const data = fixData(rawData);

  useEffect(() => {
    let didUnmount = false;

    if (data) {
      let fdevices = data.devices;
      if (systemFilterText.length > 0) {
        fdevices = fdevices.filter((d) => d.compatible?.includes(systemFilterText));
      }
      if (query !== undefined && query.length > 0) {
        const lquery = query.toLocaleLowerCase();
        fdevices = fdevices.filter((d) => {
          const lname = d.name?.toLocaleLowerCase() || "";
          const lvendor = d.vendor?.toString().toLocaleLowerCase() || "";
          const lmodel = d.model?.toString().toLocaleLowerCase() || "";
          return lname.includes(lquery) || lvendor.includes(lquery) || lmodel.includes(lquery);
        });
      }
      if (!didUnmount) {
        setDevices(fdevices);
      }
    }

    return () => {
      didUnmount = true;
    };
  }, [query, data, systemFilterText]);

  return { devices, error, isLoading };
}

function fixData(data: Zigbee | undefined): Zigbee | undefined {
  if (data === undefined) {
    return undefined;
  }
  for (const d of data.devices) {
    d.image = d.image?.replaceAll("zigbee/blakadder.com", "zigbee.blakadder.com"); // fix API bug
    let compatible: string[] | undefined;
    if (typeof d.compatible === "string") {
      compatible = [d.compatible];
    } else {
      compatible = d.compatible;
    }
    d.compatible = compatible;
    if (d.link.startsWith("/")) {
      d.link = `${baseURL}${d.link}`;
    }
  }
  return data;
}
