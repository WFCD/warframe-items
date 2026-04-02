declare module '@wfcd/patchlogs' {
  export interface PatchlogPost {
    name: string;
    url: string;
    date: string;
    [key: string]: unknown;
  }

  export interface ItemChange {
    name: string;
    type: string;
    changes: string[];
  }

  export interface Patchlogs {
    posts: PatchlogPost[];
    getItemChanges(item: { name: string; type: string }): ItemChange[];
  }

  const patchlogs: Patchlogs;
  export default patchlogs;
}
