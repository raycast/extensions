// hooks/useRepMaxCalculator.ts
import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { MaxResult } from "../types/max";
import { calculateOneRepMax, generateResults } from "../utils/calculations";
import { VALIDATION } from "../constants/shared";
export const useRepMaxCalculator = (initialWeight?: string, initialReps?: string) => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<MaxResult[]>([]);

  // Add a ref to track if initial calculation has been done
  const initialCalculationDone = useRef(false);

  useEffect(() => {
    if (initialWeight && initialReps && !initialCalculationDone.current) {
      try {
        const weight = parseFloat(initialWeight);
        const reps = parseInt(initialReps);

        if (isNaN(reps) || isNaN(weight) || reps < VALIDATION.REPS.MIN || weight < VALIDATION.WEIGHT.MIN) {
          throw new Error(`Weight ${VALIDATION.getWeightError()} and ${VALIDATION.getRepsError()}`);
        }

        const repMax = calculateOneRepMax(weight, reps);
        const generatedResults = generateResults(repMax);

        setResults(generatedResults);
        setSearchText(`${weight}*${reps}`);

        // Mark initial calculation as done
        initialCalculationDone.current = true;
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error calculating one rep max",
          message: error instanceof Error ? error.message : "Invalid input",
        });
      }
    }
  }, [initialWeight, initialReps]); // Ensure this only runs when these change

  // Rest of the existing code remains the same
  return { searchText, setSearchText, results };
};
