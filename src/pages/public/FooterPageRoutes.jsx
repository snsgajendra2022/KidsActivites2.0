import {
  SECURITY_POLICY_CONTENT,
  TERMS_OF_USE_CONTENT,
  TERMS_AND_CONDITIONS_CONTENT,
  PRIVACY_POLICY_CONTENT,
  SYSTEM_STATUS_SERVICES,
  SUPPORT_FAQ,
} from '../../constants/footerPagesContent.js';
import {
  LegalDocumentPage,
  SystemStatusPage,
  DirectSupportPage,
} from './FooterPages.jsx';

export function SecurityPolicy() {
  return <LegalDocumentPage {...SECURITY_POLICY_CONTENT} />;
}

export function TermsOfUse() {
  return <LegalDocumentPage {...TERMS_OF_USE_CONTENT} />;
}

export function TermsAndConditions() {
  return <LegalDocumentPage {...TERMS_AND_CONDITIONS_CONTENT} />;
}

export function PrivacyPolicy() {
  return <LegalDocumentPage {...PRIVACY_POLICY_CONTENT} />;
}

export function SystemStatus() {
  return <SystemStatusPage services={SYSTEM_STATUS_SERVICES} />;
}

export function DirectSupport() {
  return <DirectSupportPage faq={SUPPORT_FAQ} />;
}
