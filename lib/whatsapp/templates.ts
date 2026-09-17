export const DEFAULT_REMINDER_MESSAGE =
  "Hi {{name}}, it's been a while since your last visit — book your next service or rental with us today!";

export function renderReminderMessage(template: string | null, name: string): string {
  return (template ?? DEFAULT_REMINDER_MESSAGE).replaceAll("{{name}}", name);
}
