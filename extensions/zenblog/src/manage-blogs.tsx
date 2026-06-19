import { FormValidation, useCachedPromise, useForm, useLocalStorage } from "@raycast/utils";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { createZenblogClient } from "zenblog";
import { Post } from "zenblog/dist/types";
import TurndownService from "turndown";

interface Blog {
  id: string;
  title: string;
}

const ZENBLOG_LIMIT = 20;

export default function ManageBlogs() {
  const { isLoading, value: blogs } = useLocalStorage<Blog[]>("zenblog-blogs", []);
  return (
    <List isLoading={isLoading}>
      {!isLoading && !blogs?.length ? (
        <List.EmptyView
          icon="zenblog.png"
          title="No blogs added"
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Add Zenblog" target={<AddBlog />} />
            </ActionPanel>
          }
        />
      ) : (
        blogs?.map((blog) => (
          <List.Item
            key={blog.id}
            icon="zenblog.png"
            title={blog.title}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.List} title="List Posts" target={<ListPosts blog={blog} />} />
                <Action.Push icon={Icon.TwoPeople} title="List Authors" target={<ListAuthors blog={blog} />} />
                <Action.Push icon={Icon.Folder} title="List Categories" target={<ListCategories blog={blog} />} />
                <Action.Push icon={Icon.Tag} title="List Tags" target={<ListTags blog={blog} />} />
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Plus}
                    title="Add Zenblog"
                    target={<AddBlog />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddBlog() {
  const { handleSubmit, itemProps } = useForm<Blog>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Verifying", values.title);
      try {
        const value = (await LocalStorage.getItem<string>("zenblog-blogs")) ?? "[]";
        const blogs = (await JSON.parse(value)) as Blog[];
        if (blogs.find((blog) => blog.id === values.id)) throw new Error("Blog already exists");
        const zenblog = createZenblogClient({ blogId: values.id });
        await zenblog.authors.list();
        toast.style = Toast.Style.Success;
        toast.title = "Verified";
        blogs.push(values);
        await LocalStorage.setItem("zenblog-blogs", JSON.stringify(blogs));
        toast.title = "Added";
        await popToRoot();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      id: FormValidation.Required,
      title: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Manage Blogs / Add"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Zenblog" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Blog ID" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...itemProps.id} />
      <Form.TextField title="Title" placeholder="Zenblog" {...itemProps.title} />
    </Form>
  );
}

const buildPostAccessories = (post: Post) => {
  const accessories: List.Item.Accessory[] = [];
  if (post.category) accessories.push({ text: post.category.name });
  post.tags.map((tag) => accessories.push({ tag: tag.name }));
  accessories.push({ date: new Date(post.published_at) });
  return accessories;
};
function ListPosts({ blog }: { blog: Blog }) {
  const { isLoading, data: posts } = useCachedPromise(
    (blogId: string) => async (options) => {
      const zenblog = createZenblogClient({ blogId });
      const posts = await zenblog.posts.list({ limit: ZENBLOG_LIMIT, offset: options.page * ZENBLOG_LIMIT });
      return {
        data: posts.data,
        hasMore: posts.offset + posts.limit < posts.total,
      };
    },
    [blog.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${blog.title} / Posts`}>
      {!isLoading && !posts.length ? (
        <List.EmptyView icon="✏️" title="Nothing here yet" />
      ) : (
        posts.map((post) => (
          <List.Item
            key={post.slug}
            icon={post.cover_image || Icon.Image}
            title={post.title}
            accessories={buildPostAccessories(post)}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Eye} title="View Post" target={<ViewPost blog={blog} post={post} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
function ViewPost({ blog, post }: { blog: Blog; post: Post }) {
  const { isLoading, data: markdown } = useCachedPromise(
    async (slug) => {
      const zenblog = createZenblogClient({ blogId: blog.id });
      const data = await zenblog.posts.get({ slug });
      const td = new TurndownService();
      const md = td.turndown(data.data.html_content);
      return md;
    },
    [post.slug],
  );

  return <Detail isLoading={isLoading} navigationTitle={`${blog.title} / Posts / ${post.title}`} markdown={markdown} />;
}
function ListAuthors({ blog }: { blog: Blog }) {
  const { isLoading, data: authors } = useCachedPromise(
    async (blogId: string) => {
      const zenblog = createZenblogClient({ blogId });
      const authors = await zenblog.authors.list();
      return authors.data;
    },
    [blog.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${blog.title} / Authors`} isShowingDetail>
      {!isLoading && !authors.length ? (
        <List.EmptyView icon="✏️" title="No authors found" />
      ) : (
        authors.map((author) => (
          <List.Item
            key={author.slug}
            icon={author.image_url}
            title={author.name}
            detail={
              <List.Item.Detail
                markdown={author.bio}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Slug" text={author.slug} />
                    {author.twitter_url && (
                      <List.Item.Detail.Metadata.Link
                        title="X (Twitter)"
                        text={author.twitter_url}
                        target={author.twitter_url}
                      />
                    )}
                    {author.website_url && (
                      <List.Item.Detail.Metadata.Link
                        title="Website"
                        text={author.website_url}
                        target={author.website_url}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
function ListCategories({ blog }: { blog: Blog }) {
  const { isLoading, data: categories } = useCachedPromise(
    async (blogId: string) => {
      const zenblog = createZenblogClient({ blogId });
      const categories = await zenblog.categories.list();
      return categories.data;
    },
    [blog.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${blog.title} / Categories`}>
      {!isLoading && !categories.length ? (
        <List.EmptyView icon="✏️" title="No categories found" />
      ) : (
        categories.map((category) => (
          <List.Item key={category.slug} icon={Icon.Folder} title={category.name} subtitle={category.slug} />
        ))
      )}
    </List>
  );
}
function ListTags({ blog }: { blog: Blog }) {
  const { isLoading, data: tags } = useCachedPromise(
    async (blogId: string) => {
      const zenblog = createZenblogClient({ blogId });
      const tags = await zenblog.tags.list();
      return tags.data;
    },
    [blog.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${blog.title} / Tags`}>
      {!isLoading && !tags.length ? (
        <List.EmptyView icon="✏️" title="No tags found" />
      ) : (
        tags.map((tag) => <List.Item key={tag.slug} icon={Icon.Tag} title={tag.name} subtitle={tag.slug} />)
      )}
    </List>
  );
}
