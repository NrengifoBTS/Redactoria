export const ADMIN_USER_IDS = [
  "66f98888-6a48-468a-a467-56a90608b976",
  "f49cda9b-2138-435e-a497-fda85be87e63",
  "c7c17838-074d-44fa-9248-8dc87c15edd5",
  "152c46be-e2f4-48da-86b1-592af570624a",
  "66c78483-85e5-4e2b-87de-cef34f5a5e9d",
  "6c9e12bc-a937-4fcd-a50f-b97d952c0cf1",
  "e6dab109-698d-410b-9270-4a1263d5bd3d",
  "9c7e4bf6-e645-4a59-8a56-d8a47e8c184b",
  "349a4378-d003-4b80-b2f1-a9f6060c0b2a",
  "f6a1ce7c-e594-43df-b649-30fda6a25548",
];

export const EDITOR_USER_IDS = [
  "66f98888-6a48-468a-a467-56a90608b976",
  "a1116359-0fd7-43b4-b4eb-231bc2a14a21",
  "4e7a5222-8bd5-45c5-bdcd-e4dc1dbfe27d",
  "3fa85f64-5717-4562-b3fc-2c963f66afa6",
];

export const isAdminUser = (userId) => ADMIN_USER_IDS.includes(userId);
export const isEditorUser = (userId) => EDITOR_USER_IDS.includes(userId);
