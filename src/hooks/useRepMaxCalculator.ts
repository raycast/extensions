// hooks/useRepMaxCalculator.ts
import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { MaxResult } from "../types/max";
import { calculateOneRepMax, generateResults, getErrorResult } from "../utils/calculations";
import { VALIDATION } from "../constants/shared";

export const useRepMaxCalculator = (initialWeight?: string, initialReps?: string) => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<MaxResult[]>([]);

  useEffect(() => {
    if (initialWeight && initialReps) {
      try {
        const weight = parseFloat(initialWeight);
        const reps = parseInt(initialReps);

        if (isNaN(reps) || isNaN(weight) || reps < VALIDATION.REPS.MIN || weight < VALIDATION.WEIGHT.MIN) {
          throw new Error(`Weight ${VALIDATION.getWeightError()} and ${VALIDATION.getRepsError()}`);
        }

        const repMax = calculateOneRepMax(weight, reps);
        setResults(generateResults(repMax));
        setSearchText(`${weight}*${reps}`);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error calculating one rep max",
          message: error instanceof Error ? error.message : "Invalid input",
        });
      }
    }
  }, [initialWeight, initialReps]);

  useEffect(() => {
    if (searchText.trim()) {
      const match = searchText.match(VALIDATION.WEIGHT.PATTERN);

      if (!match) {
        setResults(getErrorResult());
        return;
      }

      try {
        const weight = parseFloat(match[1]);
        const reps = parseInt(match[2]);

        if (weight > VALIDATION.WEIGHT.MAX || reps > VALIDATION.REPS.MAX) {
          throw new Error(`${VALIDATION.getWeightError()} and ${VALIDATION.getRepsError()}`);
        }

        const repMax = calculateOneRepMax(weight, reps);
        setResults(generateResults(repMax));
      } catch (error) {
        setResults(getErrorResult(error instanceof Error ? error.message : undefined));
      }
    } else {
      setResults([]);
    }
  }, [searchText]);

  return { searchText, setSearchText, results };
};
