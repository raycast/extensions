import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetPostalCodeDistanceResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function GetPostalCodeDistance(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodeDistance }>
) {
  const { push } = useNavigation();
  const { code, compare, country } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, code, compare, country });
  
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetPostalCodeDistanceResponse>(
    `${BASE_URL}distance?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading}>
      {data && !("error" in data) && Object.keys(data.results).length>0 ? <List.Section title={`code: ${code} | country: ${country}`}>
        {Object.entries(data.results).map(([compare, distance]) => (
            <List.Item 
              key={compare}
              title={`${code} - ${compare}`}
              icon={Icon.Map}
              accessories={[
                { text: distance.toString() + data.query.unit }
              ]}
              actions={<ActionPanel>
                <Action.CopyToClipboard title="Copy Distance" content={distance.toString()} />
                <ActionPanel.Section>
                  <Action title="Revalidate" icon={Icon.Redo} onAction={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>}
            />
          ))}
      </List.Section> : <List.EmptyView title="No Results" description={`code: ${code} | compare: ${compare} | country: ${country}`} />}
    </List>
  );
}
