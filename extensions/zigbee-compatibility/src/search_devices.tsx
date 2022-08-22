import { useState, useEffect } from "react";
import { Color, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Device {
  model: string;
  name: string;
  vendor: string;
  category: string;
  image?: string;
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
    />
  );
}

export default function SearchDevicesCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const { isLoading, devices } = useDevices(searchText);

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Search by Name, Vendor or Model">
      {devices?.map((d, i) => (
        <DeviceListItem key={i.toString()} device={d} />
      ))}
    </List>
  );
}

export function useDevices(query: string | undefined): {
  devices: Device[] | undefined;
  error?: Error | undefined;
  isLoading: boolean;
} {
  const [devices, setDevices] = useState<Device[]>();
  const {
    isLoading,
    data: rawData,
    error,
  } = useFetch<Zigbee>(`https://zigbee.blakadder.com/devices.json`, {
    keepPreviousData: true,
  });
  const data = fixData(rawData);

  useEffect(() => {
    let didUnmount = false;

    if (data) {
      if (query === undefined || query.length <= 0) {
        if (!didUnmount) {
          setDevices(data.devices || []);
        }
      } else {
        const lquery = query.toLocaleLowerCase();
        const fdevices = data.devices.filter((d) => {
          const lname = d.name?.toLocaleLowerCase() || "";
          const lvendor = d.vendor?.toString().toLocaleLowerCase() || "";
          const lmodel = d.model?.toString().toLocaleLowerCase() || "";
          return lname.includes(lquery) || lvendor.includes(lquery) || lmodel.includes(lquery);
        });
        if (!didUnmount) {
          setDevices(fdevices);
        }
      }
    }

    return () => {
      didUnmount = true;
    };
  }, [query, data]);

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
  }
  return data;
}
