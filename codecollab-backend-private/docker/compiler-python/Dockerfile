# Python compiler image (non-root)
FROM python:3.11-alpine

RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox

WORKDIR /app

SHELL ["/bin/sh", "-lc"]
ENTRYPOINT ["/bin/sh", "-lc"]
CMD ["echo", "python-compiler ready"]
