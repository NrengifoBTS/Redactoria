export const ADMIN_USER_IDS = [
  "874f68d3-afed-4d20-85dc-86e71eca5919",
  "a1116359-0fd7-43b4-b4eb-231bc2a14a21",
  "4e7a5222-8bd5-45c5-bdcd-e4dc1dbfe27d",
];

export const EDITOR_USER_IDS = [
  "874f68d3-afed-4d20-85dc-86e71eca5919",
  "a1116359-0fd7-43b4-b4eb-231bc2a14a21",
  "4e7a5222-8bd5-45c5-bdcd-e4dc1dbfe27d",
];

export const isAdminUser = (userId) => ADMIN_USER_IDS.includes(userId);
export const isEditorUser = (userId) => EDITOR_USER_IDS.includes(userId);
