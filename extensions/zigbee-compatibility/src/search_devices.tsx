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

export default function SearchDevicesCommand(): JSX.Element {
  const [searchText, setSearchText] = useState("");
  const { isLoading, devices } = useDevices(searchText);

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
        return { icon: { source: icon, tintColor: tintColor }, tooltip: c };
      }
    });
    return result;
  };

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText}>
      {devices?.map((d, i) => (
        <List.Item key={i.toString()} title={d.name || "?"} icon={d.image} accessories={getAccessories(d)} />
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
          return lname.includes(lquery);
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
