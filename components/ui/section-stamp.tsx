interface SectionStampProps {
  label: string;
}

export default function SectionStamp({ label }: SectionStampProps) {
  return <p className="section-stamp mb-3">{label}</p>;
}
