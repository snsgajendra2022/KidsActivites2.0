export const SECURITY_POLICY_CONTENT = {
  title: 'Security Policy',
  subtitle: 'How Kids Activities protects your school, staff, and family data.',
  lastUpdated: 'July 1, 2026',
  sections: [
    {
      heading: '1. Our Commitment',
      body: 'KidsActivites is designed for schools that handle sensitive student and parent information. We apply industry-standard security controls across authentication, data storage, transmission, and access management.',
    },
    {
      heading: '2. Data Encryption',
      body: 'All data in transit is protected using TLS 1.2 or higher. Sensitive credentials and session tokens are never stored in plain text. Uploaded documents and photos are stored in encrypted object storage with access restricted by role.',
    },
    {
      heading: '3. Authentication & Access',
      body: 'The platform supports email/password and OTP-based login. Role-based access ensures parents, teachers, admission staff, and administrators only see data relevant to their role. Failed login attempts are rate-limited to reduce brute-force risk.',
    },
    {
      heading: '4. Document & Photo Handling',
      body: 'Enrollment documents and classroom photos are accessible only to authorized school staff and the relevant parent accounts. Teachers may share photos only with selected classes or individual parents as configured by the school.',
    },
    {
      heading: '5. Audit & Monitoring',
      body: 'Administrative actions such as application review, fee verification, and account creation are logged for accountability. Schools may request audit log exports through their designated administrator.',
    },
    {
      heading: '6. Incident Response',
      body: 'If we detect a security incident affecting school data, we will notify the school administrator without undue delay and provide guidance on containment and remediation steps.',
    },
    {
      heading: '7. Contact',
      body: 'For security-related questions, contact your school administrator or write to security@kidsactivites.demo.',
    },
  ],
};

export const TERMS_OF_USE_CONTENT = {
  title: 'Terms of Use',
  subtitle: 'Rules for using the KidsActivites enrollment and communication platform.',
  lastUpdated: 'July 1, 2026',
  sections: [
    {
      heading: '1. Acceptance',
      body: 'By accessing KidsActivites you agree to these Terms of Use and to follow your school\'s published admission policies. If you do not agree, do not use the platform.',
    },
    {
      heading: '2. Eligibility',
      body: 'Parents and guardians may submit enrollment applications for their children. School staff accounts are issued only by authorized school administrators. You must provide accurate information during registration and enrollment.',
    },
    {
      heading: '3. Acceptable Use',
      body: 'You may not misuse the platform, attempt unauthorized access, upload malicious files, harass other users, or use school communication tools for non-school purposes. Misuse may result in account suspension.',
    },
    {
      heading: '4. Enrollment Submissions',
      body: 'Submitted applications are subject to review by the school. Providing false or misleading information may lead to rejection of admission. Fees, once verified by the school, are governed by the school\'s refund policy.',
    },
    {
      heading: '5. Intellectual Property',
      body: 'KidsActivites software, branding, and UI are owned by KidsActivites Systems. Content you upload (documents, photos) remains yours; you grant the school a license to use it for admission and school operations.',
    },
    {
      heading: '6. Service Availability',
      body: 'We strive for high availability but do not guarantee uninterrupted access. Planned maintenance will be communicated on the System Status page when possible.',
    },
    {
      heading: '7. Limitation of Liability',
      body: 'KidsActivites is provided as a school-managed service. To the extent permitted by law, KidsActivites Systems is not liable for indirect damages arising from use of the platform.',
    },
    {
      heading: '8. Changes',
      body: 'We may update these terms. Continued use after updates constitutes acceptance. Material changes will be reflected with an updated date at the top of this page.',
    },
  ],
};

export const SYSTEM_STATUS_SERVICES = [
  { name: 'Parent & Staff Portal', status: 'operational', detail: 'Login, dashboards, and navigation' },
  { name: 'Online Enrollment', status: 'operational', detail: 'Application forms and document upload' },
  { name: 'Fee Payments', status: 'operational', detail: 'Fee assignment and payment proof submission' },
  { name: 'Photo Sharing', status: 'operational', detail: 'Teacher-to-parent classroom photos' },
  { name: 'Messaging', status: 'operational', detail: 'Secure chat between parents and school' },
  { name: 'Notifications', status: 'maintenance', detail: 'Scheduled maintenance tonight 11 PM–1 AM IST' },
];

export const SUPPORT_FAQ = [
  {
    q: 'I cannot log in to my parent account.',
    a: 'Use the email or mobile number registered with the school. For OTP login, ensure you enter the 10-digit mobile number without country code. Contact the school if your account is not yet created.',
  },
  {
    q: 'My enrollment application is under review. What next?',
    a: 'The admission team will verify documents and may request corrections. You will receive updates in the parent portal and via notifications.',
  },
  {
    q: 'How do I submit fee payment proof?',
    a: 'After logging in, go to Fees, upload your bank transfer or UPI receipt, and submit. The accounts team will verify and issue a receipt.',
  },
  {
    q: 'Who can see photos shared by teachers?',
    a: 'Only parents of students in the selected class or individually chosen recipients can view shared classroom photos.',
  },
];
