import { Tag } from "@zeitraum/client";
import { useEffect, useState } from "react";
import { client } from "./zeitraumClient";

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.tags().then((fetched) => {
      setTags(fetched.data?.tags.items ?? []);
      setLoading(false);
    });
  }, []);

  return { tags, loading };
};
