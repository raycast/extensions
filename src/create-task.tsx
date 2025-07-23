import {
  ActionPanel,
  Form,
  Icon,
  useNavigation,
  closeMainWindow,
  open,
  Toast,
  Action,
  Color,
  PopToRootType,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";

import { addComment, addTask, quickAddTask, uploadFile } from "./api";
import RefreshAction from "./components/RefreshAction";
import TaskDetail from "./components/TaskDetail";
import { getCollaboratorIcon, getProjectCollaborators } from "./helpers/collaborators";
import { getColorByKey } from "./helpers/colors";
import { priorities } from "./helpers/priorities";
import { getPriorityIcon } from "./helpers/priorities";
import { getProjectIcon } from "./helpers/projects";
import { getTaskAppUrl, getTaskUrl } from "./helpers/tasks";
import { withTodoistApi } from "./helpers/withTodoistApi";
import { isTodoistInstalled } from "./hooks/useIsTodoistInstalled";
import { useNLPParser } from "./hooks/useNLPParser";
import useSyncData from "./hooks/useSyncData";

type CreateTaskValues = {
  content: string;
  description: string;
  date: Date | null;
  deadline: Date | null;
  duration: string;
  priority: string;
  projectId: string;
  sectionId: string;
  labels: string[];
  parentId: string;
  responsibleUid: string;
  files: string[];
};

type CreateTaskProps = {
  fromLabel?: string;
  fromProjectId?: string;
  fromTodayEmptyView?: boolean;
  draftValues?: CreateTaskValues;
};

function CreateTask({ fromProjectId, fromLabel, fromTodayEmptyView, draftValues }: CreateTaskProps) {
  const { shouldCloseMainWindow } = getPreferenceValues<Preferences.CreateTask>();

  const { push, pop } = useNavigation();

  const { data, setData, isLoading } = useSyncData();

  const labels = data?.labels;
  const projects = data?.projects;
  const sections = data?.sections;

  const lowestPriority = priorities[priorities.length - 1];

  const { handleSubmit, itemProps, values, focus, reset, setValue } = useForm<CreateTaskValues>({
    async onSubmit(values) {
      if (shouldCloseMainWindow) {
        await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      }

      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
      await toast.show();

      try {
        // Always use quickAddTask API for Todoist-like behavior
        // The title will contain all the natural language parameters
        const taskData = await quickAddTask({
          text: values.content,
          note: values.description || undefined,
        });
        
        const id = taskData.id;

        toast.style = Toast.Style.Success;
        toast.title = "Task created";

        if (id) {
          toast.primaryAction = {
            title: "Open Task",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => push(<TaskDetail taskId={id} />),
          };

          const isInstalled = await isTodoistInstalled();
          toast.secondaryAction = {
            title: `Open Task`,
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(isInstalled ? getTaskAppUrl(id) : getTaskUrl(id));
            },
          };

          if (values.files.length > 0) {
            try {
              toast.message = "Uploading file and adding to comment…";
              const file = await uploadFile(values.files[0]);
              await addComment({ item_id: id, file_attachment: file, content: "" }, { data, setData });
              toast.message = "File uploaded and added to comment";
            } catch {
              toast.message = `Failed uploading file and adding to comment`;
            }
          }
        }

        if (fromProjectId) {
          pop();
        }

        reset({
          content: "",
          description: "",
          date: null,
          deadline: null,
          priority: String(lowestPriority.value),
          projectId: "",
          sectionId: "",
          responsibleUid: "",
          labels: [],
          files: [],
          parentId: "",
        });

        focus("content");
      } catch (error) {
        await showFailureToast(error, { title: "Unable to create task" });
      } finally {
        if (shouldCloseMainWindow) {
          await popToRoot();
        }
      }
    },
    initialValues: {
      content: draftValues?.content,
      description: draftValues?.description,
      date: draftValues?.date ?? (fromTodayEmptyView ? new Date() : null),
      deadline: draftValues?.deadline ?? null,
      duration: draftValues?.duration ?? "",
      priority: draftValues?.priority ?? String(lowestPriority.value),
      projectId: draftValues?.projectId ?? fromProjectId ?? "",
      sectionId: draftValues?.sectionId ?? "",
      responsibleUid: draftValues?.responsibleUid ?? "",
      labels: draftValues?.labels ?? (fromLabel ? [fromLabel] : []),
    },
    validation: {
      content: FormValidation.Required,
      duration: (value) => {
        if (value && Number.isNaN(parseInt(value, 10))) {
          return "Duration must be a number";
        }
      },
    },
  });

  // Real-time NLP parsing
  const parsedData = useNLPParser(values.content, projects);

  // Helper functions to update title based on dropdown changes
  const updateTitleWithPriority = (newPriority: string) => {
    let updatedContent = values.content;
    
    // Remove existing priority patterns
    updatedContent = updatedContent.replace(/\bp[1-4]\b/gi, '').replace(/\s+/g, ' ').trim();
    
    // Add new priority if not default
    const priorityNumber = parseInt(newPriority);
    if (priorityNumber && priorityNumber !== lowestPriority.value) {
      // Convert Todoist priority to user format: 4->p1, 3->p2, 2->p3, 1->p4
      const priorityMap: Record<number, string> = { 4: 'p1', 3: 'p2', 2: 'p3', 1: 'p4' };
      const priorityText = priorityMap[priorityNumber];
      if (priorityText) {
        updatedContent = `${updatedContent.trim()} ${priorityText}`.trim();
      }
    }
    
    setValue('content', updatedContent);
  };

  const updateTitleWithProject = (newProjectId: string) => {
    let updatedContent = values.content;
    
    // Remove existing project patterns
    updatedContent = updatedContent.replace(/#(?:"[^"]+"|[a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*)/g, '').replace(/\s+/g, ' ').trim();
    
    // Add new project if selected
    if (newProjectId && projects) {
      const project = projects.find(p => p.id === newProjectId);
      if (project) {
        const projectName = project.name;
        // Use quotes if project name has spaces
        const projectText = projectName.includes(' ') ? `#"${projectName}"` : `#${projectName}`;
        updatedContent = `${updatedContent.trim()} ${projectText}`.trim();
      }
    }
    
    setValue('content', updatedContent);
  };

  const updateTitleWithLabels = (newLabels: string[]) => {
    let updatedContent = values.content;
    
    // Remove existing label patterns
    updatedContent = updatedContent.replace(/@(?:"[^"]+"|[a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*)/g, '').replace(/\s+/g, ' ').trim();
    
    // Add new labels
    if (newLabels && newLabels.length > 0) {
      const labelTexts = newLabels.map(label => {
        // Use quotes if label has spaces
        return label.includes(' ') ? `@"${label}"` : `@${label}`;
      });
      updatedContent = `${updatedContent.trim()} ${labelTexts.join(' ')}`.trim();
    }
    
    setValue('content', updatedContent);
  };

  const updateTitleWithDate = (newDate: Date | null) => {
    let updatedContent = values.content;
    
    // Remove existing date text if we know what it is from the parser
    if (parsedData.dateString) {
      // Create a regex to match the exact date string that was parsed
      const dateRegex = new RegExp(`\\b${parsedData.dateString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      updatedContent = updatedContent.replace(dateRegex, '').replace(/\s+/g, ' ').trim();
    }
    
    // Add new date if provided
    if (newDate) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      let dateText = '';
      if (newDate.toDateString() === today.toDateString()) {
        dateText = 'today';
      } else if (newDate.toDateString() === tomorrow.toDateString()) {
        dateText = 'tomorrow';  
      } else {
        // Format as "Jan 15" or similar
        dateText = newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      
      updatedContent = `${updatedContent.trim()} ${dateText}`.trim();
    }
    
    setValue('content', updatedContent);
  };

  const updateTitleWithDeadline = (newDeadline: Date | null) => {
    let updatedContent = values.content;
    
    // Remove existing deadline patterns
    updatedContent = updatedContent.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
    
    // Add new deadline
    if (newDeadline) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      let deadlineText = '';
      if (newDeadline.toDateString() === today.toDateString()) {
        deadlineText = '{today}';
      } else if (newDeadline.toDateString() === tomorrow.toDateString()) {
        deadlineText = '{tomorrow}';
      } else {
        // Format as "{Jan 15}" or similar
        const dateStr = newDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        deadlineText = `{${dateStr}}`;
      }
      
      updatedContent = `${updatedContent.trim()} ${deadlineText}`.trim();
    }
    
    setValue('content', updatedContent);
  };

  // Track last action timestamps for each field
  // This implements "last action wins" logic where whichever happened most recently
  // (manual field selection or NLP parsing from typing) takes precedence
  // 
  // Example scenarios:
  // 1. User types "tomorrow p1" -> NLP sets date and priority
  // 2. User manually changes priority -> manual priority overrides NLP  
  // 3. User types "friday" -> if typing happened after manual change, NLP wins again
  // 4. This ensures the most recent user intent is always respected
  const lastActionRef = useRef<{
    priority: { source: 'nlp' | 'manual'; timestamp: number };
    projectId: { source: 'nlp' | 'manual'; timestamp: number };
    date: { source: 'nlp' | 'manual'; timestamp: number };
    deadline: { source: 'nlp' | 'manual'; timestamp: number };
    labels: { source: 'nlp' | 'manual'; timestamp: number };
    contentChanged: number; // Track when content was last changed for NLP parsing
  }>({
    priority: { source: 'nlp', timestamp: 0 },
    projectId: { source: 'nlp', timestamp: 0 },
    date: { source: 'nlp', timestamp: 0 },
    deadline: { source: 'nlp', timestamp: 0 },
    labels: { source: 'nlp', timestamp: 0 },
    contentChanged: 0,
  });

  // Previous values to detect manual changes
  const prevValuesRef = useRef(values);

  // Detect manual field changes and update both tracking AND title
  useEffect(() => {
    const now = Date.now();
    const prev = prevValuesRef.current;
    
    // Detect manual priority change
    if (values.priority !== prev.priority) {
      lastActionRef.current.priority = { source: 'manual', timestamp: now };
      // Update title to reflect manual priority change
      if (now - lastActionRef.current.contentChanged > 100) { // Debounce to avoid loops
        updateTitleWithPriority(values.priority);
      }
    }
    
    // Detect manual project change
    if (values.projectId !== prev.projectId) {
      lastActionRef.current.projectId = { source: 'manual', timestamp: now };
      // Update title to reflect manual project change
      if (now - lastActionRef.current.contentChanged > 100) { // Debounce to avoid loops
        updateTitleWithProject(values.projectId);
      }
    }
    
    // Detect manual date change
    if (values.date?.getTime() !== prev.date?.getTime()) {
      lastActionRef.current.date = { source: 'manual', timestamp: now };
      // Update title to reflect manual date change
      if (now - lastActionRef.current.contentChanged > 100) { // Debounce to avoid loops
        updateTitleWithDate(values.date);
      }
    }
    
    // Detect manual deadline change
    if (values.deadline?.getTime() !== prev.deadline?.getTime()) {
      lastActionRef.current.deadline = { source: 'manual', timestamp: now };
      // Update title to reflect manual deadline change
      if (now - lastActionRef.current.contentChanged > 100) { // Debounce to avoid loops
        updateTitleWithDeadline(values.deadline);
      }
    }
    
    // Detect manual labels change
    if (JSON.stringify(values.labels) !== JSON.stringify(prev.labels)) {
      lastActionRef.current.labels = { source: 'manual', timestamp: now };
      // Update title to reflect manual labels change
      if (now - lastActionRef.current.contentChanged > 100) { // Debounce to avoid loops
        updateTitleWithLabels(values.labels);
      }
    }
    
    // Track content changes for NLP timing
    if (values.content !== prev.content) {
      lastActionRef.current.contentChanged = now;
    }
    
    // Update previous values
    prevValuesRef.current = values;
  });

  // Auto-update priority based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.priority.timestamp;
    
    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.priority !== undefined) {
        setValue("priority", String(parsedData.priority));
        lastActionRef.current.priority = { source: 'nlp', timestamp: nlpTimestamp };
      } else {
        // Reset to default priority when parameter is removed from title
        setValue("priority", String(lowestPriority.value));
        lastActionRef.current.priority = { source: 'nlp', timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.priority, setValue, lowestPriority.value]);

  // Auto-update project based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.projectId.timestamp;
    
    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.projectId !== undefined) {
        setValue("projectId", parsedData.projectId);
        lastActionRef.current.projectId = { source: 'nlp', timestamp: nlpTimestamp };
      } else {
        // Reset to "No project" when parameter is removed from title
        setValue("projectId", fromProjectId ?? "");
        lastActionRef.current.projectId = { source: 'nlp', timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.projectId, setValue, fromProjectId]);

  // Auto-update date based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.date.timestamp;
    
    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.parsedDate) {
        setValue("date", parsedData.parsedDate);
        lastActionRef.current.date = { source: 'nlp', timestamp: nlpTimestamp };
      } else {
        // Reset to null/empty when date parameter is removed from title
        setValue("date", fromTodayEmptyView ? new Date() : null);
        lastActionRef.current.date = { source: 'nlp', timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.parsedDate, setValue, fromTodayEmptyView]);

  // Auto-update deadline based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.deadline.timestamp;
    
    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.parsedDeadline) {
        setValue("deadline", parsedData.parsedDeadline);
        lastActionRef.current.deadline = { source: 'nlp', timestamp: nlpTimestamp };
      } else {
        // Reset to null when deadline parameter is removed from title
        setValue("deadline", null);
        lastActionRef.current.deadline = { source: 'nlp', timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.parsedDeadline, setValue]);

  // Track which labels were added via NLP vs manual selection
  const nlpLabelsRef = useRef<string[]>([]);

  // Auto-update labels based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.labels.timestamp;
    
    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      const currentLabels = values.labels || [];
      const initialLabels = fromLabel ? [fromLabel] : [];
      
      if (parsedData.labels && parsedData.labels.length > 0) {
        // Remove old NLP labels and add new ones
        const manualLabels = currentLabels.filter(label => !nlpLabelsRef.current.includes(label));
        const newLabels = [...new Set([...manualLabels, ...parsedData.labels])];
        
        setValue("labels", newLabels);
        nlpLabelsRef.current = parsedData.labels;
        lastActionRef.current.labels = { source: 'nlp', timestamp: nlpTimestamp };
      } else {
        // Remove only NLP-added labels when all label parameters are removed from title
        const manualLabels = currentLabels.filter(label => !nlpLabelsRef.current.includes(label));
        const resetLabels = [...new Set([...initialLabels, ...manualLabels])];
        
        setValue("labels", resetLabels);
        nlpLabelsRef.current = [];
        lastActionRef.current.labels = { source: 'nlp', timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.labels, setValue, values.labels, fromLabel]);

  const projectSections = sections?.filter((section) => section.project_id === values.projectId);

  const collaborators = getProjectCollaborators(values.projectId, data);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.Plus} />
          <RefreshAction />
        </ActionPanel>
      }
      enableDrafts={!fromProjectId && !fromTodayEmptyView && !fromLabel}
    >
            <Form.TextField
        {...itemProps.content}
        title="Title"
        placeholder="Buy milk tomorrow p1 #Personal @This Month {march 30}"
        info="Bidirectional natural language parsing: Type parameters in title OR use dropdowns - both update each other. p1-p4 (priority), #project or #&quot;Project Name&quot;, @label or @&quot;Label Name&quot;, natural dates (tomorrow, monday at 2pm), {deadline}. Always uses quickAddTask API like Todoist."
      />

      <Form.TextArea
        {...itemProps.description}
        title="Description"
        placeholder="Apples, pears, and strawberries (Markdown supported)"
        enableMarkdown
      />

      <Form.Separator />

      <Form.DatePicker {...itemProps.date} title="Date" />

      {values.date && !Form.DatePicker.isFullDay(values.date) ? (
        <Form.TextField {...itemProps.duration} title="Duration (minutes)" />
      ) : null}

      {data?.user?.premium_status !== "not_premium" ? (
        <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} />
      ) : null}

      <Form.Dropdown {...itemProps.priority} title="Priority">
        {priorities.map(({ value, name, color, icon }) => (
          <Form.Dropdown.Item
            value={String(value)}
            title={name}
            key={value}
            icon={{ source: icon ? icon : Icon.Dot, tintColor: color }}
          />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown {...itemProps.projectId} title="Project">
          <Form.Dropdown.Item title="No project" value="" icon={Icon.List} />

          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              icon={getProjectIcon(project)}
              title={project.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {projectSections && projectSections.length > 0 ? (
        <Form.Dropdown {...itemProps.sectionId} title="Section">
          <Form.Dropdown.Item
            value=""
            title="No section"
            icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
          />

          {projectSections.map(({ id, name }) => (
            <Form.Dropdown.Item
              key={id}
              value={id}
              title={name}
              icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {collaborators && collaborators.length > 0 ? (
        <Form.Dropdown {...itemProps.responsibleUid} title="Assignee">
          <Form.Dropdown.Item icon={Icon.Person} value="" title="Unassigned" />

          {collaborators.map((collaborator) => (
            <Form.Dropdown.Item
              key={collaborator.id}
              value={collaborator.id}
              title={collaborator.full_name}
              icon={getCollaboratorIcon(collaborator)}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {labels && labels.length > 0 ? (
        <Form.TagPicker {...itemProps.labels} title="Labels">
          {labels.map(({ id, name, color }) => (
            <Form.TagPicker.Item
              key={id}
              value={name}
              title={name}
              icon={{ source: Icon.Tag, tintColor: getColorByKey(color).value }}
            />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.Separator />

      <Form.FilePicker {...itemProps.files} title="File" canChooseDirectories={false} allowMultipleSelection={false} />

      <Form.Dropdown {...itemProps.parentId} title="Parent Task">
        <Form.Dropdown.Item value="" title="None" />

        {data?.items.map((item) => {
          return <Form.Dropdown.Item key={item.id} title={item.content} icon={getPriorityIcon(item)} value={item.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default withTodoistApi(CreateTask);
