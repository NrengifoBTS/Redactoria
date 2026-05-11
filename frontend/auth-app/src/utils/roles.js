export const ADMIN_USER_IDS = [
  "65cd97a4-c3b9-4bfd-b014-55457ae847e3",
  "f49cda9b-2138-435e-a497-fda85be87e63",
  "c7c17838-074d-44fa-9248-8dc87c15edd5",
  "152c46be-e2f4-48da-86b1-592af570624a",
  "b43f1d04-f339-4cf9-8e4e-4f127f12af5a",
  "2fd1e540-40be-42cf-9d2b-693b0d3132af",
];

export const EDITOR_USER_IDS = [
  "65cd97a4-c3b9-4bfd-b014-55457ae847e3",
  "a1116359-0fd7-43b4-b4eb-231bc2a14a21",
  "4e7a5222-8bd5-45c5-bdcd-e4dc1dbfe27d",
];

export const isAdminUser = (userId) => ADMIN_USER_IDS.includes(userId);
export const isEditorUser = (userId) => EDITOR_USER_IDS.includes(userId);
