/**
 * Help Center content, taken from the KB block in the Campus IT Help design.
 *
 * Static on purpose. These are the answers that resolve a problem without a
 * ticket ever being logged, so they must work with no connection at all —
 * putting them in Firestore would make the offline case worse for no gain.
 * Editing them is a code change, which for seven answers is the right trade.
 */

export interface HelpArticle {
  id: string;
  title: string;
  answer: string;
}

export interface HelpCategory {
  name: string;
  articles: readonly HelpArticle[];
}

export const HELP_CATEGORIES: readonly HelpCategory[] = [
  {
    name: 'Wi-Fi & Network',
    articles: [
      {
        id: 'k1',
        title: 'Connect to CampusNet',
        answer:
          'Open Wi-Fi settings, select CampusNet, and sign in with your student number and portal password.',
      },
      {
        id: 'k2',
        title: 'Wi-Fi keeps disconnecting',
        answer:
          "Forget the network and reconnect, or restart your device's Wi-Fi adapter.",
      },
    ],
  },
  {
    name: 'Student Portal',
    articles: [
      {
        id: 'k3',
        title: 'Reset your portal password',
        answer:
          "Go to the portal login page and select 'Forgot password' to get a reset link by email.",
      },
      {
        id: 'k4',
        title: 'Invalid session error',
        answer: 'Clear your browser cache and cookies for the portal, then log in again.',
      },
    ],
  },
  {
    name: 'Hardware & Labs',
    articles: [
      {
        id: 'k5',
        title: "Lab PC won't boot",
        answer:
          'Hold the power button for 10 seconds to force a restart, then try again.',
      },
      {
        id: 'k6',
        title: 'Book a lab PC',
        answer: 'Reserve lab time through the Bookings tab on the student portal.',
      },
    ],
  },
  {
    name: 'Software & Licensing',
    articles: [
      {
        id: 'k7',
        title: 'Request a software license',
        answer:
          'Submit a ticket under Software & Licensing with the software name and course code.',
      },
    ],
  },
];
