import { List } from "@raycast/api";

export type Period = "overall" | "7day" | "1month" | "3month" | "6month" | "12month";

interface PeriodDropdownProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function PeriodDropdown({ period, onPeriodChange }: PeriodDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Select Time Period"
      value={period}
      onChange={(newPeriod) => onPeriodChange(newPeriod as Period)}
    >
      <List.Dropdown.Item value="overall" title="Overall" />
      <List.Dropdown.Item value="7day" title="Last 7 Days" />
      <List.Dropdown.Item value="1month" title="Last Month" />
      <List.Dropdown.Item value="3month" title="Last 3 Months" />
      <List.Dropdown.Item value="6month" title="Last 6 Months" />
      <List.Dropdown.Item value="12month" title="Last Year" />
    </List.Dropdown>
  );
}

export default PeriodDropdown;
