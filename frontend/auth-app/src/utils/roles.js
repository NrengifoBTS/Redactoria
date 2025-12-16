export const ADMIN_USER_IDS = [
  "66f98888-6a48-468a-a467-56a90608b976",
  "f49cda9b-2138-435e-a497-fda85be87e63",
  "c7c17838-074d-44fa-9248-8dc87c15edd5",
  "152c46be-e2f4-48da-86b1-592af570624a",
];

export const EDITOR_USER_IDS = [
  "66f98888-6a48-468a-a467-56a90608b976",
  "a1116359-0fd7-43b4-b4eb-231bc2a14a21",
  "4e7a5222-8bd5-45c5-bdcd-e4dc1dbfe27d",
];

export const isAdminUser = (userId) => ADMIN_USER_IDS.includes(userId);
export const isEditorUser = (userId) => EDITOR_USER_IDS.includes(userId);
