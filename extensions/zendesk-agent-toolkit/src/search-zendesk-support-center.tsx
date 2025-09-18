import { Action, ActionPanel, List, showToast, Toast, Form, popToRoot, getPreferenceValues } from "@raycast/api";
import { readFileSync } from "fs";

import React, { useEffect, useState } from "react";
import { zdFetch, promoteArticle, archiveArticle, getArticleDetails } from "./zendesk";
import { ArticleManagementActions } from "./components/common";

interface Article {
  id: number;
  title: string;
  html_url: string;
  updated_at: string;
  section_id: number;
  draft?: boolean;
  archived?: boolean;
  promoted?: boolean;
}

interface ArticleSearch {
  results: Article[];
}

interface ArticlesResponse {
  articles: Article[];
}

interface Section {
  id: number;
  name: string;
  category_id: number;
  description?: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface SectionsResponse {
  sections: Section[];
}

interface CategoriesResponse {
  categories: Category[];
}

type ViewType = "categories" | "sections" | "articles" | "search";

export default function HelpCenter() {
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("categories");
  const [searchMode, setSearchMode] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchResults, setSearchResults] = useState<Article[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  useEffect(() => {
    if (!searchMode) {
      loadCategories();
    }
  }, [searchMode]);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await zdFetch<CategoriesResponse>("/api/v2/help_center/categories.json");
      setCategories(data.categories);
      setViewType("categories");
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load categories",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSections(category: Category) {
    setLoading(true);
    try {
      const data = await zdFetch<SectionsResponse>(`/api/v2/help_center/categories/${category.id}/sections.json`);
      setSections(data.sections);
      setSelectedCategory(category);
      setViewType("sections");
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sections",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadArticles(section: Section) {
    setLoading(true);
    try {
      const data = await zdFetch<ArticlesResponse>(`/api/v2/help_center/en-us/sections/${section.id}/articles.json`);
      setArticles(data.articles);
      setSelectedSection(section);
      setViewType("articles");
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load articles",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function searchArticles(q: string) {
    if (!q) {
      setSearchResults([]);
      setViewType("categories"); // Return to categories when search is cleared
      return;
    }
    setLoading(true);
    try {
      // Try with locale first, then fallback to without locale
      let res;
      try {
        res = await zdFetch<ArticleSearch>(
          `/api/v2/help_center/en-us/articles/search.json?query=${encodeURIComponent(q)}`,
        );
      } catch {
        // Fallback to without locale
        res = await zdFetch<ArticleSearch>(`/api/v2/help_center/articles/search.json?query=${encodeURIComponent(q)}`);
      }

      setSearchResults(res.results);
      setViewType("search");

      // Show toast with result count for debugging
      await showToast({
        style: Toast.Style.Success,
        title: `Found ${res.results.length} articles`,
        message: q.length > 20 ? `"${q.substring(0, 20)}..."` : `"${q}"`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to search articles",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  function getNavigationTitle() {
    if (viewType === "search") return "Search Results";
    if (viewType === "categories") return "Help Center";
    if (viewType === "sections") return selectedCategory?.name || "Sections";
    if (viewType === "articles") return selectedSection?.name || "Articles";
    if (searchMode) return "Search Results";
    return "Help Center";
  }

  async function handlePromoteArticle(articleId: number, articleTitle: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Promoting article...",
      });

      await promoteArticle(articleId);

      await showToast({
        style: Toast.Style.Success,
        title: "Article promoted",
        message: `"${articleTitle}" is now featured on the help center homepage`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to promote article",
        message: String(error),
      });
    }
  }

  async function handleArchiveArticle(articleId: number, articleTitle: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Archiving article...",
      });

      await archiveArticle(articleId);

      await showToast({
        style: Toast.Style.Success,
        title: "Article archived",
        message: `"${articleTitle}" has been archived`,
      });

      // Refresh the current view to reflect the change
      if (searchMode) {
        // Re-run the search to update results
        const currentSearch = searchResults.length > 0 ? searchResults[0].title : "";
        if (currentSearch) {
          searchArticles(currentSearch);
        }
      } else if (viewType === "articles" && selectedSection) {
        loadArticles(selectedSection);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to archive article",
        message: String(error),
      });
    }
  }

  function getBackAction() {
    if (viewType === "search") {
      return (
        <Action
          title="Back to Categories"
          onAction={() => {
            setViewType("categories");
            setSearchResults([]);
          }}
        />
      );
    }

    if (searchMode) {
      return (
        <Action
          title="Back to Categories"
          onAction={() => {
            setSearchMode(false);
            setViewType("categories");
          }}
        />
      );
    }

    if (viewType === "articles") {
      return (
        <Action
          title="Back to Sections"
          onAction={() => {
            setViewType("sections");
          }}
        />
      );
    }

    if (viewType === "sections") {
      return (
        <Action
          title="Back to Categories"
          onAction={() => {
            setViewType("categories");
          }}
        />
      );
    }

    return null;
  }

  const commonActions = (
    <>
      {getBackAction()}
      <Action.Push title="Create Article from Markdown" target={<CreateArticleForm />} />
      <Action
        title={searchMode ? "Browse Categories" : "Search Articles"}
        onAction={() => setSearchMode(!searchMode)}
      />
    </>
  );

  // Search mode
  if (searchMode) {
    return (
      <List
        isLoading={loading}
        onSearchTextChange={searchArticles}
        throttle
        searchBarPlaceholder="Search all articles..."
        navigationTitle={getNavigationTitle()}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      >
        {searchResults.map((article) => (
          <List.Item
            title={article.title}
            accessories={[
              ...(article.draft ? [{ tag: { value: "Draft", color: "#orange" } }] : []),
              ...(article.archived ? [{ tag: { value: "Archived", color: "#gray" } }] : []),
              ...(article.promoted ? [{ tag: { value: "Promoted", color: "#green" } }] : []),

              { date: new Date(article.updated_at) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Article"
                  target={
                    <EditArticleForm
                      articleId={article.id}
                      onPromote={handlePromoteArticle}
                      onArchive={handleArchiveArticle}
                    />
                  }
                />
                <Action.OpenInBrowser url={article.html_url} />

                <Action
                  title="Promote Article"
                  icon="⭐"
                  onAction={() => handlePromoteArticle(article.id, article.title)}
                />
                <Action
                  title="Archive Article"
                  icon="📦"
                  onAction={() => handleArchiveArticle(article.id, article.title)}
                />
                <Action.CopyToClipboard title="Copy Article URL" content={article.html_url} />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Search results view
  if (viewType === "search") {
    return (
      <List
        isLoading={loading}
        searchBarPlaceholder="Search all articles..."
        onSearchTextChange={searchArticles}
        throttle
        navigationTitle={getNavigationTitle()}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      >
        {searchResults.map((article) => (
          <List.Item
            title={article.title}
            accessories={[
              ...(article.draft ? [{ tag: { value: "Draft", color: "#orange" } }] : []),
              ...(article.archived ? [{ tag: { value: "Archived", color: "#gray" } }] : []),
              ...(article.promoted ? [{ tag: { value: "Promoted", color: "#green" } }] : []),

              { date: new Date(article.updated_at) },
            ]}
            actions={
              <ActionPanel>
                <ArticleManagementActions
                  articleId={article.id}
                  articleTitle={article.title}
                  htmlUrl={article.html_url}
                  onEdit={
                    <EditArticleForm
                      articleId={article.id}
                      onPromote={handlePromoteArticle}
                      onArchive={handleArchiveArticle}
                    />
                  }
                  onPromote={handlePromoteArticle}
                  onArchive={handleArchiveArticle}
                />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Categories view
  if (viewType === "categories") {
    return (
      <List
        isLoading={loading}
        navigationTitle={getNavigationTitle()}
        searchBarPlaceholder="Search all articles..."
        onSearchTextChange={searchArticles}
        throttle
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      >
        {categories.map((category) => (
          <List.Item
            title={category.name}
            subtitle={category.description}
            icon="📁"
            actions={
              <ActionPanel>
                <Action title="View Sections" onAction={() => loadSections(category)} />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Sections view
  if (viewType === "sections") {
    return (
      <List
        isLoading={loading}
        navigationTitle={getNavigationTitle()}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      >
        {sections.map((section) => (
          <List.Item
            title={section.name}
            subtitle={section.description}
            icon="📂"
            actions={
              <ActionPanel>
                <Action title="View Articles" onAction={() => loadArticles(section)} />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Articles view
  return (
    <List
      isLoading={loading}
      navigationTitle={getNavigationTitle()}
      actions={<ActionPanel>{commonActions}</ActionPanel>}
    >
      {articles.map((article) => (
        <List.Item
          title={article.title}
          accessories={[
            ...(article.draft ? [{ tag: { value: "Draft", color: "#orange" } }] : []),
            ...(article.archived ? [{ tag: { value: "Archived", color: "#gray" } }] : []),
            ...(article.promoted ? [{ tag: { value: "Promoted", color: "#green" } }] : []),

            { date: new Date(article.updated_at) },
          ]}
          icon="📄"
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Article"
                target={
                  <EditArticleForm
                    articleId={article.id}
                    onPromote={handlePromoteArticle}
                    onArchive={handleArchiveArticle}
                  />
                }
              />
              <Action.OpenInBrowser url={article.html_url} />

              <Action
                title="Promote Article"
                icon="⭐"
                onAction={() => handlePromoteArticle(article.id, article.title)}
              />
              <Action
                title="Archive Article"
                icon="📦"
                onAction={() => handleArchiveArticle(article.id, article.title)}
              />
              <Action.CopyToClipboard title="Copy Article URL" content={article.html_url} />
              {commonActions}
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
  const [, setFileLoaded] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const { permissionGroupId, userSegmentId } = getPreferenceValues() as { permissionGroupId?: string; userSegmentId?: string };

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

    try {
      const filePath = filePaths[0];
      const content = readFileSync(filePath, "utf8");
      setMarkdownContent(content);
      setFileLoaded(true);

      // Extract title from filename if title is empty
      if (!title) {
        const fileName = filePath.split("/").pop() || "";
        const titleFromFile = fileName.replace(/\.(md|txt)$/i, "").replace(/[-_]/g, " ");
        setTitle(titleFromFile);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "File loaded successfully",
        message: `Loaded ${filePath}`,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load file",
        message: String(e),
      });
    }
  }

  function convertMarkdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    let html = markdown
      // Headers
      .replace(/^### (.*)/gm, "<h3>$1</h3>")
      .replace(/^## (.*)/gm, "<h2>$1</h2>")
      .replace(/^# (.*)/gm, "<h1>$1</h1>")
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraphs if not already wrapped
    if (!html.includes("<p>") && !html.includes("<h")) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  async function handleSubmit() {
    if (!title || !markdownContent || !selectedSectionId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing fields",
        message: "Please fill in all required fields",
      });
      return;
    }

    setLoading(true);

    try {
      const htmlContent = convertMarkdownToHtml(markdownContent);

      const articlePayload: any = {
        article: {
          title,
          body: htmlContent,
          draft: !isPublic,
          promoted: false,
          section_id: parseInt(selectedSectionId),
        },
      };

      // Include optional Help Center metadata if configured
      if (permissionGroupId) {
        const pgId = parseInt(String(permissionGroupId), 10);
        if (!isNaN(pgId)) {
          articlePayload.article.permission_group_id = pgId;
        }
      }
      if (!isPublic) {
        // Only apply user segment when not public
        if (userSegmentId) {
          const segId = parseInt(String(userSegmentId), 10);
          if (!isNaN(segId)) {
            articlePayload.article.user_segment_id = segId;
          }
        } else {
          articlePayload.article.user_segment_id = null; // keep private but no specific segment
        }
      } else {
        articlePayload.article.user_segment_id = null; // everyone
      }

      await zdFetch(`/api/v2/help_center/sections/${selectedSectionId}/articles.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(articlePayload),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Article created successfully",
        message: `Article "${title}" has been created`,
      });

      popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create article",
        message: String(e),
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
          <Action.SubmitForm title="Create Article" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Article Title"
        placeholder="Enter article title"
        value={title}
        onChange={setTitle}
      />

      <Form.FilePicker
        id="markdownFile"
        title="Markdown File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        onChange={handleMarkdownUpload}
      />

      <Form.TextArea
        id="content"
        title="Content (Markdown)"
        placeholder="Paste or type your markdown content here..."
        value={markdownContent}
        onChange={setMarkdownContent}
      />

      <Form.Dropdown id="category" title="Category" value={selectedCategoryId} onChange={setSelectedCategoryId}>
        {categories.map((category) => (
          <Form.Dropdown.Item value={category.id.toString()} title={category.name} />
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
          <Form.Dropdown.Item value={section.id.toString()} title={section.name} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="isPublic"
        title="Publish Article"
        label="Make article public immediately"
        value={isPublic}
        onChange={setIsPublic}
      />

      <Form.Description text="Upload a markdown file or paste content directly. The article will be converted to HTML automatically." />
    </Form>
  );
}

function EditArticleForm({
  articleId,
  onPromote,
  onArchive,
}: {
  articleId: number;
  onPromote?: (id: number, title: string) => Promise<void>;
  onArchive?: (id: number, title: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(true);
  const [articleUrl, setArticleUrl] = useState<string>("");

  const { permissionGroupId, userSegmentId } = getPreferenceValues() as { permissionGroupId?: string; userSegmentId?: string };

  useEffect(() => {
    loadArticleData();
    loadCategories();
  }, [articleId]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSections(selectedCategoryId);
    } else {
      setSections([]);
      setSelectedSectionId("");
    }
  }, [selectedCategoryId]);

  async function loadArticleData() {
    setLoading(true);
    try {
      const response = await getArticleDetails(articleId);

      const article = response.article;
      setTitle(article.title);
      setArticleUrl(article.html_url);
      setSelectedSectionId(article.section_id.toString());
      setIsPublic(!article.draft);

      // Convert HTML back to markdown (basic conversion)
      const markdown = htmlToMarkdown(article.body);
      setMarkdownContent(markdown);

      // Load section info to get category
      const sectionResponse = await zdFetch<{ section: { category_id: number } }>(
        `/api/v2/help_center/sections/${article.section_id}.json`,
      );
      setSelectedCategoryId(sectionResponse.section.category_id.toString());
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load article",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data = await zdFetch<CategoriesResponse>("/api/v2/help_center/categories.json");
      setCategories(data.categories);
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
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load sections",
        message: String(e),
      });
    }
  }

  function htmlToMarkdown(html: string): string {
    // Basic HTML to markdown conversion
    return (
      html
        // Headers
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1")
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1")
        // Bold and italic
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
        // Code blocks
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```")
        .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
        // Links
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
        // Paragraphs and line breaks
        .replace(/<\/p><p[^>]*>/gi, "\n\n")
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "")
        .replace(/<br[^>]*>/gi, "\n")
        // Clean up remaining tags
        .replace(/<[^>]*>/g, "")
        // Clean up extra whitespace
        .replace(/\n\n\n+/g, "\n\n")
        .trim()
    );
  }

  function convertMarkdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion (same as CreateArticleForm)
    let html = markdown
      .replace(/^### (.*)/gm, "<h3>$1</h3>")
      .replace(/^## (.*)/gm, "<h2>$1</h2>")
      .replace(/^# (.*)/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    if (!html.includes("<p>") && !html.includes("<h")) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  async function handleSubmit() {
    if (!title || !markdownContent || !selectedSectionId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing fields",
        message: "Please fill in all required fields",
      });
    }

    setLoading(true);

    try {
      const htmlContent = convertMarkdownToHtml(markdownContent);

      const articlePayload: any = {
        article: {
          title,
          body: htmlContent,
          draft: !isPublic,
          section_id: parseInt(selectedSectionId),
        },
      };

      if (permissionGroupId) {
        const pgId = parseInt(String(permissionGroupId), 10);
        if (!isNaN(pgId)) {
          articlePayload.article.permission_group_id = pgId;
        }
      }

      if (!isPublic) {
        if (userSegmentId) {
          const segId = parseInt(String(userSegmentId), 10);
          if (!isNaN(segId)) {
            articlePayload.article.user_segment_id = segId;
          }
        } else {
          articlePayload.article.user_segment_id = null;
        }
      } else {
        articlePayload.article.user_segment_id = null;
      }

      await zdFetch(`/api/v2/help_center/articles/${articleId}.json`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(articlePayload),
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Article updated successfully",
        message: `Article "${title}" has been updated`,
      });

      popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update article",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Article" onSubmit={handleSubmit} />
          {articleUrl && <Action.OpenInBrowser title="View on Website" url={articleUrl} />}
          {onPromote && <Action title="Promote Article" icon="⭐" onAction={() => onPromote(articleId, title)} />}
          {onArchive && <Action title="Archive Article" icon="📦" onAction={() => onArchive(articleId, title)} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Article Title"
        placeholder="Enter article title"
        value={title}
        onChange={setTitle}
      />

      <Form.TextArea
        id="content"
        title="Content (Markdown)"
        placeholder="Edit your markdown content here..."
        value={markdownContent}
        onChange={setMarkdownContent}
      />

      <Form.Dropdown id="category" title="Category" value={selectedCategoryId} onChange={setSelectedCategoryId}>
        {categories.map((category) => (
          <Form.Dropdown.Item value={category.id.toString()} title={category.name} />
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
          <Form.Dropdown.Item value={section.id.toString()} title={section.name} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="isPublic"
        title="Publish Article"
        label="Make article public"
        value={isPublic}
        onChange={setIsPublic}
      />

      <Form.Description text="Edit the article content in markdown format. Changes will be converted to HTML automatically." />
    </Form>
  );
}
