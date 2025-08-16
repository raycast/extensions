interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: string;
  rating: number;
  tags: string[];
  url: string;
  contestSlug: string;
}

interface ZerotracEntry {
  id: number;
  slug: string;
  rating: number;
  contestSlug: string;
}

export async function loadAllProblemsFromZerotrac(): Promise<Problem[]> {
  try {
    console.log("Fetching Zerotrac ratings...");
    const response = await fetch(
      "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt",
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log(`Received ${text.length} characters from ratings.txt`);

    const problems: Problem[] = [];
    const lines = text.split("\n").filter((line) => line.trim());
    console.log(`Processing ${lines.length} lines`);

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Format: Rating\tID\tTitle\tTitle ZH\tTitle Slug\tContest Slug\tProblem Index
      const parts = line.split("\t");
      if (parts.length >= 6) {
        const rating = parseFloat(parts[0]);
        const id = parseInt(parts[1]);
        const title = parts[2];
        const slug = parts[4];
        const contestSlug = parts[5];

        // Skip invalid entries
        if (isNaN(id) || isNaN(rating) || !slug || !title) {
          continue;
        }

        // Estimate difficulty based on rating
        let difficulty: string;
        if (rating < 1200) difficulty = "Easy";
        else if (rating < 1800) difficulty = "Medium";
        else difficulty = "Hard";

        problems.push({
          id,
          title,
          slug,
          difficulty,
          rating,
          tags: [], // Will be populated later if needed
          url: `https://leetcode.com/problems/${slug}/`,
          contestSlug,
        });
      }
    }

    console.log(`Successfully parsed ${problems.length} problems`);
    return problems.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Failed to load Zerotrac data:", error);
    throw error; // Re-throw to trigger error handling in UI
  }
}

export { Problem, ZerotracEntry };
