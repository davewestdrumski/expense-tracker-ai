---
description: Generate developer and end-user documentation for a feature
argument-hint: <feature name>
---

# Documentation Generator Command

Feature to document: **$ARGUMENTS**

If no feature name was given above, ask for one before doing anything else.

Generate two documents for this feature: one for developers, and a user-friendly one for end users.

## Review Standards
Examples of excellent code in this project whose design, style, and conventions the documentation should reflect:
- `src/components/ExpenseForm.tsx` (React components)
- `src/lib/validation.ts` (utility functions)
- `src/context/ExpenseContext.tsx` (state management / custom hooks)

## Process
- Developer Documentation: technical specs, API details, implementation notes
- User Documentation: simple guide with screenshot placeholders and step-by-step instructions
- Add proper cross-references between the two doc types

1. **First**: Use the feature name above. Derive a kebab-case slug from it (e.g. "Data Export" → `data-export`).
2. **Second**: Find and analyze the relevant code files (components, hooks, context, `src/lib` utilities, routes under `src/app`).
3. **Third**: Generate two separate documentation files:
      - Follow the project's existing documentation patterns (check `docs/` and `README.md`; if `docs/` doesn't exist yet, create it)
      - Detect whether the feature is frontend, backend, or full-stack and adjust the documentation accordingly
      - Include screenshot placeholders in the user guide, e.g. `![Export dialog with format options](../images/<slug>/export-dialog.png)`
      - Only capture real screenshots if a browser is available to drive the running app; otherwise leave the placeholders and list the shots still needed at the end of the user guide
      - Auto-link to related existing documentation (other files in `docs/`, `README.md`)

## Output Requirements
- Save the developer document as `docs/dev/<slug>-implementation.md`
- Save the user guide as `docs/user/how-to-<slug>.md`
- Do not overwrite existing files without asking first

## Review Checklist
- Accepted a feature name as input
- Analyzed the relevant code files
- Generated two separate documentation files in the directories above
- Followed the project's existing documentation patterns
- Included placeholders for screenshots in the user doc
- Added proper cross-references between the two doc types
