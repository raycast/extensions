export interface Subject {
  id: number;
  object: "kanji" | "vocabulary" | "radical";
  data: {
    characters: string;
    meanings: Meaning[];
    readings?: Reading[];
    level: number;
  };
}

export interface Meaning {
  meaning: string;
  primary: boolean;
  accepted_answer: boolean;
}

export interface Reading {
  reading: string;
  primary: boolean;
  accepted_answer: boolean;
  type: "onyomi" | "kunyomi" | "nanori";
}

export interface Assignment {
  id: number;
  object: "assignment";
  data: {
    subject_id: number;
    subject_type: "kanji" | "vocabulary" | "radical";
    srs_stage: number;
    available_at: string | null;
    passed_at: string | null;
  };
}

export interface Summary {
  object: "report";
  data: {
    reviews: Array<{
      available_at: string;
      subject_ids: number[];
    }>;
    lessons: Array<{
      available_at: string;
      subject_ids: number[];
    }>;
  };
}

export interface Review {
  id?: number;
  object: "review";
  data: {
    assignment_id: number;
    subject_id: number;
    incorrect_meaning_answers: number;
    incorrect_reading_answers: number;
    created_at?: string;
  };
}

export interface ReviewSession {
  subject: Subject;
  assignment: Assignment;
  questionType: "meaning" | "reading";
  incorrectMeaningAnswers: number;
  incorrectReadingAnswers: number;
}