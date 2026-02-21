const pptxgen = require("pptxgenjs");

// Create presentation
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Raghav Badhwar";
pres.title = "Credity - India's Trusted Verification Layer";

// Color Palette - Teal Trust with Purple Accent (custom for trust/security)
const colors = {
  primary: "028090", // Deep Teal
  secondary: "1E2761", // Midnight Navy
  accent: "7C3AED", // Purple
  light: "CADCFC", // Ice Blue
  white: "FFFFFF",
  dark: "1A1A2E",
  gray: "64748B",
  lightGray: "F1F5F9",
  success: "10B981",
  warning: "F59E0B",
  danger: "EF4444",
};

// Typography settings
const fonts = {
  header: "Arial Black",
  body: "Arial",
  size: {
    title: 44,
    heading: 32,
    subheading: 24,
    body: 16,
    small: 12,
  },
};

// ============================================================================
// SLIDE 1: THE HOOK
// ============================================================================
let slide1 = pres.addSlide();
slide1.background = { color: colors.secondary };

// Main title
slide1.addText("CREDITY", {
  x: 0.5,
  y: 1.8,
  w: 9,
  h: 1,
  fontSize: 60,
  bold: true,
  color: colors.white,
  align: "center",
  fontFace: fonts.header,
  charSpacing: 3,
});

// Subtitle
slide1.addText("India's Trusted Verification Layer", {
  x: 0.5,
  y: 2.9,
  w: 9,
  h: 0.5,
  fontSize: 28,
  color: colors.light,
  align: "center",
  fontFace: fonts.body,
});

// Tagline at bottom
slide1.addText("What UPI Did for Payments, Credity Does for Trust", {
  x: 0.5,
  y: 4.5,
  w: 9,
  h: 0.4,
  fontSize: 18,
  italic: true,
  color: colors.accent,
  align: "center",
  fontFace: fonts.body,
});

// Decorative elements
slide1.addShape(pres.shapes.RECTANGLE, {
  x: 3,
  y: 2.7,
  w: 4,
  h: 0.02,
  fill: { color: colors.accent },
});

// ============================================================================
// SLIDE 2: THE PROBLEM
// ============================================================================
let slide2 = pres.addSlide();
slide2.background = { color: colors.white };

// Title
slide2.addText("THE ₹2 LAKH CRORE PROBLEM", {
  x: 0.5,
  y: 0.4,
  w: 9,
  h: 0.6,
  fontSize: fonts.size.title,
  bold: true,
  color: colors.secondary,
  fontFace: fonts.header,
  margin: 0,
});

// Three problem cards
const problemCards = [
  {
    icon: "🎭",
    title: "Identity Fraud",
    amount: "₹80,000 Cr/year",
    desc: "Fake documents, impersonation, deepfakes",
  },
  {
    icon: "📝",
    title: "Claims Fraud",
    amount: "₹70,000 Cr/year",
    desc: "78% recruiters caught fake resumes",
  },
  {
    icon: "📄",
    title: "Evidence Fraud",
    amount: "₹50,000 Cr/year",
    desc: "15% insurance claims fraudulent",
  },
];

problemCards.forEach((card, i) => {
  const xPos = 0.5 + i * 3.2;
  const yPos = 1.5;

  // Card background
  slide2.addShape(pres.shapes.RECTANGLE, {
    x: xPos,
    y: yPos,
    w: 2.9,
    h: 2.2,
    fill: { color: colors.lightGray },
    line: { color: colors.gray, width: 1 },
  });

  // Icon
  slide2.addText(card.icon, {
    x: xPos,
    y: yPos + 0.2,
    w: 2.9,
    h: 0.5,
    fontSize: 40,
    align: "center",
  });

  // Title
  slide2.addText(card.title, {
    x: xPos + 0.2,
    y: yPos + 0.8,
    w: 2.5,
    h: 0.4,
    fontSize: 20,
    bold: true,
    color: colors.secondary,
    align: "center",
  });

  // Amount
  slide2.addText(card.amount, {
    x: xPos + 0.2,
    y: yPos + 1.3,
    w: 2.5,
    h: 0.3,
    fontSize: 18,
    bold: true,
    color: colors.danger,
    align: "center",
  });

  // Description
  slide2.addText(card.desc, {
    x: xPos + 0.2,
    y: yPos + 1.7,
    w: 2.5,
    h: 0.4,
    fontSize: 13,
    color: colors.gray,
    align: "center",
  });
});

// Bottom highlight box
slide2.addShape(pres.shapes.RECTANGLE, {
  x: 0.5,
  y: 4.2,
  w: 9,
  h: 0.9,
  fill: { color: colors.accent, transparency: 10 },
});

slide2.addText("513 Million DigiLocker users. Zero fraud detection.", {
  x: 0.5,
  y: 4.4,
  w: 9,
  h: 0.5,
  fontSize: 22,
  bold: true,
  color: colors.secondary,
  align: "center",
  fontFace: fonts.body,
});

// ============================================================================
// SLIDE 3: THE SOLUTION
// ============================================================================
let slide3 = pres.addSlide();
slide3.background = { color: colors.white };

// Title
slide3.addText("THE TRUST TRIFECTA", {
  x: 0.5,
  y: 0.4,
  w: 9,
  h: 0.6,
  fontSize: fonts.size.title,
  bold: true,
  color: colors.secondary,
  fontFace: fonts.header,
  margin: 0,
});

slide3.addText("Three Layers of Military-Grade Verification", {
  x: 0.5,
  y: 1.0,
  w: 9,
  h: 0.35,
  fontSize: 18,
  color: colors.gray,
  align: "center",
  italic: true,
});

// Three layers
const layers = [
  {
    number: "1",
    title: "IDENTITY",
    question: "Is this person real?",
    tech: "DigiLocker + Liveness + Biometrics",
    color: "0891B2", // Cyan
  },
  {
    number: "2",
    title: "CLAIMS",
    question: "Is what they say true?",
    tech: "Timeline Analysis + Cross-Validation",
    color: "10B981", // Green
  },
  {
    number: "3",
    title: "EVIDENCE",
    question: "Is this document authentic?",
    tech: "AI Forensics + Deepfake Detection",
    color: "7C3AED", // Purple
  },
];

layers.forEach((layer, i) => {
  const yPos = 1.7 + i * 0.95;

  // Layer background
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 0.5,
    y: yPos,
    w: 9,
    h: 0.85,
    fill: { color: colors.lightGray },
  });

  // Accent line
  slide3.addShape(pres.shapes.RECTANGLE, {
    x: 0.5,
    y: yPos,
    w: 0.08,
    h: 0.85,
    fill: { color: layer.color },
  });

  // Number badge
  slide3.addShape(pres.shapes.OVAL, {
    x: 0.75,
    y: yPos + 0.25,
    w: 0.35,
    h: 0.35,
    fill: { color: layer.color },
  });

  slide3.addText(layer.number, {
    x: 0.75,
    y: yPos + 0.25,
    w: 0.35,
    h: 0.35,
    fontSize: 18,
    bold: true,
    color: colors.white,
    align: "center",
    valign: "middle",
  });

  // Title
  slide3.addText(layer.title, {
    x: 1.3,
    y: yPos + 0.1,
    w: 2,
    h: 0.3,
    fontSize: 20,
    bold: true,
    color: colors.secondary,
    fontFace: fonts.header,
  });

  // Question
  slide3.addText(layer.question, {
    x: 1.3,
    y: yPos + 0.42,
    w: 3,
    h: 0.25,
    fontSize: 14,
    italic: true,
    color: colors.gray,
  });

  // Technology
  slide3.addText(layer.tech, {
    x: 5,
    y: yPos + 0.28,
    w: 4.3,
    h: 0.3,
    fontSize: 13,
    color: colors.secondary,
    align: "right",
    valign: "middle",
  });
});

// Bottom highlight - Vishwas Score
slide3.addShape(pres.shapes.RECTANGLE, {
  x: 0.5,
  y: 4.6,
  w: 9,
  h: 0.65,
  fill: { color: colors.primary },
});

slide3.addText(
  [
    { text: "Vishwas Score™ ", options: { bold: true, fontSize: 18 } },
    {
      text: "— India's First Trust Reputation System (0-1000)",
      options: { fontSize: 16 },
    },
  ],
  {
    x: 0.5,
    y: 4.75,
    w: 9,
    h: 0.35,
    color: colors.white,
    align: "center",
    valign: "middle",
  },
);

// ============================================================================
// SLIDE 4: BUSINESS MODEL
// ============================================================================
let slide4 = pres.addSlide();
slide4.background = { color: colors.white };

// Title
slide4.addText("BUSINESS MODEL & TRACTION", {
  x: 0.5,
  y: 0.4,
  w: 9,
  h: 0.6,
  fontSize: fonts.size.title,
  bold: true,
  color: colors.secondary,
  fontFace: fonts.header,
  margin: 0,
});

// Left side - Revenue Streams
slide4.addText("Revenue Streams (Year 1)", {
  x: 0.5,
  y: 1.2,
  w: 4,
  h: 0.35,
  fontSize: 20,
  bold: true,
  color: colors.secondary,
});

const revenues = [
  { label: "SaaS Subscriptions", amount: "₹60L", percent: "60%" },
  { label: "Per-Verification Fees", amount: "₹30L", percent: "30%" },
  { label: "Issuer Fees", amount: "₹10L", percent: "10%" },
];

revenues.forEach((rev, i) => {
  const yPos = 1.7 + i * 0.45;

  slide4.addText(rev.label, {
    x: 0.5,
    y: yPos,
    w: 2.5,
    h: 0.3,
    fontSize: 14,
    color: colors.secondary,
  });

  slide4.addText(rev.amount, {
    x: 3.1,
    y: yPos,
    w: 0.8,
    h: 0.3,
    fontSize: 14,
    bold: true,
    color: colors.primary,
    align: "right",
  });

  slide4.addText(rev.percent, {
    x: 4.0,
    y: yPos,
    w: 0.5,
    h: 0.3,
    fontSize: 12,
    color: colors.gray,
    align: "right",
  });
});

// Total ARR
slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0.5,
  y: 3.15,
  w: 4,
  h: 0.5,
  fill: { color: colors.primary },
});

slide4.addText(
  [
    { text: "Target ARR: ", options: { fontSize: 18 } },
    { text: "₹1 Crore", options: { bold: true, fontSize: 20 } },
  ],
  {
    x: 0.5,
    y: 3.15,
    w: 4,
    h: 0.5,
    color: colors.white,
    align: "center",
    valign: "middle",
  },
);

// Right side - Unit Economics
slide4.addText("Unit Economics", {
  x: 5.2,
  y: 1.2,
  w: 4.3,
  h: 0.35,
  fontSize: 20,
  bold: true,
  color: colors.secondary,
});

const metrics = [
  { label: "CAC", value: "₹5,000", color: colors.gray },
  { label: "LTV", value: "₹2,50,000", color: colors.success },
  { label: "LTV:CAC Ratio", value: "50:1", color: colors.success },
  { label: "Gross Margin", value: "80%", color: colors.success },
];

metrics.forEach((metric, i) => {
  const yPos = 1.7 + i * 0.45;

  slide4.addText(metric.label, {
    x: 5.2,
    y: yPos,
    w: 2,
    h: 0.3,
    fontSize: 14,
    color: colors.secondary,
  });

  slide4.addText(metric.value, {
    x: 7.5,
    y: yPos,
    w: 2,
    h: 0.3,
    fontSize: 16,
    bold: true,
    color: metric.color,
    align: "right",
  });
});

// Bottom - Early Traction
slide4.addShape(pres.shapes.RECTANGLE, {
  x: 0.5,
  y: 3.85,
  w: 9,
  h: 1.4,
  fill: { color: colors.lightGray },
});

slide4.addText("Early Traction", {
  x: 0.7,
  y: 4.0,
  w: 8.6,
  h: 0.3,
  fontSize: 18,
  bold: true,
  color: colors.secondary,
});

const traction = [
  "✅ Working prototype (CredVerse ecosystem)",
  "✅ DigiLocker API integration ready",
  "✅ 2 pilot universities in discussion (10,000+ students)",
  "✅ 5 recruiter prospects in pipeline (₹15L combined budget)",
];

slide4.addText(
  traction.map((item, i) => ({
    text: item,
    options: { breakLine: i < traction.length - 1 },
  })),
  {
    x: 0.7,
    y: 4.35,
    w: 8.6,
    h: 0.85,
    fontSize: 13,
    color: colors.secondary,
    lineSpacing: 18,
  },
);

// ============================================================================
// SLIDE 5: WHY NOW & THE ASK
// ============================================================================
let slide5 = pres.addSlide();
slide5.background = { color: colors.secondary };

// Title
slide5.addText("WHY NOW?", {
  x: 0.5,
  y: 0.4,
  w: 9,
  h: 0.6,
  fontSize: fonts.size.title,
  bold: true,
  color: colors.white,
  fontFace: fonts.header,
  margin: 0,
});

slide5.addText("The Perfect Storm", {
  x: 0.5,
  y: 1.0,
  w: 9,
  h: 0.25,
  fontSize: 16,
  color: colors.light,
  align: "center",
  italic: true,
});

// Four catalysts
const catalysts = [
  {
    icon: "🚫",
    title: "Market Vacuum",
    text: "Worldcoin BANNED • Humanity Protocol crashed 85%",
  },
  {
    icon: "🏗️",
    title: "Infrastructure Ready",
    text: "513M DigiLocker users • India Stack matured",
  },
  {
    icon: "⚖️",
    title: "Regulatory Tailwind",
    text: "DPDP Act 2023 • Government digital push",
  },
  {
    icon: "💼",
    title: "Gig Economy Boom",
    text: "15M+ workers need portable credentials",
  },
];

catalysts.forEach((cat, i) => {
  const row = Math.floor(i / 2);
  const col = i % 2;
  const xPos = 0.5 + col * 4.8;
  const yPos = 1.5 + row * 1.1;

  // Card
  slide5.addShape(pres.shapes.RECTANGLE, {
    x: xPos,
    y: yPos,
    w: 4.5,
    h: 0.9,
    fill: { color: "FFFFFF", transparency: 10 },
  });

  // Icon
  slide5.addText(cat.icon, {
    x: xPos + 0.15,
    y: yPos + 0.2,
    w: 0.5,
    h: 0.5,
    fontSize: 28,
    align: "center",
    valign: "middle",
  });

  // Title
  slide5.addText(cat.title, {
    x: xPos + 0.8,
    y: yPos + 0.15,
    w: 3.5,
    h: 0.3,
    fontSize: 16,
    bold: true,
    color: colors.white,
  });

  // Text
  slide5.addText(cat.text, {
    x: xPos + 0.8,
    y: yPos + 0.47,
    w: 3.5,
    h: 0.35,
    fontSize: 12,
    color: colors.light,
  });
});

// The Ask Box
slide5.addShape(pres.shapes.RECTANGLE, {
  x: 1.5,
  y: 3.8,
  w: 7,
  h: 1.3,
  fill: { color: colors.accent },
});

slide5.addText("THE ASK", {
  x: 1.5,
  y: 3.95,
  w: 7,
  h: 0.3,
  fontSize: 20,
  bold: true,
  color: colors.white,
  align: "center",
  fontFace: fonts.header,
});

slide5.addText("₹1.5 Crore Seed Round", {
  x: 1.5,
  y: 4.3,
  w: 7,
  h: 0.35,
  fontSize: 22,
  bold: true,
  color: colors.white,
  align: "center",
});

slide5.addText("Target: ₹1 Cr ARR in 12 months", {
  x: 1.5,
  y: 4.7,
  w: 7,
  h: 0.25,
  fontSize: 14,
  color: colors.light,
  align: "center",
  italic: true,
});

// Write file
pres
  .writeFile({
    fileName: "/Users/raghav/Desktop/cr/Credity_Competition_Deck.pptx",
  })
  .then(() => {
    console.log("✅ Presentation created successfully!");
    console.log(
      "📁 Location: /Users/raghav/Desktop/cr/Credity_Competition_Deck.pptx",
    );
  })
  .catch((err) => {
    console.error("❌ Error creating presentation:", err);
  });
