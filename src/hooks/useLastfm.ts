import { useState, useEffect } from "react";
import { getErrorMessage } from "../functions/getErrorMessage";

// Types
import type { SongResponse, Track, TopTrack } from "../types/SongResponse";

interface Props {
  username: string;
  apikey: string;
  period: string;
  method: "top" | "recent";
  limit: string;
}

const useLastFm = (props: Props) => {
  const [songs, setSongs] = useState<Track[] | TopTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    setError(err instanceof Error ? err.message : "Unknown error");
    setLoading(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const method = props.method === "top" ? "gettoptracks" : "getrecenttracks";
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.${method}&user=${props.username}&api_key=${
          props.apikey
        }&format=json&period=${props.period}&limit=${props.limit || 24}`;

        const response = await fetch(url);
        const data = (await response.json()) as SongResponse;

        if (data.error) {
          const message = getErrorMessage(data.error);
          handleError(new Error(message));
        } else {
          const tracks = data.recenttracks?.track || data.toptracks?.track || [];
          setSongs(tracks);
          setLoading(false);
        }
      } catch (err) {
        handleError(err);
      }
    };

    fetchData();
  }, [props.username, props.apikey, props.period, props.limit, props.method]);

  return {
    loading,
    error,
    songs,
  };
};

export default useLastFm;
