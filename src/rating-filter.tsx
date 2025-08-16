import React from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";

interface RatingFilterProps {
  onSubmit: (minRating: string, maxRating: string) => void;
  currentMin?: string;
  currentMax?: string;
}

export function RatingFilterForm({ onSubmit, currentMin = "", currentMax = "" }: RatingFilterProps) {
  const { pop } = useNavigation();
  const [minRating, setMinRating] = useState(currentMin);
  const [maxRating, setMaxRating] = useState(currentMax);

  const handleSubmit = () => {
    // Validate inputs
    const min = minRating ? parseFloat(minRating) : null;
    const max = maxRating ? parseFloat(maxRating) : null;

    if (min !== null && isNaN(min)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid minimum rating",
        message: "Please enter a valid number",
      });
      return;
    }

    if (max !== null && isNaN(max)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid maximum rating",
        message: "Please enter a valid number",
      });
      return;
    }

    if (min !== null && max !== null && min > max) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid range",
        message: "Minimum rating must be less than maximum rating",
      });
      return;
    }

    onSubmit(minRating, maxRating);
    pop();
    showToast({
      style: Toast.Style.Success,
      title: "Filter applied",
      message: `Rating range: ${minRating || "0"} - ${maxRating || "∞"}`,
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Filter" onSubmit={handleSubmit} />
          <Action
            title="Clear Filter"
            onAction={() => {
              onSubmit("", "");
              pop();
              showToast({
                style: Toast.Style.Success,
                title: "Filter cleared",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="minRating"
        title="Minimum Rating"
        placeholder="e.g., 2100"
        value={minRating}
        onChange={setMinRating}
      />
      <Form.TextField
        id="maxRating"
        title="Maximum Rating"
        placeholder="e.g., 2200"
        value={maxRating}
        onChange={setMaxRating}
      />
      <Form.Description text="Enter the rating range to filter problems. Leave empty to show all." />
    </Form>
  );
}