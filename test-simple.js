import { parseTaskInput } from "./helpers/nlp-parser";

// Test the simplified NLP parser
const testCases = [
  "Buy milk p1 #Personal @urgent",
  "Meeting p2 #Work @meeting",
  "Call dentist {march 30} @health",
  "Review documents p3 #Work @review",
  "Grocery shopping @errands",
];

const mockProjects = [
  { id: "1", name: "Personal" },
  { id: "2", name: "Work" },
];

const mockLabels = [
  { id: "1", name: "urgent" },
  { id: "2", name: "meeting" },
  { id: "3", name: "health" },
  { id: "4", name: "review" },
  { id: "5", name: "errands" },
];

console.log("Testing Simplified NLP Parser...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase}"`);
  const result = parseTaskInput(testCase, mockProjects, mockLabels);
  console.log("Result:", {
    cleanTitle: result.cleanTitle,
    priority: result.priority,
    projectId: result.projectId,
    labels: result.labels,
    deadlineString: result.deadlineString,
  });
  console.log("---");
});
