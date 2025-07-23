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
        // Hybrid approach: Detect if user has manually overridden any form fields
        const hasManualDate = values.date && (!parsedData.parsedDate || values.date.getTime() !== parsedData.parsedDate.getTime());
        const hasManualDeadline = values.deadline && (!parsedData.parsedDeadline || values.deadline.getTime() !== parsedData.parsedDeadline.getTime());
        const hasManualPriority = values.priority && parseInt(values.priority) !== parsedData.priority;
        const hasManualProject = values.projectId && values.projectId !== parsedData.projectId;
        const hasManualLabels = values.labels && values.labels.some(label => !parsedData.labels?.includes(label));
        const hasManualSection = values.sectionId && values.sectionId !== "";
        const hasManualResponsible = values.responsibleUid && values.responsibleUid !== "";
        const hasManualParent = values.parentId && values.parentId !== "";
        const hasDuration = values.duration && values.duration !== "";
        const hasFiles = values.files && values.files.length > 0;

        const hasManualOverrides = hasManualDate || hasManualDeadline || hasManualPriority || 
                                  hasManualProject || hasManualLabels || hasManualSection || 
                                  hasManualResponsible || hasManualParent || hasDuration || hasFiles;

        let id: string;

        if (hasManualOverrides) {
          // Use addTask API with explicit parameters when user has manual overrides
          const taskData = await addTask({
            content: values.content,
            description: values.description || undefined,
            
            // Manual values override NLP, fallback to NLP if no manual value
            due: values.date ? { date: values.date.toISOString() } : 
                 parsedData.parsedDate ? { date: parsedData.parsedDate.toISOString() } : undefined,
            
            deadline: values.deadline ? { date: values.deadline.toISOString() } :
                     parsedData.parsedDeadline ? { date: parsedData.parsedDeadline.toISOString() } : undefined,
            
            priority: parseInt(values.priority) || parsedData.priority || undefined,
            project_id: values.projectId || parsedData.projectId || undefined,
            section_id: values.sectionId || undefined,
            parent_id: values.parentId || undefined,
            responsible_uid: values.responsibleUid || undefined,
            
            // Merge labels: manual + NLP labels (remove duplicates)
            labels: [...new Set([
              ...(values.labels || []),
              ...(parsedData.labels || [])
            ])],
            
            // Duration only if specified
            duration: values.duration ? {
              unit: "minute" as const,
              amount: parseInt(values.duration, 10)
            } : undefined,
          }, { data, setData });
          
          id = taskData.id || "";
        } else {
          // Use quickAddTask API for pure NLP parsing when no manual overrides
          const taskData = await quickAddTask({
            text: values.content,
            note: values.description || undefined,
          });
          
          id = taskData.id;
        }

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

  // Detect manual field changes and update tracking
  useEffect(() => {
    const now = Date.now();
    const prev = prevValuesRef.current;
    
    // Detect manual priority change
    if (values.priority !== prev.priority) {
      lastActionRef.current.priority = { source: 'manual', timestamp: now };
    }
    
    // Detect manual project change
    if (values.projectId !== prev.projectId) {
      lastActionRef.current.projectId = { source: 'manual', timestamp: now };
    }
    
    // Detect manual date change
    if (values.date?.getTime() !== prev.date?.getTime()) {
      lastActionRef.current.date = { source: 'manual', timestamp: now };
    }
    
    // Detect manual deadline change
    if (values.deadline?.getTime() !== prev.deadline?.getTime()) {
      lastActionRef.current.deadline = { source: 'manual', timestamp: now };
    }
    
    // Detect manual labels change
    if (JSON.stringify(values.labels) !== JSON.stringify(prev.labels)) {
      lastActionRef.current.labels = { source: 'manual', timestamp: now };
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
        info="Natural language parsing: p1-p4 (priority), #project or #&quot;Project Name&quot;, @label or @&quot;Label Name&quot;, natural dates (tomorrow, monday at 2pm), {deadline}. Fields auto-update as you type or remove parameters. Last action wins - manual field changes or typing take precedence based on timing."
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
