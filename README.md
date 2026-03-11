# Docker Course Docs

Docker course material viewer built with React, TypeScript, and Vite.

## Development

```bash
npm ci
npm run dev
```

The app renders the active course content from `public/docs/` and maps it through `src/App.tsx`.

## Active Content

These files define the active lesson flow rendered by the app, plus the schedule used to keep titles in sync:

- `src/App.tsx`
- `public/docs/day2-hour1.md` to `public/docs/day2-hour7.md`
- `public/docs/day2-hour1-full.md` to `public/docs/day2-hour7-full.md`
- `public/docs/day3-hour8.md` to `public/docs/day3-hour14.md`
- `public/docs/day3-hour8-full.md` to `public/docs/day3-hour14-full.md`
- `public/docs/course-schedule.md`

## Supplemental Files

The following files are not rendered directly by the app and should be treated as supporting or archived material unless they are explicitly wired into the UI:

- `public/docs/day2-hour1-outline.md`
- `public/docs/day2-hour1-script.md`
- `public/docs/hands-on-labs.md`
- `public/docs/quizzes-and-breaks.md`
- `public/docs/notion-export-all.md`

## Validation

```bash
npm run build
npm run lint
```
