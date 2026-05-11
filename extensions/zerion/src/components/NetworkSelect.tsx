import { List, Image, Icon } from "@raycast/api";
import { ALL_CHAINS } from "../shared/constants";
import { ChainInfo } from "../shared/types";

export function ChainsSelector({ chains, onChange }: { chains: ChainInfo[]; onChange(value: string): void }) {
  return (
    <List.Dropdown tooltip="Filter portfolio by network" storeValue={true} onChange={onChange}>
      <List.Dropdown.Item
        value={ALL_CHAINS}
        title="All Networks"
        icon={{ source: "all.svg", mask: Image.Mask.RoundedRectangle }}
      />
      {chains.map((chain) => (
        <List.Dropdown.Item
          key={chain.id}
          value={chain.id}
          title={chain.name}
          icon={{ source: chain.iconUrl || Icon.ComputerChip, mask: Image.Mask.RoundedRectangle }}
        />
      ))}
    </List.Dropdown>
  );
}
