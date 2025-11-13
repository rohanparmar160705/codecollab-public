# Java compiler image (non-root)
FROM eclipse-temurin:17-jdk-jammy

# Create sandbox user (non-root)
RUN useradd -ms /bin/bash sandbox || (adduser -D sandbox && chsh -s /bin/sh sandbox)
USER sandbox

WORKDIR /app

# Default shell
SHELL ["/bin/sh", "-lc"]

# Safe entrypoint
ENTRYPOINT ["java"]
CMD ["--version"]
