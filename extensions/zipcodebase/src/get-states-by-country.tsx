import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL } from "./utils/constants";
import { Action, ActionPanel, Icon, Image, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetStatesByCountryResponse } from "./utils/types";
import ErrorComponent from "./components/ErrorComponent";

export default function GetStatesByCountry(
  props: LaunchProps<{ arguments: Arguments.GetStatesByCountry }>
) {
  const { push } = useNavigation();
  const { country } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, country });
  
  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetStatesByCountryResponse>(
    `${BASE_URL}country/province?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading}>
      {data && !("error" in data) && Object.keys(data.results).length>0 ? 
          <List.Section title={`country: ${data.query.country}`}>
            {data.results.map(result => (
                <List.Item
                  key={result}
                  title={result}
                  icon={{ source: Icon.Map, mask: Image.Mask.Circle }}
                  actions={<ActionPanel>
                    <Action.CopyToClipboard content={result} />
                    <Action.CopyToClipboard title="Copy All to Clipboard" content={data.results.join()} />
                    <ActionPanel.Section>
                      <Action title="Revalidate" icon={Icon.Redo} onAction={revalidate} />
                    </ActionPanel.Section>
                  </ActionPanel>}
                />
              ))}
          </List.Section> : <List.EmptyView title="No Results" description={`country: ${country}`} />}
    </List>
  );
}
