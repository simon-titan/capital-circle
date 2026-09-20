/**
 * Sammel-Export aller Email-Templates.
 *
 * Konvention pro Datei:
 *   - default-Export = React-Komponente (für `react-email`-Preview-CLI)
 *   - benannter Export `send<Name>` = ready-to-use Sender mit Sequence-Log
 */
export { sendWelcomeFreeCourse } from "./welcome-free-course";
export { sendApplicationReceived } from "./application-received";
export { sendApplicationRejected } from "./application-rejected";
export { sendFreeCourseDay1 } from "./free-course-day-1";
export { sendFreeCourseDay2 } from "./free-course-day-2";
export { sendFreeCourseDay3 } from "./free-course-day-3";
export { sendFreeCourseDay5 } from "./free-course-day-5";
export { sendWelcomePaid } from "./welcome-paid";
export { sendChurnInactive7d } from "./churn-inactive-7d";
export { sendChurnInactive14d } from "./churn-inactive-14d";
export { sendCancellationSurvey } from "./cancellation-survey";
export { sendReactivationOffer } from "./reactivation-offer";
export { sendHtUpsell60d } from "./ht-upsell-60d";
export { sendDiscordInvite } from "./discord-invite";
export { sendSupportReply } from "./support-reply";
export { sendKontaktEingang } from "./kontakt-eingang";
export { sendKontaktBetreiber } from "./kontakt-betreiber";
export { sendWhopMigrationMail1 } from "./whop-migration-1-announcement";
export { sendWhopMigrationMail2 } from "./whop-migration-2-reminder";
export { sendWhopMigrationMail3 } from "./whop-migration-3-faq";
export { sendPlatformMigrationMail1 } from "./platform-migration-1-announcement";
export { sendPlatformMigrationMail2 } from "./platform-migration-2-reminder";
export { sendPlatformMigrationMail3 } from "./platform-migration-3-faq";
