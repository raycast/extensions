interface GraphQLResponse {
  data: {
    problemsetQuestionList: {
      total: number;
      questions: Array<{
        acRate: number;
        difficulty: string;
        freqBar: number;
        frontendQuestionId: string;
        isFavor: boolean;
        paidOnly: boolean;
        status: string;
        title: string;
        titleSlug: string;
        topicTags: Array<{
          name: string;
          id: string;
          slug: string;
        }>;
        hasSolution: boolean;
        hasVideoSolution: boolean;
      }>;
    };
  };
}

export async function fetchAllLeetCodeProblems() {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          freqBar
          frontendQuestionId
          isFavor
          paidOnly
          status
          title
          titleSlug
          topicTags {
            name
            id
            slug
          }
          hasSolution
          hasVideoSolution
        }
      }
    }
  `;

  const variables = {
    categorySlug: "",
    skip: 0,
    limit: 3000, // Get more problems
    filters: {}
  };

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: GraphQLResponse = await response.json();
    
    return data.data.problemsetQuestionList.questions.map(q => ({
      id: parseInt(q.frontendQuestionId),
      title: q.title,
      slug: q.titleSlug,
      difficulty: q.difficulty,
      tags: q.topicTags.map(tag => tag.name),
      url: `https://leetcode.com/problems/${q.titleSlug}/`,
      paidOnly: q.paidOnly,
      acRate: q.acRate
    }));
  } catch (error) {
    console.error("Failed to fetch LeetCode problems:", error);
    return [];
  }
}