import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useTripSearch } from "../api/client";
import { ArrivalOrDeparture, Trip } from "../api/types";
import Accessory = List.Item.Accessory;

export interface TripsProps {
  fromStation: string;
  toStation: string;
  date: string;
  searchArrival: boolean;
}

export function Trips(props: TripsProps) {
  const { isLoading, data } = useTripSearch(props.fromStation, props.toStation, props.date, props.searchArrival);

  console.log("Trips props", props);

  return <List
    isLoading={isLoading}
    navigationTitle="Search a trips"
  >
    {((data === undefined ? { payload: [] } : data).trips || []).map(renderTripRow)}
  </List>;
}

function renderTripRow(trip: Trip) {
  const fromStationName: string | undefined = trip.legs[0].origin.name;
  const toStationName: string | undefined = trip.legs.length === 1 ? trip.legs[0].destination.name : trip.legs[trip.legs.length - 1].destination.name;
  const transfers: number | undefined = trip.legs.length > 1 ? trip.legs.length - 1 : undefined;
  const products: string[] = [];
  const accessories: Accessory[] = [];

  trip.legs.forEach((l, idx, arr) => {
    if (l.product !== undefined) {
      products.push(l.product.shortCategoryName!);
    }
  });

  // if (trip.legs.length > 0 && trip.legs[0].origin.actualDateTime !== undefined) {
  //   accessories.push({
  //     text: { value: trip.legs[0].origin.actualDateTime!.toTimeString() }
  //   });
  // }

  if (transfers !== undefined) {
    accessories.push({
      text: { value: `${transfers} transfers` }, icon: Icon.Train
    });
  }

  accessories.push({
    text: { value: products.join(" - ") }
  });

  if (trip.crowdForecast !== undefined) {
    switch (trip.crowdForecast) {
      case ArrivalOrDeparture.CrowdForecastEnum.UNKNOWN:
      case ArrivalOrDeparture.CrowdForecastEnum.LOW:
        accessories.push({
          text: { value: "Low", color: Color.Green }, icon: Icon.TwoPeople
        });
        break;
      case ArrivalOrDeparture.CrowdForecastEnum.MEDIUM:
        accessories.push({
          text: { value: "Medium", color: Color.Orange }, icon: Icon.TwoPeople
        });
        break;
      case ArrivalOrDeparture.CrowdForecastEnum.HIGH:
        accessories.push({
          text: { value: "High", color: Color.Red }, icon: Icon.TwoPeople
        });
        break;
    }
  }

  if (trip.plannedDurationInMinutes !== undefined) {
    accessories.push({
      text: { value: `${trip.plannedDurationInMinutes} min` }, icon: Icon.Clock
    });

    if (trip.actualDurationInMinutes !== undefined && (trip.actualDurationInMinutes > trip.plannedDurationInMinutes)) {
      accessories.push({
        tag: { value: `+${trip.actualDurationInMinutes - trip.plannedDurationInMinutes} min`, color: Color.Red }
      });
    }
  }


  return (
    <List.Item
      key={trip.uid}
      title={`${fromStationName} - ${toStationName}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Add to Favorite" onAction={() => console.log(`${trip} selected`)} />
        </ActionPanel>
      }
    />
  );
}
