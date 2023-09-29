import { useFetch } from "@raycast/utils";
import { API_KEY, BASE_URL } from "./utils/constants";
import { Action, ActionPanel, Icon, LaunchProps, List, useNavigation } from "@raycast/api";
import { ErrorResponse, GetPostalCodeLocationInformationResponse } from "./utils/types";
import { Fragment } from "react";
import ErrorComponent from "./components/ErrorComponent";

export default function GetPostalCodeLocationInformation(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodeLocationInformation }>
) {
  const { push } = useNavigation();
  const { codes, country } = props.arguments;

  const params = new URLSearchParams({ apikey: API_KEY, codes });
  if (country) params.append("country", country);

  const { isLoading, data, revalidate } = useFetch<ErrorResponse | GetPostalCodeLocationInformationResponse>(
    `${BASE_URL}search?` + params
  );

  return (data && ("error" in data)) ? push(<ErrorComponent error={data.error} />) : (
    <List isLoading={isLoading} isShowingDetail>
      {data && !("error" in data) && Object.keys(data.results).length>0 ? <List.Section title={`country: ${country || "null"}`}>
        {Object.entries(data.results).map(([code, result]) => (
            <List.Item
              key={code}
              title={code}
              actions={<ActionPanel>
                <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(data)} />
                <ActionPanel.Section>
                  <Action title="Revalidate" icon={Icon.Redo} onAction={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {result.map(item => Object.entries(item).map(([key, val]) => (
                                <Fragment key={key}>
                                  <List.Item.Detail.Metadata.Label title={key} text={val ? val : undefined} icon={val ? undefined : Icon.Minus} />
                                  {key==="province_code" && <List.Item.Detail.Metadata.Separator />}
                                </Fragment>
                      )))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section> : <List.EmptyView title="No Results" description={`codes: ${codes} | country: ${country || "null"}`} />}
    </List>
  );
}
