export type Locale = "ru" | "kk" | "en";

export type MessageTree = {
  [key: string]: string | MessageTree;
};
