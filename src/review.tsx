import { ActionPanel, Action, Form, showToast, Toast, useNavigation, List, Icon, Detail, Image } from "@raycast/api";
import { useState, useEffect } from "react";
import { WaniKaniClient } from "./api/client";
import { ReviewSession, Subject, Assignment } from "./types/wanikani";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      setIsLoading(true);
      const client = new WaniKaniClient();
      
      // Get assignments that are immediately available for review according to SRS
      const assignments = await client.getAvailableReviews();
      
      if (assignments.length === 0) {
        showToast({ style: Toast.Style.Success, title: "No reviews available" });
        setIsLoading(false);
        return;
      }

      // Get the subjects for these assignments
      const subjectIds = assignments.map(a => a.data.subject_id);
      const subjects = await client.getSubjects(subjectIds);
      
      // Get study materials for these subjects
      const studyMaterials = await client.getStudyMaterials(subjectIds);
      const studyMaterialMap = new Map(studyMaterials.map(sm => [sm.data.subject_id, sm]));

      const sessions: ReviewSession[] = [];
      
      for (const assignment of assignments) {
        const subject = subjects.find(s => s.id === assignment.data.subject_id);
        if (!subject) continue;

        const studyMaterial = studyMaterialMap.get(subject.id);

        // Add meaning question for all items that have meanings
        if (subject.data.meanings.length > 0) {
          sessions.push({
            subject,
            assignment,
            questionType: "meaning",
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
            studyMaterial,
          });
        }

        // Add reading questions for kanji and vocabulary (not radicals)
        if (subject.object !== "radical" && subject.data.readings && subject.data.readings.length > 0) {
          // Get unique reading types that have accepted answers
          const readingTypes = [...new Set(
            subject.data.readings
              .filter(r => r.accepted_answer)
              .map(r => r.type)
          )];
          
          // Create a session for each reading type
          readingTypes.forEach(readingType => {
            sessions.push({
              subject,
              assignment,
              questionType: "reading",
              readingType,
              incorrectMeaningAnswers: 0,
              incorrectReadingAnswers: 0,
              studyMaterial,
            });
          });
        }
      }

      // Randomize the order of questions
      sessions.sort(() => Math.random() - 0.5);
      setReviewSessions(sessions);
      setIsLoading(false);

      if (sessions.length > 0) {
        push(<ReviewScreen sessions={sessions} startIndex={0} />);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
      setIsLoading(false);
      showToast({ style: Toast.Style.Failure, title: "Failed to load reviews", message: err instanceof Error ? err.message : undefined });
    }
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  if (reviewSessions.length === 0) {
    return (
      <List>
        <List.EmptyView title="No Reviews Available" description="You have no reviews available at this time." icon={Icon.CheckCircle} />
      </List>
    );
  }

  return null;
}

interface ReviewScreenProps {
  sessions: ReviewSession[];
  startIndex: number;
}

function ReviewScreen({ sessions, startIndex }: ReviewScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const { push, pop } = useNavigation();

  const currentSession = sessions[currentIndex];
  const progress = `${currentIndex + 1} / ${sessions.length}`;


  async function submitAllReviews() {
    const client = new WaniKaniClient();
    
    try {
      const reviewsByAssignment = new Map<number, ReviewSession>();
      
      for (const session of sessions) {
        const existing = reviewsByAssignment.get(session.assignment.id);
        if (existing) {
          existing.incorrectMeaningAnswers = Math.max(existing.incorrectMeaningAnswers, session.incorrectMeaningAnswers);
          existing.incorrectReadingAnswers = Math.max(existing.incorrectReadingAnswers, session.incorrectReadingAnswers);
        } else {
          reviewsByAssignment.set(session.assignment.id, session);
        }
      }

      for (const session of reviewsByAssignment.values()) {
        await client.createReview(
          session.assignment.id,
          session.incorrectMeaningAnswers,
          session.incorrectReadingAnswers
        );
      }

      showToast({ style: Toast.Style.Success, title: "Reviews completed!" });
      pop();
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "Failed to submit reviews", message: err instanceof Error ? err.message : undefined });
    }
  }

  function getAcceptedAnswers() {
    if (currentSession.questionType === "meaning") {
      const officialMeanings = currentSession.subject.data.meanings
        .filter(m => m.accepted_answer)
        .map(m => m.meaning);
      
      // Add synonyms if available
      const synonyms = currentSession.studyMaterial?.data.meaning_synonyms || [];
      const allMeanings = [...officialMeanings, ...synonyms];
      
      return allMeanings.join(", ");
    } else {
      // For reading questions, filter by reading type if specified
      const readings = currentSession.subject.data.readings!
        .filter(r => r.accepted_answer && 
          (!currentSession.readingType || r.type === currentSession.readingType));
      
      return readings
        .map(r => r.reading)
        .join(", ");
    }
  }

  const markdown = `
# ${currentSession.subject.data.characters}

**${currentSession.questionType === "meaning" ? "What is the meaning?" : 
  currentSession.readingType ? `What is the ${currentSession.readingType} reading?` : "What is the reading?"}**

---

Level ${currentSession.subject.data.level} ${currentSession.subject.object} • Progress: ${progress}
  `;

  // Directly show the answer form instead of Detail view
  return (
    <AnswerForm
      session={currentSession}
      onSubmit={handleSubmit}
      isCorrect={false}
      correctAnswers={getAcceptedAnswers()}
      progress={progress}
    />
  );
  
  async function handleSubmit(userAnswer: string) {
    const normalizedAnswer = userAnswer.trim().toLowerCase();
    let correct = false;

    if (currentSession.questionType === "meaning") {
      // Check official meanings
      correct = currentSession.subject.data.meanings.some(m => 
        m.accepted_answer && m.meaning.toLowerCase() === normalizedAnswer
      );
      
      // Also check study material synonyms if not already correct
      if (!correct && currentSession.studyMaterial?.data.meaning_synonyms) {
        correct = currentSession.studyMaterial.data.meaning_synonyms.some(synonym =>
          synonym.toLowerCase() === normalizedAnswer
        );
      }
    } else {
      // For reading questions, check for the specific reading type if specified
      if (currentSession.readingType) {
        correct = currentSession.subject.data.readings!.some(r => 
          r.accepted_answer && r.reading === normalizedAnswer && r.type === currentSession.readingType
        );
      } else {
        correct = currentSession.subject.data.readings!.some(r => 
          r.accepted_answer && r.reading === normalizedAnswer
        );
      }
    }

    if (!correct) {
      if (currentSession.questionType === "meaning") {
        currentSession.incorrectMeaningAnswers++;
      } else {
        currentSession.incorrectReadingAnswers++;
      }
    }

    if (currentIndex < sessions.length - 1) {
      push(<ReviewScreen sessions={sessions} startIndex={currentIndex + 1} />);
    } else {
      await submitAllReviews();
    }
  }
}

interface AnswerFormProps {
  session: ReviewSession;
  onSubmit: (answer: string) => Promise<void>;
  isCorrect: boolean;
  correctAnswers: string;
  progress?: string;
}

function AnswerForm({ session, onSubmit, correctAnswers, progress }: AnswerFormProps) {
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!answer.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter an answer" });
      return;
    }

    const normalizedAnswer = answer.trim().toLowerCase();
    let correct = false;

    if (session.questionType === "meaning") {
      // Check official meanings
      correct = session.subject.data.meanings.some(m => 
        m.accepted_answer && m.meaning.toLowerCase() === normalizedAnswer
      );
      
      // Also check study material synonyms if not already correct
      if (!correct && session.studyMaterial?.data.meaning_synonyms) {
        correct = session.studyMaterial.data.meaning_synonyms.some(synonym =>
          synonym.toLowerCase() === normalizedAnswer
        );
      }
    } else {
      // For reading questions, check for the specific reading type if specified
      if (session.readingType) {
        correct = session.subject.data.readings!.some(r => 
          r.accepted_answer && r.reading === normalizedAnswer && r.type === session.readingType
        );
      } else {
        correct = session.subject.data.readings!.some(r => 
          r.accepted_answer && r.reading === normalizedAnswer
        );
      }
    }

    setIsCorrect(correct);
    setShowResult(true);
  }

  async function handleContinue() {
    setIsSubmitting(true);
    await onSubmit(answer);
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={progress ? `Review (${progress})` : "Review"}
      actions={
        <ActionPanel>
          {!showResult ? (
            <Action.SubmitForm title="Submit Answer" onSubmit={handleSubmit} shortcut={{ modifiers: [], key: "return" }} />
          ) : (
            <Action title="Continue" onAction={handleContinue} shortcut={{ modifiers: [], key: "return" }} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description 
        title={`${session.subject.object === "radical" ? "🔵 Radical" : 
          session.subject.object === "kanji" ? "🩷 Kanji" : 
          "🟣 Vocabulary"} • Level ${session.subject.data.level}`}
        text={`

        ${session.subject.data.characters}

`}
      />
      
      <Form.Description 
        title="Question"
        text={session.questionType === "meaning" ? "What is the meaning?" : 
          session.readingType ? `What is the ${session.readingType} reading?` : "What is the reading?"}
      />
      
      <Form.TextField
        id="answer"
        title="Your Answer"
        placeholder={session.questionType === "meaning" ? "Enter meaning" : "Enter reading (hiragana)"}
        value={answer}
        onChange={setAnswer}
        autoFocus={true}
      />
      
      {showResult && (
        <>
          <Form.Separator />
          <Form.Description 
            title="Result" 
            text={isCorrect ? "✅ Correct!" : "❌ Incorrect"} 
          />
          {!isCorrect && (
            <Form.Description 
              title="Correct Answer" 
              text={correctAnswers} 
            />
          )}
          
          {/* Display study material notes if available */}
          {session.studyMaterial && (
            <>
              {session.studyMaterial.data.meaning_note && session.questionType === "meaning" && (
                <Form.Description 
                  title="💡 Meaning Note" 
                  text={session.studyMaterial.data.meaning_note} 
                />
              )}
              {session.studyMaterial.data.reading_note && session.questionType === "reading" && (
                <Form.Description 
                  title="💡 Reading Note" 
                  text={session.studyMaterial.data.reading_note} 
                />
              )}
              {session.studyMaterial.data.meaning_synonyms.length > 0 && session.questionType === "meaning" && (
                <Form.Description 
                  title="📝 Your Synonyms" 
                  text={session.studyMaterial.data.meaning_synonyms.join(", ")} 
                />
              )}
            </>
          )}
        </>
      )}
    </Form>
  );
}