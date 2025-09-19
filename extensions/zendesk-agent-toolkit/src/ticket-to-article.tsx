import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Form, popToRoot, List } from "@raycast/api";
import { zdFetch } from "./zendesk";
import { ticketToArticleService } from "./ticket-to-article-service";
import {
  CategorySectionDropdowns,
  FormSection,
  FormSeparator,
  showErrorToast,
  handleError,
  withErrorHandling,
} from "./components/common";

interface TicketToArticleProps {
  ticketId: number;
  ticketSubject: string;
}

interface Section {
  id: number;
  name: string;
  description: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function TicketToArticle({ ticketId, ticketSubject }: TicketToArticleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSections(selectedCategoryId);
    } else {
      setSections([]);
      setSelectedSectionId("");
    }
  }, [selectedCategoryId]);

  async function loadCategories() {
    try {
      const response = await zdFetch<{ categories: Category[] }>("/api/v2/help_center/categories.json");
      setCategories(response.categories);
    } catch (error) {
      await handleError(error, "Load categories");
    }
  }

  async function loadSections(categoryId: string) {
    try {
      const response = await zdFetch<{ sections: Section[] }>(
        `/api/v2/help_center/categories/${categoryId}/sections.json`,
      );
      setSections(response.sections);
    } catch (error) {
      await handleError(error, "Load sections");
    }
  }

  async function handleSubmit() {
    // Debug: Check what's happening with the API key
    console.log("Checking if service is enabled...");
    const isEnabled = ticketToArticleService.isEnabled();
    console.log("Service enabled:", isEnabled);

    if (!isEnabled) {
      await showErrorToast(
        "OpenAI API Key Required",
        "Please configure your OpenAI API key in extension preferences. Check console for debug info.",
      );
      return;
    }

    if (!selectedSectionId) {
      await showErrorToast("Section Required", "Please select a section for the new article");
      return;
    }

    setIsLoading(true);

    const result = await withErrorHandling(
      async () => {
        return await ticketToArticleService.convertTicketToArticle(ticketId, parseInt(selectedSectionId));
      },
      "Create article",
      {
        showSuccess: true,
        successMessage: "Article created as a draft for review",
      },
    );

    if (result) {
      popToRoot();
    }

    setIsLoading(false);
  }

  if (!ticketToArticleService.isEnabled()) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Configure OpenAI API Key" url="raycast://extensions/preferences" />
          </ActionPanel>
        }
      >
        <Form.Description
          title="OpenAI API Key Required"
          text="This feature requires an OpenAI API key to analyze tickets and generate articles. Please configure your API key in the extension preferences."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Article" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <FormSection
        title="Convert Ticket to Article"
        description={`This will analyze ticket #${ticketId} "${ticketSubject}" and automatically generate a comprehensive help center article using AI.`}
      >
        <CategorySectionDropdowns
          categories={categories}
          sections={sections}
          selectedCategoryId={selectedCategoryId}
          selectedSectionId={selectedSectionId}
          onCategoryChange={setSelectedCategoryId}
          onSectionChange={setSelectedSectionId}
          categoryTitle="Target Category"
          sectionTitle="Target Section"
          categoryPlaceholder="Select a category..."
          sectionPlaceholder="Select a section..."
        />
      </FormSection>

      <FormSeparator />

      <Form.Description
        title="What This Will Do"
        text="• Analyze the complete ticket conversation including all comments and attachments
• Extract key information about the issue and resolution
• Generate a well-structured article with step-by-step instructions
• Include relevant tags and categorization
• Create the article as a draft for your review
• Reference any images or attachments from the ticket"
      />

      <Form.Description
        title="Note"
        text="The generated article will be created as a draft so you can review and edit it before publishing. All inline images and attachments will be referenced in the article content."
      />
    </Form>
  );
}

// Component for showing ticket-to-article action in ticket list
export function TicketToArticleAction({ ticketId, ticketSubject }: { ticketId: number; ticketSubject: string }) {
  return (
    <Action.Push
      title="Convert to Article"
      icon="📄"
      target={<TicketToArticle ticketId={ticketId} ticketSubject={ticketSubject} />}
      shortcut={{ modifiers: ["cmd"], key: "a" }}
    />
  );
}

// Preview component to show what will be extracted
export function TicketAnalysisPreview({ ticketId }: { ticketId: number }) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<{
    commentCount: number;
    imageCount: number;
    participants: number;
    publicComments: number;
  } | null>(null);

  useEffect(() => {
    analyzeTicket();
  }, [ticketId]);

  async function analyzeTicket() {
    try {
      const conversation = await ticketToArticleService.getTicketConversation(ticketId);
      const images = ticketToArticleService.extractImages(conversation.comments);

      setAnalysis({
        commentCount: conversation.comments.length,
        imageCount: images.length,
        participants: conversation.users.length,
        publicComments: conversation.comments.filter((c) => c.public).length,
      });
    } catch (error) {
      console.error("Failed to analyze ticket:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !analysis) {
    return <List.Item title="Analyzing ticket..." icon="⏳" />;
  }

  return (
    <List.Item
      title="Ticket Analysis"
      subtitle={`${analysis.publicComments} public comments, ${analysis.imageCount} images, ${analysis.participants} participants`}
      icon="📊"
      accessories={[{ text: `${analysis.commentCount} total comments` }]}
    />
  );
}
