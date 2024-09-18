import { useEffect, useState } from "react";
import { client } from "./zeitraumClient";
import { Preset, PresetSearch } from "@zeitraum/client";

export const usePresets = (search: PresetSearch = {}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.presets({ search }).then((fetched) => {
      setPresets(fetched.data?.presets?.items ?? []);
      setLoading(false);
    });
  }, []);

  return { presets, loading };
};
