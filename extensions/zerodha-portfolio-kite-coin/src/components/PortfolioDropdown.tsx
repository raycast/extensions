import { List } from "@raycast/api";
import { PortfolioView } from "../lib/types";

interface PortfolioDropdownProps {
  value: PortfolioView;
  onChange: (value: PortfolioView) => void;
}

export function PortfolioDropdown({ value, onChange }: PortfolioDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Select portfolio view"
      value={value}
      onChange={(v) => onChange(v as PortfolioView)}
    >
      <List.Dropdown.Item title="Stocks (Kite)" value="stocks" />
      <List.Dropdown.Item title="Mutual Funds (Coin)" value="mutualfunds" />
    </List.Dropdown>
  );
}
