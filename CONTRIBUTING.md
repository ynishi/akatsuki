# Contributing to Akatsuki

Thank you for your interest in contributing to Akatsuki! We welcome contributions from the community.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request, please create an issue on GitHub:

1. Check if the issue already exists
2. If not, create a new issue with a clear title and description
3. Include steps to reproduce (for bugs)
4. Include your environment details (OS, Node.js version, etc.)

### Submitting Pull Requests

1. **Fork the repository** and create your branch from `main`

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following the project's coding style

3. **Test your changes** thoroughly
   - Run frontend: `npm run dev:frontend`
   - Run backend: `npm run dev:backend`
   - Check compilation: `npm run check:backend`

4. **Commit your changes** with a clear commit message

```bash
git commit -m "feat: add new feature"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

5. **Push to your fork** and submit a pull request

```bash
git push origin feature/your-feature-name
```

6. **Wait for review** - We'll review your PR and provide feedback

## Development Guidelines

### Code Style

- **Frontend (TypeScript/React)**: Follow the existing code style
- **Backend (Rust)**: Follow Rust conventions and run `cargo fmt`

### Documentation

- Update README.md if you change functionality
- Add comments for complex logic
- Update docs/ if needed

### Testing

- Add tests for new features
- Ensure existing tests pass
- Test manually before submitting PR

## Project Structure

See `AGENT.md` for detailed information about:
- Design philosophy
- Architecture decisions
- Development rules
- `workspace/` usage

## Questions?

Feel free to ask questions by:
- Opening a GitHub issue
- Starting a discussion in GitHub Discussions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community

Thank you for contributing!
