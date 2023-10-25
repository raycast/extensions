import { Action, ActionPanel, Icon, LaunchProps, List, showToast } from "@raycast/api";
import { ErrorResponse, GetPostalCodeLocationInformationResponse } from "./utils/types";
import { Fragment, useEffect, useState } from "react";
import ErrorComponent from "./components/ErrorComponent";
import { getPostalCodeLocationInformation } from "./utils/api";

export default function GetPostalCodeLocationInformation(
  props: LaunchProps<{ arguments: Arguments.GetPostalCodeLocationInformation }>
) {
  const { codes, country } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ErrorResponse | GetPostalCodeLocationInformationResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getPostalCodeLocationInformation(codes, country);
    if ("results" in response) {
      let message = `Fetched ${Object.keys(response.results).length} codes`;
      if (country) message += ` in ${country}`;
      showToast({
        title: "SUCCESS",
        message: message,
      });
    }
    setData(response);
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return data && !("results" in data) ? (
    <ErrorComponent errorResponse={data} />
  ) : (
    <List isLoading={isLoading} isShowingDetail>
      {data && Object.keys(data.results).length > 0 ? (
        <List.Section title={`country: ${country || "null"}`}>
          {Object.entries(data.results).map(([code, result]) => (
            <List.Item
              key={code}
              title={code}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy All as JSON" content={JSON.stringify(data)} />
                  <ActionPanel.Section>
                    <Action title="Revalidate" icon={Icon.Redo} onAction={getFromApi} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {result.map((item) =>
                        Object.entries(item).map(([key, val]) => (
                          <Fragment key={key}>
                            <List.Item.Detail.Metadata.Label
                              title={key}
                              text={val ? val : undefined}
                              icon={val ? undefined : Icon.Minus}
                            />
                            {key === "province_code" && <List.Item.Detail.Metadata.Separator />}
                          </Fragment>
                        ))
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No Results" description={`codes: ${codes} | country: ${country || "null"}`} />
      )}
    </List>
  );
}
