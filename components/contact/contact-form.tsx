"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitContact, type ContactState } from "@/app/actions/contact";

const initialState: ContactState = { success: false, message: "" };

const BUDGETS = [
  "Under ₹25,000",
  "₹25,000 – ₹75,000",
  "₹75,000 – ₹2,00,000",
  "₹2,00,000 – ₹5,00,000",
  "₹5,00,000+",
  "Not sure yet",
];

const TIMELINES = ["ASAP", "Within 1 month", "1 – 3 months", "3 months+", "Just exploring"];

const FIELD_CLASS =
  "mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:border-brand-700 focus:outline-none";
const LABEL_CLASS = "block text-xs font-medium uppercase tracking-[0.18em] text-text-primary/70";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-brand-700 px-5 py-3 text-sm font-medium text-text-inverse hover:bg-ink-900 disabled:opacity-60"
    >
      {pending ? "Sending..." : label}
    </button>
  );
}

export default function ContactForm({
  services = [],
  defaults = {},
}: {
  services?: { slug: string; title: string }[];
  defaults?: {
    enquiryType?: string;
    service?: string;
    budget?: string;
    message?: string;
  };
}) {
  const [state, formAction] = useFormState(submitContact, initialState);
  const [enquiryType, setEnquiryType] = useState(defaults.enquiryType ?? "project");

  const isCareers = enquiryType === "careers";
  const submitLabel = enquiryType === "quote" ? "Request quote" : isCareers ? "Send application" : "Send message";

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-5">
      <input type="hidden" name="enquiry_type" value={enquiryType} />

      <div>
        <label htmlFor="enquiry-type" className={LABEL_CLASS}>
          I&apos;m here to
        </label>
        <select
          id="enquiry-type"
          value={enquiryType}
          onChange={(event) => setEnquiryType(event.target.value)}
          className={FIELD_CLASS}
        >
          <option value="project">Start a project</option>
          <option value="quote">Request a quote</option>
          <option value="careers">Join the team</option>
          <option value="general">Ask something else</option>
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL_CLASS}>
            Your name *
          </label>
          <input id="name" name="name" required className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL_CLASS}>
            Email address *
          </label>
          <input id="email" name="email" type="email" required className={FIELD_CLASS} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className={LABEL_CLASS}>
            {isCareers ? "Portfolio / LinkedIn" : "Company / organization"}
          </label>
          <input id="company" name="company" className={FIELD_CLASS} />
        </div>
        <div>
          <label htmlFor="phone" className={LABEL_CLASS}>
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className={FIELD_CLASS} />
        </div>
      </div>

      <div>
        <label htmlFor="service" className={LABEL_CLASS}>
          {isCareers ? "Role you're interested in" : "Service needed"}
        </label>
        {isCareers || services.length === 0 ? (
          <input id="service" name="service" defaultValue={defaults.service} className={FIELD_CLASS} />
        ) : (
          <select id="service" name="service" defaultValue={defaults.service ?? ""} className={FIELD_CLASS}>
            <option value="">Select a service</option>
            {services.map((service) => (
              <option key={service.slug} value={service.title}>
                {service.title}
              </option>
            ))}
            <option value="Not sure yet">Not sure yet</option>
          </select>
        )}
      </div>

      {!isCareers && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="budget" className={LABEL_CLASS}>
              Estimated budget
            </label>
            <select id="budget" name="budget" defaultValue={defaults.budget ?? ""} className={FIELD_CLASS}>
              <option value="">Select a range</option>
              {BUDGETS.map((budget) => (
                <option key={budget} value={budget}>
                  {budget}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeline" className={LABEL_CLASS}>
              Timeline
            </label>
            <select id="timeline" name="timeline" defaultValue="" className={FIELD_CLASS}>
              <option value="">Select a timeline</option>
              {TIMELINES.map((timeline) => (
                <option key={timeline} value={timeline}>
                  {timeline}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="message" className={LABEL_CLASS}>
          {isCareers ? "Tell us about yourself *" : "Tell us about your project *"}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          defaultValue={defaults.message}
          className={FIELD_CLASS}
        />
      </div>

      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <SubmitButton label={submitLabel} />

      {state.message && (
        <p role="status" className={`text-sm ${state.success ? "text-success" : "text-error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
