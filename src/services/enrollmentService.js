import { ENROLLMENT_STATUSES } from '../constants/enrollmentStatuses.js';
import { INITIAL_APPLICATIONS, EMPTY_ENROLLMENT_FORM } from '../data/mockApplications.js';
import { delay, getStore, setStore, generateApplicationNo } from './mockApi.js';

const KEY = 'sb_applications';

function getAll() {
  return getStore(KEY, INITIAL_APPLICATIONS);
}

function saveAll(apps) {
  setStore(KEY, apps);
}

export async function getApplications(filters = {}) {
  await delay();
  let apps = getAll();
  if (filters.status) apps = apps.filter((a) => a.status === filters.status);
  if (filters.parentId) apps = apps.filter((a) => a.parentId === filters.parentId);
  return apps;
}

export async function getApplication(id) {
  await delay();
  return getAll().find((a) => a.id === id) || null;
}

export async function getApplicationByParent(parentId) {
  await delay();
  const apps = getAll();
  return (
    apps.find((a) => a.parentId === parentId) ||
    apps.find((a) => a.parentId === 'u-parent' && parentId === 'usr-parent') ||
    null
  );
}

export async function saveDraft(formData, existingId) {
  await delay();
  const apps = getAll();
  if (existingId) {
    const idx = apps.findIndex((a) => a.id === existingId);
    if (idx >= 0) {
      apps[idx] = { ...apps[idx], ...formData, status: ENROLLMENT_STATUSES.DRAFT, updatedAt: new Date().toISOString() };
      saveAll(apps);
      return apps[idx];
    }
  }
  const draft = {
    id: `app-draft-${Date.now()}`,
    applicationNo: null,
    status: ENROLLMENT_STATUSES.DRAFT,
    ...formData,
    createdAt: new Date().toISOString(),
  };
  apps.push(draft);
  saveAll(apps);
  return draft;
}

export async function submitApplication(formData, existingId, parentId) {
  await delay(600);
  const apps = getAll();
  const applicationNo = generateApplicationNo();
  const entry = {
    id: existingId || `app-${Date.now()}`,
    applicationNo,
    status: ENROLLMENT_STATUSES.SUBMITTED,
    submittedAt: new Date().toISOString(),
    parentId: parentId || null,
    assignedReviewer: 'Priya Sharma',
    statusHistory: [
      { status: ENROLLMENT_STATUSES.SUBMITTED, date: new Date().toISOString(), note: 'Application submitted by parent' },
    ],
    ...formData,
  };
  const idx = apps.findIndex((a) => a.id === existingId);
  if (idx >= 0) apps[idx] = entry;
  else apps.push(entry);
  saveAll(apps);
  return entry;
}

export async function updateApplicationStatus(id, status, note) {
  await delay();
  const apps = getAll();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error('Application not found');
  apps[idx].status = status;
  apps[idx].statusHistory = [
    ...(apps[idx].statusHistory || []),
    { status, date: new Date().toISOString(), note },
  ];
  saveAll(apps);
  return apps[idx];
}

export async function requestCorrection(id, reason) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.CORRECTION_REQUIRED, reason);
}

export async function approveApplication(id) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.FEE_PENDING, 'Application approved. Fee assigned.');
}

export async function rejectApplication(id, reason) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.REJECTED, reason);
}

export async function verifyDocuments(id) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.DOCUMENTS_VERIFIED, 'All documents verified');
}

export async function confirmAdmission(id) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.ADMISSION_CONFIRMED, 'Admission confirmed');
}

export async function createAccount(id) {
  return updateApplicationStatus(id, ENROLLMENT_STATUSES.ACCOUNT_CREATED, 'Parent account created and invitation sent');
}

export function getEmptyForm() {
  return JSON.parse(JSON.stringify(EMPTY_ENROLLMENT_FORM));
}

export function getDashboardStats() {
  const apps = getAll();
  return {
    total: apps.length,
    pendingReview: apps.filter((a) => [ENROLLMENT_STATUSES.SUBMITTED, ENROLLMENT_STATUSES.UNDER_REVIEW].includes(a.status)).length,
    correctionRequired: apps.filter((a) => a.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED).length,
    documentsPending: apps.filter((a) => a.status === ENROLLMENT_STATUSES.DOCUMENTS_PENDING).length,
    feePending: apps.filter((a) => a.status === ENROLLMENT_STATUSES.FEE_PENDING).length,
    feeSubmitted: apps.filter((a) => a.status === ENROLLMENT_STATUSES.FEE_SUBMITTED).length,
    confirmed: apps.filter((a) => a.status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED).length,
    rejected: apps.filter((a) => a.status === ENROLLMENT_STATUSES.REJECTED).length,
    accountsCreated: apps.filter((a) => a.status === ENROLLMENT_STATUSES.ACCOUNT_CREATED).length,
  };
}
