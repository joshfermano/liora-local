export const AVATAR_MARKS = ['peony', 'sun', 'moon', 'shell', 'dawn', 'bud', 'bloom', 'pane'] as const;
export type AvatarMarkName = (typeof AVATAR_MARKS)[number];
