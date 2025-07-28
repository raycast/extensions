import React, { useState } from "react";
import { showToast, Toast, getPreferenceValues, List, Grid } from "@raycast/api";

// Hooks
import { useTopSongs } from "./hooks/useTopSongs";

// Types
import type { TopTrack } from "@/types/SongResponse";
import { periodTypes } from "./types";
import { useTopTracks } from "./lib/use-lastfm";
import { PeriodDropdown } from "./components/period";
import { ListResults } from "./components/list";
import { GridResults } from "./components/grid";

const TopSongs: React.FC = () => {
  const { period: defaultPeriod, view } = getPreferenceValues();
  const [period, setPeriod] = useState<periodTypes>(defaultPeriod);
  const { loading, error, songs, revalidate } = useTopTracks({ period });

  if (error !== null) {
    showToast(Toast.Style.Failure, "Something went wrong.", String(error));
    return (
      <List isLoading={false}>
        <List.EmptyView title="Something went wrong" description={String(error)} />
      </List>
    );
  }

  function onPeriodChange(value: string) {
    setPeriod(value as periodTypes);
    revalidate();
  }

  const { processedData } = useTopSongs(songs as TopTrack[]);

  if (view === "grid") {
    return (
      <Grid
        isLoading={loading}
        searchBarPlaceholder="Search songs..."
        searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
      >
        <GridResults items={processedData} />
      </Grid>
    );
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search songs..."
      searchBarAccessory={<PeriodDropdown selectedPeriod={period} onPeriodChange={onPeriodChange} />}
    >
      <ListResults items={processedData} />
    </List>
  );
};

export default TopSongs;
