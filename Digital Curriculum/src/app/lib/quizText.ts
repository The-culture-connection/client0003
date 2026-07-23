/**
 * Quiz display helpers.
 *
 * All MORTAR quizzes are single-select (one radio answer per question), but
 * some authored question text still says "select all that apply". Until the
 * source content is edited in the Course Builder, normalize that phrasing at
 * display time so learners aren't misled. The stored content is untouched.
 */
export function formatQuizQuestionPrompt(prompt: string): string {
  return prompt
    .replace(/select all that apply/gi, "select the answer that applies")
    .replace(/choose all that apply/gi, "choose the answer that applies")
    .replace(/check all that apply/gi, "select the answer that applies");
}
