# C++ compiler image (non-root)
FROM gcc:latest

RUN useradd -ms /bin/bash sandbox || (adduser -D sandbox && chsh -s /bin/sh sandbox)
USER sandbox

WORKDIR /app

SHELL ["/bin/sh", "-lc"]
ENTRYPOINT ["/bin/sh", "-lc"]
CMD ["echo", "cpp-compiler ready"]
