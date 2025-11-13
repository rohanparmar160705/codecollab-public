# Node.js compiler image (non-root)
FROM node:18-alpine

# Security: add non-root user
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox

WORKDIR /app

# Keep entrypoint neutral to work with host runtime commands
# Using shell for cross-language executions
SHELL ["/bin/sh", "-lc"]

# Default command does nothing; runtime will pass commands
ENTRYPOINT ["/bin/sh", "-lc"]
CMD ["echo", "node-compiler ready"]
