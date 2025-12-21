FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Install Tauri system dependencies and build tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libgtk-4-dev \
    libadwaita-1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Switch to non-root user 'vscode' (provided by base image)
USER vscode
ENV HOME=/home/vscode

# Configure pnpm global bin path
ENV PNPM_HOME=$HOME/.local/share/pnpm

# Configure Rust paths
ENV RUSTUP_HOME=$HOME/.rustup
ENV CARGO_HOME=$HOME/.cargo

# Update PATH to include pnpm and cargo binaries
ENV PATH=$PNPM_HOME:$CARGO_HOME/bin:$PATH

# Install Rust toolchain (stable)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && rustup component add clippy rustfmt

# Create pnpm home directory to ensure permissions are correct
RUN mkdir -p $PNPM_HOME
