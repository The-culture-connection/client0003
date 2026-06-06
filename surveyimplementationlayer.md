In plain English, this plan adds a "Tell us what you're thinking" system to Mortar so you can understand why users behave the way they do, not just what buttons they click.

Right now your analytics can tell you:

User started Lesson 3
User quit halfway through
User failed a quiz
User removed an item from checkout

But it cannot tell you why.

This project adds that missing layer.

What the user will see

A small floating feedback button appears in the app.

When users are confused, frustrated, stuck, or leaving something early, the app asks quick questions like:

In a lesson

"How's this lesson going?"

Helpful
Confusing
Too Fast
Just Right
In a quiz

"What made this tricky?"

Need more examples
Too fast
Need more practice
In checkout

"What stopped you?"

Price
Just browsing
Need more info
In navigation

"Did you find what you needed?"

😊 😐 😕 😤

Instead of requiring long surveys, users can answer in 1 tap.

Why this matters

Today your analytics might say:

50 users dropped out of Lesson 4.

That's useful.

After this project you'll know:

32 users dropped out because it was confusing.

11 users thought it moved too fast.

7 users said it was not relevant.

Now you know exactly what to fix.

What gets built
1. Feedback database

Create new Firestore collections to store:

Survey responses

Every answer users submit.

Example:

{
  "user": "123",
  "context": "lesson",
  "response": "confusing",
  "lesson_id": "lesson_5"
}
Survey templates

Stores the questions.

Example:

Lesson:
"How's this lesson going?"

Checkout:
"What stopped you?"
Survey summaries

Stores aggregated results.

Example:

Lesson 5

Helpful: 120
Confusing: 42
Too Fast: 18
2. Floating feedback button

Adds a permanent button to the app.

Think:

💬

in the bottom-right corner.

When users click it, feedback options appear.

The first time they visit it pulses to draw attention.

3. Smart triggers

Instead of always asking questions, the app waits for signs of frustration.

Examples:

Lesson abandonment

If a user leaves before 70% completion:

Hey, before you go...

What made you stop?
Quiz struggles

Fail a quiz twice:

What made this difficult?

Automatically appears.

Navigation confusion

If users bounce around multiple screens repeatedly:

Did you find what you needed?
Checkout hesitation

Remove something from cart:

What stopped you from purchasing?
4. Admin reporting dashboard

You get a new admin page.

Instead of only seeing:

Event	Count
Lesson Exits	300

You'll see:

Reason	Count
Confusing	150
Too Fast	90
Not Relevant	60

And charts showing trends over time.

5. Badge system upgrade

This is actually a separate project bundled into the plan.

Currently badges can only be awarded for:

Complete 10 lessons

One condition.

After this update:

Badges can require multiple conditions.

Example:

Power Learner Badge

Must have:

Complete 10 lessons
Pass 3 quizzes

AND

logic.

Or:

Community Champion
Attend 5 events

OR

Start 10 conversations

Much more flexible.

What problem this solves

Before:

User left lesson.

You know WHAT happened.

After:

User left lesson because:
- Confusing
- Too fast
- Not relevant

You know WHY it happened.

That makes it dramatically easier to improve courses, onboarding flows, checkout funnels, community experiences, and overall user retention.