import React, { useState, useEffect } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  Toast,
  showToast,
  getPreferenceValues,
} from "@raycast/api";
import { loadAllProblemsFromZerotrac, Problem } from "./leetcode-data";

interface Preferences {
  defaultSort: SortOption;
}

type SortOption =
  | "rating-asc"
  | "rating-desc"
  | "id-asc"
  | "id-desc"
  | "title-asc"
  | "title-desc";

export default function SearchProblems() {
  const preferences = getPreferenceValues<Preferences>();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>(
    preferences.defaultSort || "rating-asc",
  );
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [dropdownValue, setDropdownValue] = useState<string>(
    `sort:${preferences.defaultSort || "rating-asc"}`,
  );

  // Load all problems from Zerotrac ratings.txt
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        showToast({
          style: Toast.Style.Animated,
          title: "Loading all problems from Zerotrac...",
        });

        const allProblems = await loadAllProblemsFromZerotrac();

        setProblems(allProblems);
        setFilteredProblems(allProblems);

        showToast({
          style: Toast.Style.Success,
          title: `Loaded ${allProblems.length} problems`,
          message: "All with Zerotrac ratings!",
        });
      } catch (error) {
        console.error("Failed to load data:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load problems",
          message: "Please try again",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Sort function
  const sortProblems = (
    problems: Problem[],
    sortOption: SortOption,
  ): Problem[] => {
    const sorted = [...problems];

    switch (sortOption) {
      case "rating-asc":
        return sorted.sort((a, b) => a.rating - b.rating);
      case "rating-desc":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "id-asc":
        return sorted.sort((a, b) => a.id - b.id);
      case "id-desc":
        return sorted.sort((a, b) => b.id - a.id);
      case "title-asc":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "title-desc":
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  };

  // Handle dropdown changes
  useEffect(() => {
    if (dropdownValue.startsWith("sort:")) {
      setSortBy(dropdownValue.replace("sort:", "") as SortOption);
    } else if (dropdownValue.startsWith("filter:")) {
      setRatingFilter(dropdownValue.replace("filter:", ""));
    }
  }, [dropdownValue]);

  // Filter and sort problems based on search, rating range, and sort option
  useEffect(() => {
    let filtered = problems;

    // Text search filter
    if (searchText !== "") {
      filtered = filtered.filter(
        (problem) =>
          problem.title.toLowerCase().includes(searchText.toLowerCase()) ||
          problem.slug.toLowerCase().includes(searchText.toLowerCase()) ||
          problem.difficulty.toLowerCase().includes(searchText.toLowerCase()) ||
          problem.contestSlug
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          searchText.includes(problem.rating.toString()) ||
          problem.id.toString().includes(searchText),
      );
    }

    // Rating range filter
    if (ratingFilter !== "all") {
      const parts = ratingFilter.split("-").map(Number);
      if (parts.length === 2) {
        const [min, max] = parts;
        filtered = filtered.filter((problem) => {
          return problem.rating >= min && problem.rating <= max;
        });
      } else if (ratingFilter === "2600") {
        // Handle 2600+ case
        filtered = filtered.filter((problem) => problem.rating >= 2600);
      }
    }

    const sorted = sortProblems(filtered, sortBy);
    setFilteredProblems(sorted);
  }, [searchText, problems, sortBy, ratingFilter]);

  function getDifficultyColor(difficulty: string): Color {
    switch (difficulty) {
      case "Easy":
        return Color.Green;
      case "Medium":
        return Color.Yellow;
      case "Hard":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
  }

  function getRatingColor(rating: number): Color {
    if (rating < 1200) return Color.Green;
    if (rating < 1600) return Color.Yellow;
    if (rating < 2000) return Color.Orange;
    return Color.Red;
  }

  function formatRating(rating: number): string {
    return `${Math.round(rating)}`;
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search problems by title, tags, difficulty, or rating..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort & Filter"
          value={dropdownValue}
          onChange={setDropdownValue}
          storeValue
        >
          <List.Dropdown.Section title="🎯 Rating Filters">
            <List.Dropdown.Item
              value="filter:all"
              title="All Ratings"
              icon={Icon.Circle}
            />
            <List.Dropdown.Item
              value="filter:0-1200"
              title="0 - 1200 (Beginner)"
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
            />
            <List.Dropdown.Item
              value="filter:1200-1400"
              title="1200 - 1400 (Easy)"
              icon={{ source: Icon.Circle, tintColor: Color.Green }}
            />
            <List.Dropdown.Item
              value="filter:1400-1600"
              title="1400 - 1600 (Easy-Med)"
              icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
            />
            <List.Dropdown.Item
              value="filter:1600-1800"
              title="1600 - 1800 (Medium)"
              icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
            />
            <List.Dropdown.Item
              value="filter:1800-2000"
              title="1800 - 2000 (Med-Hard)"
              icon={{ source: Icon.Circle, tintColor: Color.Orange }}
            />
            <List.Dropdown.Item
              value="filter:2000-2200"
              title="2000 - 2200 (Hard)"
              icon={{ source: Icon.Circle, tintColor: Color.Orange }}
            />
            <List.Dropdown.Item
              value="filter:2200-2400"
              title="2200 - 2400 (Very Hard)"
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
            />
            <List.Dropdown.Item
              value="filter:2400-2600"
              title="2400 - 2600 (Expert)"
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
            />
            <List.Dropdown.Item
              value="filter:2600"
              title="2600+ (Master)"
              icon={{ source: Icon.Circle, tintColor: Color.Red }}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="📊 Sort By Rating">
            <List.Dropdown.Item
              value="sort:rating-asc"
              title="Rating (Low to High)"
              icon={Icon.ChevronUp}
            />
            <List.Dropdown.Item
              value="sort:rating-desc"
              title="Rating (High to Low)"
              icon={Icon.ChevronDown}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="🔢 Sort By ID">
            <List.Dropdown.Item
              value="sort:id-asc"
              title="ID (Low to High)"
              icon={Icon.ChevronUp}
            />
            <List.Dropdown.Item
              value="sort:id-desc"
              title="ID (High to Low)"
              icon={Icon.ChevronDown}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="📝 Sort By Title">
            <List.Dropdown.Item
              value="sort:title-asc"
              title="Title (A to Z)"
              icon={Icon.ChevronUp}
            />
            <List.Dropdown.Item
              value="sort:title-desc"
              title="Title (Z to A)"
              icon={Icon.ChevronDown}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {filteredProblems.map((problem) => (
        <List.Item
          id={problem.id.toString()}
          title={`${problem.id}. ${problem.title}`}
          subtitle={`Contest: ${problem.contestSlug}`}
          accessories={[
            {
              text: problem.difficulty,
              icon: {
                source: Icon.Circle,
                tintColor: getDifficultyColor(problem.difficulty),
              },
            },
            {
              text: formatRating(problem.rating),
              icon: {
                source: Icon.Star,
                tintColor: getRatingColor(problem.rating),
              },
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open In LeetCode"
                  url={problem.url}
                  icon={Icon.Globe}
                />
                <Action.OpenInBrowser
                  title="Open In LeetCode (Chinese)"
                  url={problem.url.replace("leetcode.com", "leetcode.cn")}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={problem.url}
                  icon={Icon.Clipboard}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  content={problem.title}
                  icon={Icon.Text}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
                <Action.CopyToClipboard
                  title="Copy Problem Info"
                  content={`${problem.id}. ${problem.title} - ${problem.difficulty} (Rating: ${Math.round(problem.rating)})\nContest: ${problem.contestSlug}\n${problem.url}`}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Rating"
                  content={Math.round(problem.rating).toString()}
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
