import { getPreferenceValues } from "@raycast/api";
import { Assignment, Review, Subject, Summary, StudyMaterial } from "../types/wanikani";

interface Preferences {
  apiToken: string;
}

export class WaniKaniClient {
  private apiToken: string;
  private baseUrl = "https://api.wanikani.com/v2";

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiToken = preferences.apiToken;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WaniKani API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getSummary(): Promise<Summary> {
    return this.fetch<Summary>("/summary");
  }

  async getSubjects(subjectIds: number[]): Promise<Subject[]> {
    const ids = subjectIds.join(",");
    const response = await this.fetch<{ data: Subject[] }>(`/subjects?ids=${ids}`);
    return response.data;
  }

  async getAssignments(subjectIds: number[]): Promise<Assignment[]> {
    const ids = subjectIds.join(",");
    const response = await this.fetch<{ data: Assignment[] }>(
      `/assignments?subject_ids=${ids}&immediately_available_for_review=true`,
    );
    return response.data;
  }

  async getAvailableReviews(): Promise<Assignment[]> {
    const response = await this.fetch<{ data: Assignment[] }>(`/assignments?immediately_available_for_review=true`);
    return response.data;
  }

  async getLessonAssignments(subjectIds: number[]): Promise<Assignment[]> {
    const ids = subjectIds.join(",");
    const response = await this.fetch<{ data: Assignment[] }>(
      `/assignments?subject_ids=${ids}&immediately_available_for_lessons`,
    );
    return response.data;
  }

  async createReview(
    assignmentId: number,
    incorrectMeaningAnswers: number,
    incorrectReadingAnswers: number,
  ): Promise<Review> {
    const response = await this.fetch<{ data: Review }>("/reviews", {
      method: "POST",
      body: JSON.stringify({
        review: {
          assignment_id: assignmentId,
          incorrect_meaning_answers: incorrectMeaningAnswers,
          incorrect_reading_answers: incorrectReadingAnswers,
        },
      }),
    });
    return response.data;
  }

  async startAssignment(assignmentId: number): Promise<Assignment> {
    const response = await this.fetch<{ data: Assignment }>(`/assignments/${assignmentId}/start`, {
      method: "PUT",
    });
    return response.data;
  }

  async getStudyMaterials(subjectIds: number[]): Promise<StudyMaterial[]> {
    const ids = subjectIds.join(",");
    const response = await this.fetch<{ data: StudyMaterial[] }>(`/study_materials?subject_ids=${ids}`);
    return response.data;
  }
}
