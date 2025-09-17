import { Action, ActionPanel, List, showToast, Toast, Form, popToRoot } from "@raycast/api";
import { readFileSync } from "fs";

import React, { useEffect, useState } from "react";
import { zdFetch } from "./zendesk";

interface Article {
  id: number;
  title: string;
  html_url: string;
  updated_at: string;
}
interface ArticleSearch {
  results: Article[];
}

interface Section {
  id: number;
  name: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
}

interface SectionsResponse {
  sections: Section[];
}

interface CategoriesResponse {
  categories: Category[];
}

export default function Articles() {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);

  async function search(q: string) {
    if (!q) return;
    setLoading(true);
    try {
      const res = await zdFetch<ArticleSearch>(
        `/api/v2/help_center/articles/search.json?query=${encodeURIComponent(q)}`,
      );
      setArticles(res.results);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to search articles", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search("getting started");
  }, []);

  return (
    <List
      isLoading={loading}
      onSearchTextChange={search}
      throttle
      searchBarPlaceholder="Search Help Center…"
      actions={
        <ActionPanel>
          <Action.Push title="Create Article from Markdown" target={<CreateArticleForm />} />
        </ActionPanel>
      }
    >
      {articles.map((a: Article) => (
        <List.Item
          key={a.id}
          title={a.title}
          accessories={[{ date: new Date(a.updated_at) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={a.html_url} />
              <Action.CopyToClipboard title="Copy Article URL" content={a.html_url} />
              <Action.Push title="Create Article from Markdown" target={<CreateArticleForm />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateArticleForm() {
  const [title, setTitle] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

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
      const data = await zdFetch<CategoriesResponse>("/api/v2/help_center/categories.json");
      setCategories(data.categories);
      if (data.categories.length > 0) {
        setSelectedCategoryId(data.categories[0].id.toString());
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load categories",
        message: String(e),
      });
    }
  }

  async function loadSections(categoryId: string) {
    try {
      const data = await zdFetch<SectionsResponse>(`/api/v2/help_center/categories/${categoryId}/sections.json`);
      setSections(data.sections);
      if (data.sections.length > 0) {
        setSelectedSectionId(data.sections[0].id.toString());
      } else {
        setSelectedSectionId("");
      }
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sections",
        message: String(e),
      });
    }
  }

  async function handleMarkdownUpload(filePaths: string[]) {
    if (filePaths.length === 0) return;

    const filePath = filePaths[0];
    const fileName = filePath.split("/").pop() || "article";

    try {
      // Check if it's a markdown file
      if (!fileName.toLowerCase().endsWith(".md") && !fileName.toLowerCase().endsWith(".markdown")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid file type",
          message: "Please select a Markdown file (.md or .markdown)",
        });
        return;
      }

      // Read file content using Node.js fs
      const content = readFileSync(filePath, "utf8");

      // Extract title from filename or first H1
      const firstLine = content.split("\n")[0];
      const extractedTitle = firstLine.startsWith("# ")
        ? firstLine.substring(2).trim()
        : fileName.replace(/\.(md|markdown)$/i, "");

      setTitle(extractedTitle);
      setMarkdownContent(content);
      setFileLoaded(true);

      await showToast({
        style: Toast.Style.Success,
        title: "Markdown file loaded",
        message: `Loaded: ${fileName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load file",
        message: `Could not read file: ${String(error)}`,
      });
    }
  }

  function convertMarkdownToHTML(markdown: string): string {
    // Basic markdown to HTML conversion
    // This is a simple implementation - for production, consider using a library like marked
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/__(.*?)__/gim, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/_(.*?)_/gim, "<em>$1</em>")
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`([^`]*)`/gim, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]*)\]\(([^)]*)\)/gim, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n$/gim, "<br>")
      .replace(/\n/gim, "<br>\n")
      // Lists (basic)
      .replace(/^\* (.*$)/gim, "<li>$1</li>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li>$1</li>");

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

    return html;
  }

  async function createArticle() {
    if (!title.trim() || !markdownContent.trim() || !selectedCategoryId || !selectedSectionId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please provide title, content, select a category and section",
      });
      return;
    }

    setLoading(true);
    await showToast({ style: Toast.Style.Animated, title: "Creating article..." });

    try {
      const htmlContent = convertMarkdownToHTML(markdownContent);

      // Match the working Python structure
      const articleData = {
        article: {
          title: title,
          body: htmlContent,
          locale: "en-us",
          // These values should come from preferences or be configurable
          permission_group_id: 1882214, // TODO: Make this configurable
          user_segment_id: isPublic ? null : 933727, // TODO: Make this configurable
        },
        notify_subscribers: false,
      };

      const response = await zdFetch<{ article: Article }>(
        `/api/v2/help_center/en-us/sections/${selectedSectionId}/articles.json`,
        {
          method: "POST",
          body: JSON.stringify(articleData),
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Article created successfully!",
        message: `Article ID: ${response.article.id} (${isPublic ? "Published" : "Draft - Set permissions in Zendesk"})`,
      });

      // Clear form
      setTitle("");
      setMarkdownContent("");
      setFileLoaded(false);
      setIsPublic(true); // Reset to public by default
      // Keep category/section selections for convenience

      // Navigate back to article list
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create article",
        message: String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Article" onSubmit={createArticle} />
        </ActionPanel>
      }
    >
      <Form.Description title="Create Help Center Article" text="Upload a Markdown file to create a new article" />

      <Form.FilePicker
        id="markdown"
        title="📄 Markdown File"
        allowMultipleSelection={false}
        value={[]}
        onChange={handleMarkdownUpload}
        canChooseDirectories={false}
        canChooseFiles={true}
        showHiddenFiles={false}
        info="Click to select .md file or drag onto Raycast"
      />

      <Form.TextField
        id="title"
        title="Article Title"
        value={title}
        onChange={setTitle}
        placeholder="Enter article title..."
      />

      <Form.Checkbox
        id="visibility"
        label="Publish Article"
        value={isPublic}
        onChange={setIsPublic}
        info="When checked, article will be published immediately. When unchecked, article will be saved as a draft for you to set permissions manually in Zendesk."
      />

      <Form.Dropdown id="category" title="Category" value={selectedCategoryId} onChange={setSelectedCategoryId}>
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id.toString()} title={category.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="section"
        title="Section"
        value={selectedSectionId}
        onChange={setSelectedSectionId}
        isLoading={Boolean(selectedCategoryId) && sections.length === 0}
      >
        {sections.map((section) => (
          <Form.Dropdown.Item key={section.id} value={section.id.toString()} title={section.name} />
        ))}
        {sections.length === 0 && selectedCategoryId && (
          <Form.Dropdown.Item value="" title="No sections available in this category" />
        )}
      </Form.Dropdown>

      <Form.TextArea
        id="content"
        title="Markdown Content"
        value={markdownContent}
        onChange={setMarkdownContent}
        placeholder="Markdown content will appear here after file upload, or you can type directly..."
        enableMarkdown={true}
      />

      {fileLoaded && markdownContent && (
        <Form.Description
          title="File Status"
          text={`✅ Markdown file loaded (${markdownContent.split("\n").length} lines)`}
        />
      )}

      {title && <Form.Description title="Extracted Title" text={`📄 Title: "${title}"`} />}

      <Form.Description
        title="Article Status"
        text={`${isPublic ? "✅ Will be published immediately" : "📝 Will be saved as draft (set permissions in Zendesk)"}`}
      />

      {markdownContent && <Form.Separator />}

      {markdownContent && (
        <Form.Description
          title="HTML Preview"
          text={`The markdown will be converted to HTML. First 200 characters:\n\n${convertMarkdownToHTML(
            markdownContent,
          )
            .substring(0, 200)
            .replace(/<[^>]*>/g, "")}${markdownContent.length > 200 ? "..." : ""}`}
        />
      )}
    </Form>
  );
}
