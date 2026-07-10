import { Tool } from "@raycast/api";

type Input = {
  /** The description for the input property */
  query: string;
};

export default async function (input: Input) {
  // Your tool code here
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    title: "Run Tool",
  };
};
