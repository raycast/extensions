import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchItemInput } from "./util/input";
import { ActionSettings } from "./components/action-settings";
import { MutatePromise, useForm } from "@raycast/utils";
import { withGitHubClient } from "./components/with-github-client";
import { getGitHubClient } from "./api/oauth";
import { Gist, GistFile, validateGistFileContents, validateGistFileName } from "./util/gist-utils";

interface GistFilesValidation {
  error: string | undefined;
}

interface GistFormValues {
  description: string;
  isPublic: string;
  gistFiles: GistFile[];
  gistFileNameValidation: GistFilesValidation[];
  gistFileContentValidation: GistFilesValidation[];
}

enum GistFormValuesId {
  DESCRIPTION = "description",
  GIST_FILES = "gistFiles",
  GIST_FILE_NAME_VALIDATION = "gistFileNameValidation",
  GIST_FILE_CONTENT_VALIDATION = "gistFileContentValidation",
}

export function CreateGistForm(props: { gist?: Gist | undefined; gistMutate?: MutatePromise<Gist[]> | undefined }) {
  const client = getGitHubClient();
  const isEdit = !!props.gist;
  const gist = props.gist ?? {
    gist_id: "",
    description: "",
    html_url: "",
    file: [],
  };
  const gistMutate = props.gistMutate ?? (() => {});

  const oldGistFiles = useMemo(() => {
    return gist.file.map((value) => value.filename);
  }, [gist]);

  const {
    handleSubmit,
    itemProps,
    values: formValues,
    setValue: setFormValues,
  } = useForm<GistFormValues>({
    onSubmit() {
      client
        .updateOrCreateGists(
          isEdit,
          gist,
          formValues.description,
          formValues.isPublic,
          formValues.gistFiles,
          oldGistFiles,
          gistMutate,
        )
        .then();
    },
    validation: {
      gistFiles: () => {
        const value = formValues.gistFiles;
        if (!value || value.length == 0) {
          showToast(Toast.Style.Failure, "Please add at least one file.").then();
          return "Please add at least one file.";
        }
        const isNameValid = validateGistFileName(value);
        const isContentValid = validateGistFileContents(value);
        setFormValues(GistFormValuesId.GIST_FILE_NAME_VALIDATION, isNameValid);
        setFormValues(GistFormValuesId.GIST_FILE_CONTENT_VALIDATION, isContentValid);
        if (isNameValid.some((value) => value.error)) {
          return "Content must have unique filename.";
        }
        if (isContentValid.some((value) => value.error)) {
          return `Content cannot be empty.`;
        }
      },
    },
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function _fetch() {
      if (isEdit) {
        const _gistFiles: GistFile[] = [];
        for (const value of gist.file) {
          const { data } = await client.octokit.request(`${value.raw_url}`);
          _gistFiles.push({
            filename: value.filename,
            content: data as string,
          });
        }
        setFormValues(GistFormValuesId.DESCRIPTION, gist.description);
        setFormValues(GistFormValuesId.GIST_FILES, _gistFiles);
      } else {
        const inputItem = await fetchItemInput();
        setFormValues(GistFormValuesId.GIST_FILES, [{ filename: "", content: inputItem }]);
      }
      setIsLoading(false);
    }
    _fetch().then();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEdit ? "Edit Gist" : "Create Gist"}
      searchBarAccessory={<Form.LinkAccessory target={gist.html_url} text="Go to Gist" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Gist" : "Create Gist"}
            icon={isEdit ? Icon.Pencil : Icon.PlusTopRightSquare}
            onSubmit={handleSubmit}
          />

          {isEdit && <Action.CopyToClipboard title={"Copy Gist Id"} content={gist.gist_id} />}

          <ActionPanel.Section>
            <Action
              title="Add File"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={async () => {
                setFormValues(GistFormValuesId.GIST_FILES, [{ filename: "", content: "" }, ...formValues.gistFiles]);
              }}
            />
            <Action
              title="Remove First File"
              icon={Icon.DeleteDocument}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                const _gistFiles = [...formValues.gistFiles];
                _gistFiles.shift();
                setFormValues(GistFormValuesId.GIST_FILES, _gistFiles);
              }}
            />
            <Action
              title="Remove Last File"
              icon={Icon.DeleteDocument}
              shortcut={{ modifiers: ["ctrl", "opt"], key: "x" }}
              onAction={async () => {
                const _gistFiles = [...formValues.gistFiles];
                _gistFiles.pop();
                setFormValues(GistFormValuesId.GIST_FILES, _gistFiles);
              }}
            />
          </ActionPanel.Section>
          <ActionSettings command={false} />
        </ActionPanel>
      }
    >
      <Form.TextField title={"Description"} placeholder={"Gist description..."} {...itemProps.description} />
      {isEdit ? (
        <Form.Description title={"Gist Id"} text={gist.gist_id} />
      ) : (
        <Form.Dropdown key={"visibility"} title={"Visibility"} {...itemProps.isPublic}>
          <Form.Dropdown.Item key={"secret"} icon={Icon.EyeDisabled} title={"Secret"} value={"false"} />
          <Form.Dropdown.Item key={"public"} icon={Icon.Eye} title={"Public"} value={"true"} />
        </Form.Dropdown>
      )}
      {formValues.gistFiles?.map((gistFile, index) => {
        return (
          <Fragment key={"file_fragment" + index}>
            <Form.Separator />
            <Form.TextField
              id={"file_name" + index}
              key={"file_name" + index}
              title={"File " + (index + 1)}
              placeholder={"Name with extension..."}
              value={gistFile.filename}
              error={formValues.gistFileNameValidation?.at(index)?.error}
              onChange={(newValue) => {
                const _gistFiles = [...formValues.gistFiles];
                _gistFiles[index].filename = newValue;
                setFormValues(GistFormValuesId.GIST_FILES, _gistFiles);
                setFormValues(GistFormValuesId.GIST_FILE_NAME_VALIDATION, validateGistFileName(_gistFiles));
              }}
            />
            <Form.TextArea
              id={"file_content" + index}
              key={"file_content" + index}
              value={gistFile.content}
              title={"Content"}
              placeholder={"Content..."}
              error={formValues.gistFileContentValidation?.at(index)?.error}
              onChange={(newValue) => {
                const _gistFiles = [...formValues.gistFiles];
                _gistFiles[index].content = newValue;
                setFormValues(GistFormValuesId.GIST_FILES, _gistFiles);
                setFormValues(GistFormValuesId.GIST_FILE_CONTENT_VALIDATION, validateGistFileContents(_gistFiles));
              }}
            />
          </Fragment>
        );
      })}
    </Form>
  );
}

export default withGitHubClient(CreateGistForm);
