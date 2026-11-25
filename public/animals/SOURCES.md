# Animal face artwork

Every SVG in this folder is from **Microsoft Fluent Emoji** (flat style), https://github.com/microsoft/fluentui-emoji, MIT licence (`LICENSE` beside this file), fetched on 2026-11-25 at commit `1ffb34c752ec`.

Each file is `assets/<Name>/Flat/<name>_flat.svg` in that repository, renamed to the animal id used in `src/core/schema.ts` (`cat.svg` is "Cat face", `fox.svg` is "Fox", and so on). The files are unmodified; the app enlarges their declared size at load time only.
