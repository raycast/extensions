import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import https from "https";

// Define the shape of each forecast item.
interface ForecastItem {
  value: number;
  low: number;
  high: number;
  low95: number;
  high95: number;
  name: string;
  name_eng: string;
  color: string;
  y: number;
  x: number;
  _row: string;
}

// Create an HTTPS agent that bypasses certificate validation (for testing only)
const agent = new https.Agent({ rejectUnauthorized: false });

export default function Zweitstimme() {
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch data from the API when the component mounts.
  useEffect(() => {
    async function fetchForecast() {
      try {
        const response = await fetch("https://polsci.uni-wh.de/forecast", { agent });
        const data: ForecastItem[] = (await response.json()) as ForecastItem[];
        setForecast(data);
      } catch (error) {
        console.error("Error fetching forecast data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchForecast();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true} // Detail view will be shown by default when an item is selected.
      searchBarPlaceholder="Search forecast items..."
    >
      {forecast.map((item) => (
        <List.Item
          key={item._row}
          // Use a circle icon tinted with the forecast's color.
          icon={{ source: "circle", tintColor: item.color }}
          title={`${item.value}`}
          subtitle={item.name}
          detail={
            <List.Item.Detail
              markdown={`
# ${item.name} (${item.name_eng})

- **Value:** ${item.value}
- **Low:** ${item.low}
- **High:** ${item.high}
- **Low95:** ${item.low95}
- **High95:** ${item.high95}
- **Coordinates:** (${item.x}, ${item.y})
- **Row:** ${item._row}
- **Color:** ${item.color}
              `}
            />
          }
        />
      ))}
    </List>
  );
}
