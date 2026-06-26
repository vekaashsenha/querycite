# QueryCite Beta Feedback Form

Use this document to create the private beta Google Form for QueryCite feedback. Do not add a question asking what website the user audited.

## Google Form Setup

Form title: QueryCite Beta Feedback

Form description: Thanks for trying QueryCite. We are collecting feedback on product clarity, UI/UX, AI Advisor quality, report usefulness, and payment readiness.

## Questions

1. Name
   Type: Short answer
   Required: Optional

2. Email
   Type: Short answer
   Required: Optional

3. Which best describes you?
   Type: Multiple choice
   Required: Yes
   Options:
   - Founder
   - Freelancer marketer
   - Marketing manager
   - SEO professional
   - Agency/consultant
   - Student/learner
   - Other

4. How easy was QueryCite to understand?
   Type: Linear scale 1 to 5
   Required: Yes
   1 = Very confusing
   5 = Very easy

5. Was the homepage clear enough to understand what QueryCite does?
   Type: Multiple choice
   Required: Yes
   Options:
   - Yes, very clear
   - Somewhat clear
   - Not clear
   - I was confused

6. How useful was the free report?
   Type: Linear scale 1 to 5
   Required: Yes
   1 = Not useful
   5 = Very useful

7. Did the report show you something actionable?
   Type: Multiple choice
   Required: Yes
   Options:
   - Yes
   - Somewhat
   - No
   - I did not understand the report

8. How useful was the AI Advisor?
   Type: Linear scale 1 to 5
   Required: Yes
   1 = Not useful
   5 = Very useful

9. What did you like most about AI Advisor?
   Type: Paragraph
   Required: Optional

10. For paid beta users: Did AI Advisor give copy-paste fixes you could actually use?
    Type: Multiple choice
    Required: Optional
    Options:
    - Yes
    - Somewhat
    - No
    - I am not a paid user
    - I did not try AI Advisor

11. What confused you or felt incomplete?
    Type: Paragraph
    Required: Optional

12. How was the UI/UX?
    Type: Linear scale 1 to 5
    Required: Yes
    1 = Poor
    5 = Excellent

13. Did the website feel too text-heavy?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - No
    - Some sections felt heavy
    - Not sure

14. Was pricing clear?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - Somewhat
    - No

15. Would you pay $20/month for Starter?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - Maybe
    - No

16. Would you pay $99/month for Pro if managing multiple websites/clients?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - Maybe
    - No
    - Not relevant to me

17. Did the ₹199 beta offer feel reasonable?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - No
    - Maybe

18. Did you face any technical issue?
    Type: Paragraph
    Required: Optional

19. What is the one thing we should improve before public launch?
    Type: Paragraph
    Required: Yes

20. Can we contact you for 10 minutes of feedback?
    Type: Multiple choice
    Required: Yes
    Options:
    - Yes
    - No

21. If yes, please share WhatsApp/phone/email
    Type: Short answer
    Required: Optional

## Optional Google Apps Script

Instructions:

1. Go to `script.google.com`.
2. Create a new project.
3. Paste the script below.
4. Run `createQueryCiteBetaFeedbackForm`.
5. Authorize your Google account.
6. Copy the generated public form link from the execution log.
7. Add the public form URL to Vercel as `NEXT_PUBLIC_FEEDBACK_FORM_URL`.

```javascript
function addMultipleChoice(form, title, options, required) {
  form.addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(options)
    .setRequired(required);
}

function addScale(form, title, leftLabel, rightLabel, required) {
  form.addScaleItem()
    .setTitle(title)
    .setBounds(1, 5)
    .setLabels(leftLabel, rightLabel)
    .setRequired(required);
}

function createQueryCiteBetaFeedbackForm() {
  const form = FormApp.create('QueryCite Beta Feedback')
    .setDescription('Thanks for trying QueryCite. We are collecting feedback on product clarity, UI/UX, AI Advisor quality, report usefulness, and payment readiness.');

  form.addTextItem().setTitle('Name').setRequired(false);
  form.addTextItem().setTitle('Email').setRequired(false);

  addMultipleChoice(form, 'Which best describes you?', [
    'Founder',
    'Freelancer marketer',
    'Marketing manager',
    'SEO professional',
    'Agency/consultant',
    'Student/learner',
    'Other',
  ], true);

  addScale(form, 'How easy was QueryCite to understand?', 'Very confusing', 'Very easy', true);

  addMultipleChoice(form, 'Was the homepage clear enough to understand what QueryCite does?', [
    'Yes, very clear',
    'Somewhat clear',
    'Not clear',
    'I was confused',
  ], true);

  addScale(form, 'How useful was the free report?', 'Not useful', 'Very useful', true);

  addMultipleChoice(form, 'Did the report show you something actionable?', [
    'Yes',
    'Somewhat',
    'No',
    'I did not understand the report',
  ], true);

  addScale(form, 'How useful was the AI Advisor?', 'Not useful', 'Very useful', true);

  form.addParagraphTextItem()
    .setTitle('What did you like most about AI Advisor?')
    .setRequired(false);

  addMultipleChoice(form, 'For paid beta users: Did AI Advisor give copy-paste fixes you could actually use?', [
    'Yes',
    'Somewhat',
    'No',
    'I am not a paid user',
    'I did not try AI Advisor',
  ], false);

  form.addParagraphTextItem()
    .setTitle('What confused you or felt incomplete?')
    .setRequired(false);

  addScale(form, 'How was the UI/UX?', 'Poor', 'Excellent', true);

  addMultipleChoice(form, 'Did the website feel too text-heavy?', [
    'Yes',
    'No',
    'Some sections felt heavy',
    'Not sure',
  ], true);

  addMultipleChoice(form, 'Was pricing clear?', [
    'Yes',
    'Somewhat',
    'No',
  ], true);

  addMultipleChoice(form, 'Would you pay $20/month for Starter?', [
    'Yes',
    'Maybe',
    'No',
  ], true);

  addMultipleChoice(form, 'Would you pay $99/month for Pro if managing multiple websites/clients?', [
    'Yes',
    'Maybe',
    'No',
    'Not relevant to me',
  ], true);

  addMultipleChoice(form, 'Did the ₹199 beta offer feel reasonable?', [
    'Yes',
    'No',
    'Maybe',
  ], true);

  form.addParagraphTextItem()
    .setTitle('Did you face any technical issue?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('What is the one thing we should improve before public launch?')
    .setRequired(true);

  addMultipleChoice(form, 'Can we contact you for 10 minutes of feedback?', [
    'Yes',
    'No',
  ], true);

  form.addTextItem()
    .setTitle('If yes, please share WhatsApp/phone/email')
    .setRequired(false);

  Logger.log('Public form URL: ' + form.getPublishedUrl());
  Logger.log('Edit form URL: ' + form.getEditUrl());
}
```

## Vercel Environment Variable

After the form is created, set this variable in Vercel Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_FEEDBACK_FORM_URL=https://docs.google.com/forms/d/e/your-form-id/viewform
```

If the variable is missing or left as `YOUR_GOOGLE_FORM_LINK_HERE`, QueryCite hides the feedback CTA instead of showing a broken link.
