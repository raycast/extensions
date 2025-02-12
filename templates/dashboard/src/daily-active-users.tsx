import { getPreferenceValues, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { endOfYesterday, format, isSaturday, isSunday, subMonths } from "date-fns";
import { subDays } from "date-fns/esm";
import _ from "lodash";
import fetch from "node-fetch";

type Series = number[];

type Response = {
  data: {
    series: [Series];
  };
};

async function fetchDailyActiveUsers() {
  const { apiKey, secretKey } = getPreferenceValues();
  const authorizationHeader = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const headers = {
    Authorization: `Basic ${authorizationHeader}`,
  };

  const yesterday = endOfYesterday();
  let lastMonth = subMonths(yesterday, 1);
  lastMonth = subDays(lastMonth, isSunday(lastMonth) ? 2 : isSaturday(lastMonth) ? 1 : 0);
  const params = new URLSearchParams({
    start: format(lastMonth, "yyyyMMdd"),
    end: format(yesterday, "yyyyMMdd"),
  });

  // https://www.docs.developers.amplitude.com/analytics/apis/dashboard-rest-api/#get-active-and-new-user-counts
  const response = await fetch("https://amplitude.com/api/2/users?" + params, { headers });

  if (!response.ok) {
    throw Error(`Failed fetching daily active users (${response.statusText} - ${response.status})`);
  }

  const { data } = (await response.json()) as Response;
  return data.series[0];
}

function formatCommandSubtitle(dailyActiveUserSeries: Series) {
  const dailyActiveUsersYesterday = _.last(dailyActiveUserSeries);
  const dailyActiveUsersLastMonth = _.first(dailyActiveUserSeries);

  if (!dailyActiveUsersYesterday || !dailyActiveUsersLastMonth) {
    throw Error("Unable to extract data");
  }

  const growth = (dailyActiveUsersYesterday - dailyActiveUsersLastMonth) / dailyActiveUsersYesterday;

  const numberFormat = new Intl.NumberFormat("en-US", { useGrouping: true });
  const percentageFormat = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });

  return `${numberFormat.format(dailyActiveUsersYesterday)} (${percentageFormat.format(growth)} MoM)`;
}

export default async function command() {
  await showToast({ style: Toast.Style.Animated, title: "Refreshing daily active users" });

  try {
    const dailyActiveUsers = await fetchDailyActiveUsers();
    const subtitle = formatCommandSubtitle(dailyActiveUsers);

    updateCommandMetadata({ subtitle });

    await showToast({ style: Toast.Style.Success, title: "Refreshed daily active users" });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed refreshing daily active users",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
