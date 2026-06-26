# Contributing to Paper Translator

感谢你考虑为 Paper Translator 贡献代码！以下是一些简单指南。

## Development Setup / 开发环境

```bash
git clone <your-fork>
cd paper-translator
npm install
cp .env.local.example .env.local
# edit .env.local with your API key
npm run dev
```

## Code Style / 代码风格

- TypeScript strict mode enabled
- ESLint via `npm run lint`
- Prefer functional components with hooks over class components
- Use descriptive Chinese/Taiwan-traditional comments for business logic
- Add type annotations for all props and return values
- Keep components focused: one file, one responsibility

## Making Changes / 提交变更

1. Fork the repo & create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes and verify they build: `npm run build`
3. Commit with clear messages (prefer imperative mood in Chinese or English)
4. Push to your fork and submit a Pull Request

## What We Look For / 关注点

- **Bug fixes** — always welcome
- **Translation quality** — improvements to prompt engineering or structure protection logic
- **PDF parsing robustness** — especially for unusual academic paper layouts
- **UI/UX polish** — careful, accessible improvements
- **Performance** — large PDF handling, memory optimization

## Pull Request Checklist

- [ ] No `.env.local`, API keys, or secrets in any committed file
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes
- [ ] Changes are scoped and well-typed
- [ ] README updated if adding/changing a feature

## License

By contributing, you agree that your contributions will be licensed under the MIT License.