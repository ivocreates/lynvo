export type CertificateType = "internship" | "experience" | "completion" | "appreciation";
export type CertificateStatus = "draft" | "issued" | "revoked";

export const CERTIFICATE_TYPES: CertificateType[] = [
  "internship",
  "experience",
  "completion",
  "appreciation",
];

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  internship: "Internship certificate",
  experience: "Experience certificate",
  completion: "Certificate of completion",
  appreciation: "Certificate of appreciation",
};

export const CERTIFICATE_HEADINGS: Record<CertificateType, string> = {
  internship: "CERTIFICATE OF INTERNSHIP",
  experience: "CERTIFICATE OF EXPERIENCE",
  completion: "CERTIFICATE OF COMPLETION",
  appreciation: "CERTIFICATE OF APPRECIATION",
};

export type Certificate = {
  id: string;
  code: string;
  cert_type: CertificateType;
  status: CertificateStatus;
  recipient_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  role_title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  skills: string[] | null;
  issued_on: string | null;
  revoked_reason: string | null;
};

/** Shape returned by the public verify_certificate() function. */
export type VerifiedCertificate = Pick<
  Certificate,
  | "code"
  | "cert_type"
  | "status"
  | "recipient_name"
  | "role_title"
  | "department"
  | "start_date"
  | "end_date"
  | "summary"
  | "skills"
  | "issued_on"
>;

export function verifyUrl(baseUrl: string, code: string) {
  return `${baseUrl.replace(/\/+$/, "")}/verify/${encodeURIComponent(code)}`;
}

export function formatCertificateDate(value: string | null) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatPeriod(start: string | null, end: string | null) {
  if (start && end) return `${formatCertificateDate(start)} to ${formatCertificateDate(end)}`;
  if (start) return `from ${formatCertificateDate(start)}`;
  if (end) return `until ${formatCertificateDate(end)}`;
  return "";
}
