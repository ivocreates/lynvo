/**
 * Sales playbook for the marketing team: call scripts, objection handling and
 * message templates. {company} and {contact} are replaced on the lead page.
 */

export const PITCHES = [
  {
    key: "studio",
    title: "lynvo.studio — get your business online",
    audience: "Shops, restaurants, clinics, salons, consultants, new ventures",
    opener:
      "Hi {contact}, this is {me} from LYNVO, a digital studio. I was looking at {company} online and noticed a couple of quick wins that could bring you more customers from Google. Do you have two minutes?",
    discovery: [
      "How do most of your new customers find you today?",
      "Do you have a website or Google Business Profile you're happy with?",
      "If people search for what you do in your area, do you show up?",
      "Is a logo / brand refresh or social media something you've been meaning to do?",
    ],
    value: [
      "Launch-ready websites from ₹8,999, live in about 2 weeks",
      "Brand identity: logo, business cards, letterhead, social kit",
      "Google Business Profile and local SEO so nearby customers find you",
      "WhatsApp and enquiry forms so leads reach you instantly",
      "Monthly care plans from ₹999 so it never breaks",
    ],
    close:
      "Would it help if I sent you a short proposal with two options and a sample of similar work? What's the best WhatsApp number to send it to?",
  },
  {
    key: "tech",
    title: "lynvo.tech — custom software & security",
    audience: "Growing SMEs, distributors, clinics, schools, logistics, finance",
    opener:
      "Hi {contact}, I'm {me} from LYNVO Tech. We build custom software for small businesses — things like billing, inventory, booking and staff apps — and we do security checks for websites. Are you still running parts of the business on spreadsheets or WhatsApp?",
    discovery: [
      "Which task takes your team the most time every week?",
      "What software do you use today, and what do you dislike about it?",
      "Who would use a new system — staff, customers, or both?",
      "Has your website or app ever had a security check?",
    ],
    value: [
      "Software built around how you already work, not the other way round",
      "Dashboards, billing, inventory, booking and AI automation",
      "Security testing (VAPT) and hardening for websites and apps",
      "You own what we build; we stay on for support",
    ],
    close:
      "Could we book a 20-minute call this week where you show us the process? We'll come back with a clear scope and price — no obligation.",
  },
];

export const OBJECTIONS = [
  {
    objection: "We already have a website.",
    answer:
      "That's great. Most sites we see load slowly on mobile or don't show up on Google for local searches. I can send a free 5-point check of yours — if it's already in great shape, I'll tell you so.",
  },
  {
    objection: "It's too expensive / no budget.",
    answer:
      "Understood. We have starter packages and can split payments into an advance and a balance. Even a simple Google profile and landing page usually pays for itself with a few new customers.",
  },
  {
    objection: "Send me details on WhatsApp.",
    answer:
      "Happy to. So I send the right thing — is it mainly more customers, a better brand image, or saving time internally? I'll follow up on {day} to see what you think.",
  },
  {
    objection: "We get customers by word of mouth.",
    answer:
      "That's the best kind. When people hear about you, they still search for you online before calling. A strong profile makes sure that referral turns into a call.",
  },
  {
    objection: "I need to ask my partner.",
    answer: "Of course. Shall I send a one-page summary you can share with them, and pencil in a quick call with you both?",
  },
  {
    objection: "Not interested.",
    answer: "No problem at all — thank you for your time. Is it alright if I check in after a few months in case anything changes?",
  },
];

export const MESSAGE_TEMPLATES = [
  {
    key: "wa_intro",
    channel: "WhatsApp",
    title: "Intro after a call",
    body:
      "Hi {contact}, this is {me} from LYNVO. Thanks for your time on the call today! As promised, here's a quick look at our work: https://lynvo.studio/archive\n\nI'll share a short proposal for {company} by tomorrow. Any questions, just reply here.",
  },
  {
    key: "wa_follow_up",
    channel: "WhatsApp",
    title: "Gentle follow-up",
    body: "Hi {contact}, just checking in on the proposal I sent for {company}. Happy to adjust anything or jump on a quick call. 🙂",
  },
  {
    key: "wa_no_answer",
    channel: "WhatsApp",
    title: "Tried calling",
    body:
      "Hi {contact}, {me} from LYNVO here — I tried calling about getting {company} more customers online. When's a good time for a 2-minute chat?",
  },
  {
    key: "email_cold",
    channel: "Email",
    title: "Cold email",
    body:
      "Subject: A quick idea for {company}\n\nHi {contact},\n\nI came across {company} and noticed a couple of quick wins that could help more people find you online — mainly around your Google presence and mobile experience.\n\nWe're LYNVO, a studio that helps businesses launch online: websites, brand identity and local SEO, with custom software and security through LYNVO Tech.\n\nWould a free 5-point review of your current online presence be useful? It takes us a day and there's no obligation.\n\nBest,\n{me}\nLYNVO · lynvo.studio",
  },
  {
    key: "email_proposal",
    channel: "Email",
    title: "Proposal cover email",
    body:
      "Subject: Proposal for {company}\n\nHi {contact},\n\nThank you for the conversation. Please find the proposal attached, with the scope, timeline and two pricing options.\n\nOnce you're happy, you can accept it online in your client portal and we'll schedule the kickoff.\n\nBest,\n{me}",
  },
  {
    key: "email_tech",
    channel: "Email",
    title: "Custom software intro (lynvo.tech)",
    body:
      "Subject: Replacing spreadsheets at {company}\n\nHi {contact},\n\nMany growing businesses we talk to run billing, stock or bookings on spreadsheets and WhatsApp. LYNVO Tech builds simple custom software around the way your team already works — and you own it.\n\nIf you could fix one time-consuming process this quarter, what would it be? I'd be glad to share how we'd approach it.\n\nBest,\n{me}\nLYNVO Tech · lynvo.tech",
  },
];

export const RESEARCH_CHECKLIST = [
  "Google the business + city: do they have a website? Does it work on mobile?",
  "Check their Google Business Profile: photos, reviews, hours, website link",
  "Look at Instagram / Facebook: last post date, follower count, logo quality",
  "Note the decision maker's name (owner, manager) from the website or LinkedIn",
  "Spot one specific improvement to mention on the call",
  "Estimate the opportunity: website, branding, SEO, software or security",
];

export function fillTemplate(text: string, values: { company?: string; contact?: string; me?: string; day?: string }) {
  return text
    .replace(/\{company\}/g, values.company || "your business")
    .replace(/\{contact\}/g, values.contact || "there")
    .replace(/\{me\}/g, values.me || "the LYNVO team")
    .replace(/\{day\}/g, values.day || "Thursday");
}
