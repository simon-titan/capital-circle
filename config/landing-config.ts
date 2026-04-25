export interface LandingFeature {
  icon: string;
  label: string;
  detail: string | null;
}

export interface LandingFounder {
  image: string;
  name: string;
  subtitle: string;
  bio: string[];
  achievements: string[];
  checklist: string[];
  socialLinks: { instagram: string; tiktok: string };
}

export interface LandingStat {
  value: string;
  suffix: string;
  label: string;
}

export interface LandingPhase {
  label: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface LandingTargetGroupBullet {
  text: string;
  icon: string;
}

export interface LandingTargetGroup {
  iconName: string;
  title: string;
  description: string;
  bullets: LandingTargetGroupBullet[];
  cta: string;
}

export interface LandingReview {
  name: string;
  rating: number;
  title: string;
  text: string;
  date: string;
}

export interface LandingApplicationQuestion {
  id: string;
  heading: string;
  description: string;
  placeholder: string;
  minChars: number;
}

export interface LandingConfig {
  brand: { name: string; tagline: string; color: string };
  product: { type: string; name: string; headline: string; subheadline: string; subheadlineHighlight: string; videoEnvKey: string };
  features: LandingFeature[];
  communityCard: LandingFeature;
  founder: LandingFounder;
  stats: LandingStat[];
  phases: LandingPhase[];
  targetGroups: LandingTargetGroup[];
  reviews: LandingReview[];
  cta: { primary: string; secondary: string; disclaimer: string };
  application: { questions: LandingApplicationQuestion[] };
}

export const landingConfig: LandingConfig = {
  brand: {
    name: "Capital Circle",
    tagline: "Professionelles Trading. Strukturiert. Messbar.",
    color: "#D4AF37",
  },

  product: {
    type: "Free-Kurs",
    name: "Capital Circle",
    headline: "Deine Chance auf einen Platz bei Capital Circle!",
    subheadlineHighlight: "kostenlosen",
    subheadline:
      "Bewirb dich für einen der {exklusiven} Plätze in unserem {kostenlosen} Guide — nur ausgewählte {Trader} werden aufgenommen.",
    videoEnvKey: "NEXT_PUBLIC_HT_INTRO_VIDEO_URL",
  },

  features: [
    { icon: "VideoCamera", label: "Exklusive Insights", detail: "Über 20 Std. Lernmaterial" },
    { icon: "ChartLineUp", label: "Bewährte Trading-Strategien", detail: "Aus 6 Jahren aktivem Trading" },
    { icon: "Users", label: "Exklusive Community", detail: "Traders auf Augenhöhe" },
    { icon: "BookOpen", label: "Strukturierter Lehrplan", detail: "Von Basics bis Profi-Setups" },
    { icon: "Target", label: "Persönliches Mentoring", detail: "Direktes Feedback auf dein Trading" },
    { icon: "Shield", label: "Risikomanagement", detail: "Kapitalschutz als Priorität" },
  ],

  communityCard: { icon: "Trophy", label: "Handverlesene Community", detail: "Jede Bewerbung wird persönlich geprüft" },

  founder: {
    image: "/placeholder-founder.jpg",
    name: "Emre Kopal",
    subtitle: "GRÜNDER & HEAD TRADER",
    bio: [
      "Ich trade seit über 6 Jahren. Nicht als Hobby. Nicht nebenbei. Vollzeit, an echten Märkten, mit echtem Geld. Ich habe den siebenstelligen Funded Status erreicht und über 300.000 € in verifizierten Payouts ausgezahlt bekommen.",
      "Irgendwann war mir klar: Was ich aufgebaut habe, ist zu wertvoll um es für mich zu behalten. Aber ich wollte keinen Massenkurs bauen, der jeden reinlässt. Deshalb habe ich Capital Circle gegründet. Eine Community, in der nur Trader landen, die es wirklich ernst meinen.",
      "Kein Fluff. Kein Upsell. Kein System das heute funktioniert und morgen nicht. Nur eine echte Methodik, ein echter Mentor und ein Umfeld das dich besser macht.",
    ],
    achievements: [
      "Siebenstelliger Funded Status",
      "300.000 € verifizierte Payouts",
      "1.000+ ausgebildete Trader",
      "6 Jahre aktives Trading",
    ],
    checklist: [
      "Futures und Forex Trading",
      "Risikomanagement und Positionsgrößen",
      "Mentale Stärke und Trading Psychologie",
      "Institutional Order Flow Analyse",
      "Funded Account Strategien und Skalierung",
      "Liquiditätszonen und Smart Money Konzepte",
      "Journaling und Performance Tracking",
      "Marktstruktur und Multi Timeframe Analyse",
    ],
    socialLinks: { instagram: "#", tiktok: "#" },
  },

  stats: [
    { value: "6", suffix: " Jahre", label: "Aktives Trading" },
    { value: "300", suffix: ".000 €+", label: "In Payouts" },
    { value: "1.000", suffix: "+", label: "Ausgebildete Trader" },
    { value: "7", suffix: "-stellig", label: "Funded Status" },
  ],

  phases: [
    {
      label: "PHASE 1",
      title: "Fundament & Mindset",
      description:
        "Du lernst, wie professionelle Trader denken und warum 90 % der Retail-Trader scheitern. Wir legen das mentale und strukturelle Fundament, auf dem alles andere aufbaut.",
      bullets: [
        "Trading-Psychologie & emotionale Kontrolle",
        "Risk-Management Grundprinzipien",
        "Warum Konsistenz wichtiger ist als Gewinne",
      ],
    },
    {
      label: "PHASE 2",
      title: "Strategie & Marktstruktur",
      description:
        "Du verstehst, wie institutionelle Marktteilnehmer denken und wie du Orderflow, Liquiditätszonen und Marktstruktur für deine Setups nutzt.",
      bullets: [
        "Institutional Order Flow Analyse",
        "Liquiditätszonen & Smart Money Konzepte",
        "Entry-Präzision & Setup-Selektion",
      ],
    },
    {
      label: "PHASE 3",
      title: "Execution & Skalierung",
      description:
        "Du bringst alles zusammen — vom ersten Demo-Trade bis zur konsistenten Live-Performance. Du weißt, wann du skalieren kannst und wann nicht.",
      bullets: [
        "Live-Trading Schritt für Schritt",
        "Journaling & Performance-Analyse",
        "Funded Accounts & Skalierungsstrategien",
      ],
    },
  ],

  targetGroups: [
    {
      iconName: "Student",
      title: "Der Einsteiger",
      description:
        "Du willst Trading von Grund auf richtig lernen, ohne teure Fehler und ohne Chaos. Du brauchst Struktur, die dich Schritt für Schritt führt.",
      bullets: [
        { text: "Unter 3 Monate Trading-Erfahrung", icon: "Clock" },
        { text: "Unsicher bei Setups und Entries", icon: "HelpCircle" },
        { text: "Kein klares Fundament vorhanden", icon: "XCircle" },
      ],
      cta: "Jetzt bewerben",
    },
    {
      iconName: "TrendUp",
      title: "Der Unbeständige Trader",
      description:
        "Du tradest bereits, aber deine Ergebnisse sind inkonsistent. Du weißt, dass dir etwas Fundamentales fehlt und du willst das endlich ändern.",
      bullets: [
        { text: "Inkonsistente Ergebnisse trotz Wissen", icon: "BarChart3" },
        { text: "Probleme mit Revenge Trading", icon: "Flame" },
        { text: "Kein funktionierendes Regelwerk", icon: "FileX" },
      ],
      cta: "Jetzt bewerben",
    },
    {
      iconName: "Trophy",
      title: "Der Ambitionierte",
      description:
        "Du willst den Sprung zu Funded Accounts schaffen und dein Trading auf ein professionelles Level heben. Du bist bereit zu arbeiten, wirklich.",
      bullets: [
        { text: "Bereit konsequent hart zu arbeiten", icon: "Dumbbell" },
        { text: "Ziel: Funded Account und Skalierung", icon: "Rocket" },
        { text: "Mentale Stärke als absolute Priorität", icon: "Brain" },
      ],
      cta: "Jetzt bewerben",
    },
  ],

  reviews: [
    {
      name: "Maximilian R.",
      rating: 5,
      title: "Endlich ein strukturierter Ansatz",
      text: "Ich habe vorher unzählige YouTube-Videos und Kurse konsumiert — immer das gleiche oberflächliche Zeug. Der Free-Kurs von Capital Circle hat mir zum ersten Mal gezeigt, wie professionelles Trading wirklich funktioniert. Das Fundament stimmt.",
      date: "März 2026",
    },
    {
      name: "Laura K.",
      rating: 5,
      title: "Mehr als erwartet",
      text: "Ich war skeptisch, ob ein kostenloser Kurs wirklich Mehrwert liefern kann. Aber Emre gibt alles — kein Fluff, kein Upsell-Druck. Einfach ehrliches Wissen, das mir direkt geholfen hat meine Drawdowns zu reduzieren.",
      date: "April 2026",
    },
    {
      name: "Jonas T.",
      rating: 5,
      title: "Community macht den Unterschied",
      text: "Das Onboarding war top, aber was mich wirklich überzeugt hat ist die Community. Trader, die tatsächlich wissen wovon sie reden. Kein Spam, keine Signale — nur echter Austausch auf hohem Niveau.",
      date: "Februar 2026",
    },
    {
      name: "Sarah W.",
      rating: 4,
      title: "Solider Einstieg",
      text: "Der Kurs ist sehr gut aufgebaut und Emre erklärt komplexe Konzepte verständlich. Besonders das Kapitel über Risk-Management hat mir die Augen geöffnet. Klare Empfehlung für alle, die es ernst meinen.",
      date: "März 2026",
    },
  ],

  cta: {
    primary: "Jetzt kostenlos bewerben",
    secondary: "Bist du dir sicher dass du dir diese Möglichkeit verdient hast?",
    disclaimer: "Keine Kreditkarte erforderlich · Kostenloser Kurs",
  },

  application: {
    questions: [
      {
        id: "trading_experience",
        heading: "Wie lange beschäftigst du dich bereits mit Trading — und wie läuft es aktuell für dich?",
        description:
          "Erzähl uns von deinem bisherigen Weg — egal ob Anfänger oder erfahrener Trader. Wir wollen verstehen, wo du heute stehst.",
        placeholder:
          "Ich beschäftige mich seit ... mit Trading. Aktuell trade ich ... und meine bisherigen Ergebnisse waren ...",
        minChars: 30,
      },
      {
        id: "trading_goals",
        heading: "Was möchtest du im Trading in den nächsten 12 Monaten erreichen — und warum ist dir das wichtig?",
        description:
          "Sei konkret. Finanzielle Ziele, Trading-Ziele, Entwicklungsziele — alles ist willkommen. Wir suchen Trader mit echtem Antrieb.",
        placeholder: "In den nächsten 12 Monaten möchte ich ... erreichen, weil ...",
        minChars: 50,
      },
      {
        id: "why_now",
        heading:
          "Warum möchtest du in diesen Free Kurs aufgenommen werden — und weshalb glaubst du, dass genau jetzt der richtige Zeitpunkt dafür ist?",
        description:
          "Was macht dich zur richtigen Person für diesen Kurs? Überzeuge uns — wir nehmen nur Bewerber auf, die wirklich bereit sind.",
        placeholder: "Ich möchte aufgenommen werden, weil ... Jetzt ist der richtige Zeitpunkt, weil ...",
        minChars: 50,
      },
    ],
  },
};
