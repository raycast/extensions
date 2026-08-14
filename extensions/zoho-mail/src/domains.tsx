import { getFavicon, useFetch, withAccessToken } from "@raycast/utils";
import { provider } from "./oauth";
import { API_URL, getZohoHeaders, parseZohoResponse } from "./zoho";
import { DomainVO, Organization } from "./types";
import { Color, Icon, List } from "@raycast/api";

export default withAccessToken(provider)(Domains);

function Domains() {
  const { isLoading: isLoadingOrganization, data: organization } = useFetch(API_URL + "/organization", {
    headers: getZohoHeaders(),
    parseResponse: parseZohoResponse<Organization>
  });
  
  const { isLoading, data: domains } = useFetch(`${API_URL}/organization/${organization?.zoid}/domains`, {
    headers: getZohoHeaders(),
    parseResponse: parseZohoResponse<{domainVO: DomainVO[]}>,
    mapResult(result) {
      return {
        data: result.domainVO
      }
    },
    initialData: [],
    execute: !!organization
  });

  return (
    <List isLoading={isLoadingOrganization || isLoading}>
      {domains.map((domain) => 
            <List.Item
              key={domain.domainId}
              icon={getFavicon(`https://${domain.domainName}`, {fallback: Icon.Globe})}
              title={domain.domainName}
              accessories={[domain.verificationStatus ? {icon: Icon.CheckRosette, tag: {value:"Verified", color: Color.Green}}: {icon:Icon.XMarkCircle, tag: {value: "Not Verified", color: Color.Red}}, {date: new Date(+domain.createdTime)}]}
            />
      )}
    </List>
  );
}