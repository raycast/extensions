import { Octokit } from "@octokit/core";
import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { Gist, GistFile, GithubGistTag } from "../util/gist-utils";
import { formatBytes, isEmpty } from "../util/utils";

export class GithubClient {
  constructor(public readonly octokit: Octokit) {}

  public async requestGist(tag: string, page: number, perPage: number) {
    const { octokit } = this;
    const response = await (async () => {
      switch (tag) {
        case GithubGistTag.MY_GISTS: {
          return await octokit.request(`GET /gists`, { page: page, per_page: perPage });
        }
        case GithubGistTag.ALL_GISTS: {
          return await octokit.request(`GET /gists/public`, { page: page, per_page: perPage });
        }
        case GithubGistTag.STARRED: {
          return await octokit.request(`GET /gists/starred`, { page: page, per_page: perPage });
        }
        case GithubGistTag.PROMPT: {
          // Get user's gists and filter for prompts
          const response = await octokit.request(`GET /gists`, { page: page, per_page: perPage });
          response.data = response.data.filter((gist) => gist.description?.toLowerCase().includes("prompt"));
          return response;
        }
        default: {
          return await octokit.request(`GET /gists`, { page: page, per_page: perPage });
        }
      }
    })();

    const _gists: Gist[] = [];
    response.data.forEach((_data) => {
      const _gist: Gist = {
        gist_id: _data.id,
        description: isEmpty(String(_data.description)) ? "[ No description ]" : String(_data.description),
        html_url: _data.html_url,
        file: [],
      };
      for (const value of Object.values(_data.files)) {
        if (value !== undefined) {
          _gist.file.push({
            filename: String(value.filename),
            language: String(value.language),
            raw_url: String(value.raw_url),
            size: formatBytes(value.size),
            type: value.type,
          });
        }
      }
      _gists.push(_gist);
    });
    return _gists;
  }

  public async starGist(gist_id: string) {
    return await this.octokit.request(`PUT /gists/${gist_id}/star`, {
      gist_id: gist_id,
    });
  }

  public async unStarGist(gist_id: string) {
    return await this.octokit.request(`DELETE /gists/${gist_id}/star`, {
      gist_id: gist_id,
    });
  }

  public async deleteGist(gist_id: string) {
    return await this.octokit.request(`DELETE /gists/${gist_id}`, {
      gist_id: gist_id,
    });
  }

  public async createGist(description: string, isPublic = false, gistFiles: GistFile[]) {
    const files: { [p: string]: { content: string } } = {};
    gistFiles.forEach((value) => {
      files[value.filename] = { content: value.content };
    });
    return await this.octokit.request("POST /gists", {
      description: description,
      public: isPublic,
      files: files,
    });
  }

  public async updateGist(gistId: string, description: string, oldFileNames: string[], newFiles: GistFile[]) {
    const files: { [p: string]: { content: string } } = {};
    const newFileName = newFiles.map((value) => value.filename);
    const deleteFiles = oldFileNames.filter((value) => !newFileName.includes(value));
    newFiles.forEach((value) => {
      files[value.filename] = { content: value.content };
    });
    deleteFiles.forEach((value) => {
      files[value] = { content: "" };
    });
    return await this.octokit.request("PATCH /gists/" + gistId, {
      description: description,
      files: files,
    });
  }

  public async updateOrCreateGists(
    isEdit: boolean,
    gist: Gist,
    description: string,
    isPublic: string,
    gistFiles: GistFile[],
    oldGistFiles: string[],
    gistMutate: () => void,
  ) {
    const toast = await showToast(Toast.Style.Animated, isEdit ? "Updating" : "Creating");
    try {
      let response;
      if (isEdit) {
        response = await this.updateGist(gist.gist_id, description, oldGistFiles, gistFiles);
      } else {
        response = await this.createGist(description, isPublic === "true", gistFiles);
      }
      if (response.status === 201 || response.status === 200) {
        const options: Toast.Options = {
          title: "Gist " + (isEdit ? "Updated" : "Created"),
          primaryAction: {
            title: "Copy Gist Link",
            shortcut: { modifiers: ["shift", "cmd"], key: "l" },
            onAction: (toast) => {
              Clipboard.copy(String(response.data.html_url));
              toast.title = "Link Copied to Clipboard";
            },
          },
          secondaryAction: {
            title: "Open in Browser",
            shortcut: { modifiers: ["shift", "cmd"], key: "o" },
            onAction: (toast) => {
              open(String(response.data.html_url));
              toast.hide();
            },
          },
        };
        toast.style = Toast.Style.Success;
        toast.title = options.title;
        toast.primaryAction = options.primaryAction;
        toast.secondaryAction = options.secondaryAction;
        gistMutate();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to " + (isEdit ? "Update" : "Create");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to " + (isEdit ? "Update" : "Create");
    }
  }
}
