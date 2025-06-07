import { ActionPanel, Action, Form, showToast, Toast, useNavigation, List, Icon, Detail } from "@raycast/api";
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

      const sessions: ReviewSession[] = [];
      
      for (const assignment of assignments) {
        const subject = subjects.find(s => s.id === assignment.data.subject_id);
        if (!subject) continue;

        // Add meaning question for all items that have meanings
        if (subject.data.meanings.length > 0) {
          sessions.push({
            subject,
            assignment,
            questionType: "meaning",
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
          });
        }

        // Add reading question for kanji and vocabulary (not radicals)
        if (subject.object !== "radical" && subject.data.readings && subject.data.readings.length > 0) {
          sessions.push({
            subject,
            assignment,
            questionType: "reading",
            incorrectMeaningAnswers: 0,
            incorrectReadingAnswers: 0,
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
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const { push, pop } = useNavigation();

  const currentSession = sessions[currentIndex];
  const progress = `${currentIndex + 1} / ${sessions.length}`;

  async function handleAnswerSubmit() {
    push(
      <AnswerForm
        session={currentSession}
        onSubmit={async (userAnswer) => {
          const normalizedAnswer = userAnswer.trim().toLowerCase();
          let correct = false;

          if (currentSession.questionType === "meaning") {
            correct = currentSession.subject.data.meanings.some(m => 
              m.accepted_answer && m.meaning.toLowerCase() === normalizedAnswer
            );
          } else {
            correct = currentSession.subject.data.readings!.some(r => 
              r.accepted_answer && r.reading === normalizedAnswer
            );
          }

          if (!correct) {
            if (currentSession.questionType === "meaning") {
              currentSession.incorrectMeaningAnswers++;
            } else {
              currentSession.incorrectReadingAnswers++;
            }
          }

          pop();

          if (currentIndex < sessions.length - 1) {
            push(<ReviewScreen sessions={sessions} startIndex={currentIndex + 1} />);
          } else {
            await submitAllReviews();
          }
        }}
        isCorrect={isCorrect}
        correctAnswers={getAcceptedAnswers()}
      />
    );
  }

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
      return currentSession.subject.data.meanings
        .filter(m => m.accepted_answer)
        .map(m => m.meaning)
        .join(", ");
    } else {
      return currentSession.subject.data.readings!
        .filter(r => r.accepted_answer)
        .map(r => r.reading)
        .join(", ");
    }
  }

  const markdown = `
# ${currentSession.subject.data.characters}

**${currentSession.questionType === "meaning" ? "What is the meaning?" : "What is the reading?"}**

---

Level ${currentSession.subject.data.level} ${currentSession.subject.object} • Progress: ${progress}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Review (${progress})`}
      actions={
        <ActionPanel>
          <Action title="Answer" onAction={handleAnswerSubmit} />
        </ActionPanel>
      }
    />
  );
}

interface AnswerFormProps {
  session: ReviewSession;
  onSubmit: (answer: string) => Promise<void>;
  isCorrect: boolean;
  correctAnswers: string;
}

function AnswerForm({ session, onSubmit, correctAnswers }: AnswerFormProps) {
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
      correct = session.subject.data.meanings.some(m => 
        m.accepted_answer && m.meaning.toLowerCase() === normalizedAnswer
      );
    } else {
      correct = session.subject.data.readings!.some(r => 
        r.accepted_answer && r.reading === normalizedAnswer
      );
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
        title="Character"
        text={session.subject.data.characters}
      />
      
      <Form.Description 
        title="Question"
        text={session.questionType === "meaning" ? "What is the meaning?" : "What is the reading?"}
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
        </>
      )}
    </Form>
  );
}