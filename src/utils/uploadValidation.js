export const UPLOAD_STATUS = {
  NOT_SELECTED: 'not_selected',
  SELECTED: 'selected',
  WAITING_FOR_INTERNET: 'waiting_for_internet',
  UPLOADING: 'uploading',
  PAUSED: 'paused',
  RETRYING: 'retrying',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
  REJECTED: 'rejected',
  REMOVED: 'removed',
};

export const UPLOAD_STATUS_LABELS = {
  [UPLOAD_STATUS.NOT_SELECTED]: 'Not Selected',
  [UPLOAD_STATUS.SELECTED]: 'Selected',
  [UPLOAD_STATUS.WAITING_FOR_INTERNET]: 'Waiting for Internet',
  [UPLOAD_STATUS.UPLOADING]: 'Uploading',
  [UPLOAD_STATUS.PAUSED]: 'Paused',
  [UPLOAD_STATUS.RETRYING]: 'Retrying',
  [UPLOAD_STATUS.UPLOADED]: 'Uploaded',
  [UPLOAD_STATUS.FAILED]: 'Failed',
  [UPLOAD_STATUS.REJECTED]: 'Rejected',
  [UPLOAD_STATUS.REMOVED]: 'Removed',
};

export const FILE_RULES = {
  document: {
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    label: 'PDF, JPG, JPEG, PNG',
  },
  photo: {
    accept: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMB: 2,
    label: 'JPG, JPEG, PNG, WEBP',
  },
  paymentProof: {
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 5,
    label: 'PDF, JPG, JPEG, PNG',
  },
  teacherPhoto: {
    accept: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMB: 10,
    label: 'JPG, JPEG, PNG, WEBP',
  },
  chatAttachment: {
    accept: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
    mimeTypes: [
      'application/pdf', 'image/jpeg', 'image/png',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSizeMB: 10,
    label: 'PDF, images, DOC, DOCX, XLS, XLSX',
  },
};

/**
 * @param {File} file
 * @param {'document'|'photo'|'paymentProof'|'teacherPhoto'|'chatAttachment'} category
 */
export function validateFile(file, category = 'document') {
  const rules = FILE_RULES[category];
  if (!rules) return { valid: false, error: 'Invalid upload category.' };

  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  const extValid = rules.accept.includes(ext);
  const mimeValid = rules.mimeTypes.includes(file.type) || file.type === '';

  if (!extValid && !mimeValid) {
    return { valid: false, error: `Only ${rules.label} files are allowed.` };
  }

  if (file.size > rules.maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size must be less than ${rules.maxSizeMB} MB.` };
  }

  return { valid: true, error: null };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
