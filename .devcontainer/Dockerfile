FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Set timezone to align local and CI defaults.
ENV TZ="America/Toronto"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install Tauri/Linux desktop runtime dependencies plus common tooling used by CI scripts.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    patchelf \
    xdg-utils \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-bad \
    fonts-noto-color-emoji \
    pkg-config \
    unzip \
    xvfb \
    vim \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Java runtime/toolchain required by Android and Gradle builds.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    openjdk-17-jdk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js and pnpm globally for workspace build commands.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Install latest GitHub CLI from the official apt repository so release workflows can use `gh`.
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Switch to non-root user 'vscode' (provided by base image)
USER vscode
ENV HOME=/home/vscode
ENV EDITOR=vim

# Configure pnpm global bin path
ENV PNPM_HOME=$HOME/.local/share/pnpm

# Configure Rust paths
ENV RUSTUP_HOME=$HOME/.rustup
ENV CARGO_HOME=$HOME/.cargo

# Normalize Java home path across architectures for sdkmanager.
RUN mkdir -p "$HOME/.local" \
    && ln -sfn "/usr/lib/jvm/java-17-openjdk-$(dpkg --print-architecture)" "$HOME/.local/java-17-openjdk-current"
ENV JAVA_HOME=$HOME/.local/java-17-openjdk-current

# Configure Android SDK paths
ENV ANDROID_HOME=$HOME/Android/Sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME

# Expose pnpm, Rust, Java, and Android SDK tools on PATH for both local and CI shell steps.
ENV PATH=$PNPM_HOME:$CARGO_HOME/bin:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/36.0.0:$PATH

# Install Android SDK command-line tools used by sdkmanager and local EAS Android builds.
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    cd $ANDROID_HOME/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip -q commandlinetools-linux-11076708_latest.zip && \
    rm commandlinetools-linux-11076708_latest.zip && \
    mv cmdline-tools latest

# Accept Android SDK licences and install pinned SDK components.
# `--channel=0` keeps installs on the stable channel while allowing faster parallel downloads.
RUN yes | sdkmanager --licenses && \
    sdkmanager --channel=0 --install \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;28.2.13676358"

# Install Rust toolchain (stable)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && rustup component add clippy rustfmt

# Install experimental Tauri CLI branch required for truly portable AppImage output.
RUN cargo install tauri-cli \
    --git https://github.com/tauri-apps/tauri \
    --branch feat/truly-portable-appimage \
    --force

# Default to portable AppImage format to avoid EGL issues on modern distros
ENV TAURI_BUNDLER_NEW_APPIMAGE_FORMAT=true

# Create pnpm home directory to ensure permissions are correct
RUN mkdir -p $PNPM_HOME
