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
export { sendPaymentFailed1 } from "./payment-failed-1";
export { sendPaymentFailed2 } from "./payment-failed-2";
export { sendPaymentFailed3 } from "./payment-failed-3";
export { sendChurnInactive7d } from "./churn-inactive-7d";
export { sendChurnInactive14d } from "./churn-inactive-14d";
export { sendCancellationSurvey } from "./cancellation-survey";
export { sendReactivationOffer } from "./reactivation-offer";
export { sendHtUpsell60d } from "./ht-upsell-60d";
