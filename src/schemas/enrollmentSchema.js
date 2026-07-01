import { z } from 'zod';

const mobileRegex = /^[6-9]\d{9}$/;

export const studentStepSchema = z.object({
  fullName: z.string().min(1, 'Student full name is required.'),
  dateOfBirth: z.string().min(1, 'Date of birth is required.'),
  gender: z.string().min(1, 'Please select gender.'),
  bloodGroup: z.string().optional(),
  nationality: z.string().default('Indian'),
  religion: z.string().optional(),
  classApplying: z.string().min(1, 'Please select the class applying for.'),
  previousSchool: z.string().optional(),
  aadhaar: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  specialNeeds: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

export const parentStepSchema = z.object({
  fatherName: z.string().min(1, 'Father name is required.'),
  fatherMobile: z.string().min(1, 'Please enter a valid mobile number.').regex(mobileRegex, 'Please enter a valid mobile number.'),
  fatherEmail: z.union([z.string().email('Please enter a valid email address.'), z.literal('')]).optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(1, 'Mother name is required.'),
  motherMobile: z.string().optional(),
  motherEmail: z.union([z.string().email('Please enter a valid email address.'), z.literal('')]).optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  alternateContact: z.string().optional(),
});

export const addressStepSchema = z.object({
  currentAddress: z.string().min(1, 'Current address is required.'),
  permanentAddress: z.string().optional(),
  sameAsCurrent: z.boolean().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().optional(),
  pinCode: z.string().min(1, 'PIN code is required.'),
  country: z.string().default('India'),
});

export const academicStepSchema = z.object({
  previousClass: z.string().optional(),
  previousSchool: z.string().optional(),
  previousBoard: z.string().optional(),
  achievements: z.string().optional(),
  reasonForChange: z.string().optional(),
});

export const medicalStepSchema = z.object({
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  specialNeeds: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

export const declarationStepSchema = z.object({
  accuracyConfirmed: z.literal(true, { errorMap: () => ({ message: 'Please confirm the accuracy declaration.' }) }),
  communicationConsent: z.boolean().optional(),
  mediaConsent: z.boolean().optional(),
  signature: z.string().min(1, 'Signature is required before submitting.'),
  signatureDate: z.string().optional(),
});

export const enrollmentFormSchema = z.object({
  student: studentStepSchema,
  parent: parentStepSchema,
  address: addressStepSchema,
  academic: academicStepSchema,
  medical: medicalStepSchema,
  documents: z.record(z.any()).optional(),
  declaration: declarationStepSchema,
});

export const STEP_SCHEMAS = {
  1: z.object({ student: studentStepSchema }),
  2: z.object({ parent: parentStepSchema }),
  3: z.object({ address: addressStepSchema }),
  4: z.object({ academic: academicStepSchema }),
  5: z.object({ medical: medicalStepSchema }),
  7: z.object({ declaration: declarationStepSchema }),
};

export function validateEnrollmentStep(step, data) {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return { success: true, errors: {} };
  const result = schema.safeParse(data);
  if (result.success) return { success: true, errors: {} };
  const errors = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  return { success: false, errors };
}
