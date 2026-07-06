import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADMIN_NAME_REGEX = /^[a-zA-Z\s.'-]+$/;

export const WORKSPACE_FIELD_LABELS = {
  workspaceName: 'Workspace name',
  slug: 'Workspace slug',
  adminName: 'Admin name',
  adminEmail: 'Admin email',
};

export const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(1, `${WORKSPACE_FIELD_LABELS.workspaceName} is required.`)
    .min(2, `${WORKSPACE_FIELD_LABELS.workspaceName} must be at least 2 characters.`)
    .max(120, `${WORKSPACE_FIELD_LABELS.workspaceName} must be 120 characters or less.`),
  slug: z
    .string()
    .trim()
    .min(1, `${WORKSPACE_FIELD_LABELS.slug} is required.`)
    .min(3, `${WORKSPACE_FIELD_LABELS.slug} must be at least 3 characters.`)
    .max(63, `${WORKSPACE_FIELD_LABELS.slug} must be 63 characters or less.`)
    .regex(
      SLUG_REGEX,
      `${WORKSPACE_FIELD_LABELS.slug} can only contain lowercase letters, numbers, and hyphens.`,
    ),
  adminName: z
    .string()
    .trim()
    .min(1, `${WORKSPACE_FIELD_LABELS.adminName} is required.`)
    .min(2, `${WORKSPACE_FIELD_LABELS.adminName} must be at least 2 characters.`)
    .max(80, `${WORKSPACE_FIELD_LABELS.adminName} must be 80 characters or less.`)
    .regex(
      ADMIN_NAME_REGEX,
      `${WORKSPACE_FIELD_LABELS.adminName} can only contain letters, spaces, and basic punctuation.`,
    ),
  adminEmail: z
    .string()
    .trim()
    .min(1, `${WORKSPACE_FIELD_LABELS.adminEmail} is required.`)
    .email(`${WORKSPACE_FIELD_LABELS.adminEmail} must be a valid email address.`),
});

export function validateWorkspaceForm(values) {
  const result = workspaceFormSchema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { success: false, errors };
}

export function validateWorkspaceField(field, value) {
  const fieldSchema = workspaceFormSchema.shape[field];
  if (!fieldSchema) return '';

  const result = fieldSchema.safeParse(value);
  if (result.success) return '';
  return result.error.issues[0]?.message || `${WORKSPACE_FIELD_LABELS[field] || 'This field'} is invalid.`;
}
