import { ActionPanel, Action, Form, showToast, Toast, useNavigation, List, Icon, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import { WaniKaniClient } from "./api/client";
import { Subject, Assignment } from "./types/wanikani";

interface LessonSession {
  subject: Subject;
  assignment: Assignment;
  phase: "learn" | "quiz";
  quizType?: "meaning" | "reading";
  incorrectAnswers: number;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [lessonSessions, setLessonSessions] = useState<LessonSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      setIsLoading(true);
      const client = new WaniKaniClient();
      
      const summary = await client.getSummary();
      const availableLessons = summary.data.lessons.filter(l => new Date(l.available_at) <= new Date());
      
      if (availableLessons.length === 0) {
        showToast({ style: Toast.Style.Success, title: "No lessons available" });
        setIsLoading(false);
        return;
      }

      const subjectIds = availableLessons.flatMap(l => l.subject_ids).slice(0, 5);
      const [subjects, assignments] = await Promise.all([
        client.getSubjects(subjectIds),
        client.getLessonAssignments(subjectIds),
      ]);

      const sessions: LessonSession[] = [];
      
      for (const assignment of assignments) {
        const subject = subjects.find(s => s.id === assignment.data.subject_id);
        if (!subject) continue;

        sessions.push({
          subject,
          assignment,
          phase: "learn",
          incorrectAnswers: 0,
        });
      }

      setLessonSessions(sessions);
      setIsLoading(false);

      if (sessions.length > 0) {
        push(<LessonView sessions={sessions} />);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lessons");
      setIsLoading(false);
      showToast({ style: Toast.Style.Failure, title: "Failed to load lessons", message: err instanceof Error ? err.message : undefined });
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

  if (lessonSessions.length === 0) {
    return (
      <List>
        <List.EmptyView title="No Lessons Available" description="You have no lessons available at this time." icon={Icon.CheckCircle} />
      </List>
    );
  }

  return null;
}

interface LessonViewProps {
  sessions: LessonSession[];
}

function LessonView({ sessions }: LessonViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { push } = useNavigation();
  
  const currentSession = sessions[currentIndex];
  const progress = `${currentIndex + 1} / ${sessions.length}`;

  const handleNext = () => {
    const quizSessions: LessonSession[] = [];
    
    for (const session of sessions.slice(0, currentIndex + 1)) {
      if (session.subject.data.meanings.length > 0) {
        quizSessions.push({
          ...session,
          phase: "quiz",
          quizType: "meaning",
        });
      }
      
      if (session.subject.object !== "radical" && session.subject.data.readings && session.subject.data.readings.length > 0) {
        quizSessions.push({
          ...session,
          phase: "quiz",
          quizType: "reading",
        });
      }
    }
    
    if (currentIndex < sessions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      quizSessions.sort(() => Math.random() - 0.5);
      push(<LessonQuiz sessions={quizSessions} />);
    }
  };

  const getMeanings = () => {
    return currentSession.subject.data.meanings
      .filter(m => m.primary)
      .map(m => m.meaning)
      .join(", ");
  };

  const getReadings = () => {
    if (!currentSession.subject.data.readings) return "N/A";
    return currentSession.subject.data.readings
      .filter(r => r.primary)
      .map(r => `${r.reading} (${r.type})`)
      .join(", ");
  };

  const markdown = `
<div style="text-align: center; margin: 40px 0;">
  <h1 style="font-size: 120px; line-height: 1; margin: 0;">
    ${currentSession.subject.data.characters}
  </h1>
</div>

**Type:** ${currentSession.subject.object}  
**Level:** ${currentSession.subject.data.level}

## Meanings
${getMeanings()}

## Readings
${getReadings()}

---

*Progress: ${progress}*
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Lesson (${progress})`}
      actions={
        <ActionPanel>
          <Action title={currentIndex < sessions.length - 1 ? "Next Lesson" : "Start Quiz"} onAction={handleNext} />
        </ActionPanel>
      }
    />
  );
}

interface LessonQuizProps {
  sessions: LessonSession[];
}

function LessonQuiz({ sessions }: LessonQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  const currentSession = sessions[currentIndex];
  const progress = `${currentIndex + 1} / ${sessions.length}`;

  async function handleSubmit() {
    if (!answer.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter an answer" });
      return;
    }

    const normalizedAnswer = answer.trim().toLowerCase();
    let correct = false;

    if (currentSession.quizType === "meaning") {
      correct = currentSession.subject.data.meanings.some(m => 
        m.accepted_answer && m.meaning.toLowerCase() === normalizedAnswer
      );
    } else {
      correct = currentSession.subject.data.readings!.some(r => 
        r.accepted_answer && r.reading === normalizedAnswer
      );
    }

    setIsCorrect(correct);
    setShowResult(true);

    if (!correct) {
      currentSession.incorrectAnswers++;
      
      const retrySession = { ...currentSession };
      sessions.push(retrySession);
    }
  }

  async function handleNext() {
    if (showResult && currentIndex === sessions.length - 1) {
      await startAssignments();
    } else if (showResult) {
      setCurrentIndex(currentIndex + 1);
      setAnswer("");
      setShowResult(false);
    }
  }

  async function startAssignments() {
    setIsSubmitting(true);
    const client = new WaniKaniClient();
    
    try {
      const uniqueAssignments = new Set<number>();
      for (const session of sessions) {
        uniqueAssignments.add(session.assignment.id);
      }

      for (const assignmentId of uniqueAssignments) {
        await client.startAssignment(assignmentId);
      }

      showToast({ style: Toast.Style.Success, title: "Lessons completed!" });
      pop();
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "Failed to start assignments", message: err instanceof Error ? err.message : undefined });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getAcceptedAnswers = () => {
    if (currentSession.quizType === "meaning") {
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
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Lesson Quiz (${progress})`}
      actions={
        <ActionPanel>
          {!showResult ? (
            <Action.SubmitForm title="Submit Answer" onSubmit={handleSubmit} shortcut={{ modifiers: [], key: "return" }} />
          ) : (
            <Action title={currentIndex === sessions.length - 1 ? "Finish" : "Next"} onAction={handleNext} shortcut={{ modifiers: [], key: "return" }} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text={`Level ${currentSession.subject.data.level} ${currentSession.subject.object}`} />
      
      <Form.Separator />
      
      <Form.Description 
        title="　　　　　　　　　　"
        text={`　　　　${currentSession.subject.data.characters}　　　　`} 
      />
      
      <Form.Separator />
      
      <Form.Description 
        title="Question" 
        text={currentSession.quizType === "meaning" ? "What is the meaning?" : "What is the reading?"} 
      />
      
      <Form.TextField
        id="answer"
        title="Your Answer"
        placeholder={currentSession.quizType === "meaning" ? "Enter meaning" : "Enter reading (hiragana)"}
        value={answer}
        onChange={setAnswer}
        autoFocus={true}
      />
      
      {showResult && (
        <>
          <Form.Separator />
          <Form.Description 
            title="Result" 
            text={isCorrect ? "✅ Correct!" : "❌ Incorrect - Try again later"} 
          />
          {!isCorrect && (
            <Form.Description 
              title="Correct Answer" 
              text={getAcceptedAnswers()} 
            />
          )}
        </>
      )}
    </Form>
  );
}