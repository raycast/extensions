import { Color, Icon } from "@raycast/api";

export type ResultProp = {
  label: string;
  value: number;
  tintColor: Color;
  icon: Icon;
  percentage?: number | undefined;
  text?: string | undefined;
  scheme?: string | undefined;
};

export const calculateRepMaxInitial = (weight: string, reps: string) => {
  const repetitions = parseInt(reps);
  const weightValue = parseInt(weight);

  const repMax = weightValue / (1.0278 - 0.0278 * repetitions);

  const allResults: ResultProp[] = [
    {
      label: "1 Repetition",
      value: repMax,
      tintColor: Color.Red,
      icon: Icon.Weights,
      percentage: 1.0,
      text: stringLow,
      scheme: "low",
    },
    {
      label: "3 Repetitions",
      value: repMax * 0.94,
      tintColor: Color.Orange,
      icon: Icon.Weights,
      percentage: 0.94,
      text: stringLow,
      scheme: "low",
    },
    {
      label: "5 Repetitions",
      value: repMax * 0.89,
      tintColor: Color.Yellow,
      icon: Icon.Weights,
      percentage: 0.89,
      text: stringModerate,
      scheme: "moderate",
    },
    {
      label: "6 Repetitions",
      value: repMax * 0.86,
      tintColor: Color.Yellow,
      icon: Icon.Weights,
      percentage: 0.86,
      text: stringModerate,
      scheme: "moderate",
    },
    {
      label: "10 Repetitions",
      value: repMax * 0.75,
      tintColor: Color.Green,
      icon: Icon.Weights,
      percentage: 0.75,
      text: stringHigh,
      scheme: "high",
    },
    {
      label: "12 Repetitions",
      value: repMax * 0.71,
      tintColor: Color.Green,
      icon: Icon.Weights,
      percentage: 0.71,
      text: stringHigh,
      scheme: "high",
    },
    {
      label: "15 Repetitions",
      value: repMax * 0.64,
      tintColor: Color.Green,
      icon: Icon.Weights,
      percentage: 0.64,
      text: stringHigh,
      scheme: "high",
    },
  ];

  return allResults;
};

export const calculateRepMax = (input: string) => {
  const pattern = /^(\d{1,})\*(\d{1,})$/;
  const match = input.match(pattern);

  if (match) {
    const weight = parseInt(match[1]);
    const reps = parseInt(match[2]);

    const repMax = weight / (1.0278 - 0.0278 * reps);

    const allResults: ResultProp[] = [
      {
        label: "1 Repetition",
        value: repMax,
        tintColor: Color.Red,
        icon: Icon.Weights,
        percentage: 1.0,
        text: stringLow,
        scheme: "low",
      },
      {
        label: "3 Repetitions",
        value: repMax * 0.94,
        tintColor: Color.Orange,
        icon: Icon.Weights,
        percentage: 0.94,
        text: stringLow,
        scheme: "low",
      },
      {
        label: "5 Repetitions",
        value: repMax * 0.89,
        tintColor: Color.Yellow,
        icon: Icon.Weights,
        percentage: 0.89,
        text: stringModerate,
        scheme: "moderate",
      },
      {
        label: "6 Repetitions",
        value: repMax * 0.86,
        tintColor: Color.Yellow,
        icon: Icon.Weights,
        percentage: 0.86,
        text: stringModerate,
        scheme: "moderate",
      },
      {
        label: "10 Repetitions",
        value: repMax * 0.75,
        tintColor: Color.Green,
        icon: Icon.Weights,
        percentage: 0.75,
        text: stringHigh,
        scheme: "high",
      },
      {
        label: "12 Repetitions",
        value: repMax * 0.71,
        tintColor: Color.Green,
        icon: Icon.Weights,
        percentage: 0.71,
        text: stringHigh,
        scheme: "high",
      },
      {
        label: "15 Repetitions",
        value: repMax * 0.64,
        tintColor: Color.Green,
        icon: Icon.Weights,
        percentage: 0.64,
        text: stringHigh,
        scheme: "high",
      },
    ];

    return allResults;
  } else {
    return [
      {
        label: "Your input should match the format weight x repetitions e.g. 70*6",
        value: 0,
        tintColor: Color.Red,
        icon: Icon.ExclamationMark,
      },
    ];
  }
};

const stringLow = `## Low repetition scheme \n\n A low repetition scheme with heavy loads (from 1 to 5 repetitions per set with 80% to 100% of 1-repetition maximum (1RM)) optimizes **strength increases.**`;
const stringModerate = `## Moderate repetition \n\n A moderate repetition scheme with moderate loads (from 8 to 12 repetitions per set with 60% to 80% of 1RM) optimizes **hypertrophic gains.**`;
const stringHigh = `## High repetition scheme \n\n A high repetition scheme with light loads (15+ repetitions per set with loads below 60% of 1RM) optimizes **local muscular endurance improvements.**`;
