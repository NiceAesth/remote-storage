# Use Node.js LTS
FROM node:18.13.0-bullseye

# Install build tools for native modules and pnpm
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
 && npm install -g pnpm@8 \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of the app
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose port (adjust to your app)
EXPOSE 4200

# Start the app
CMD ["pnpm", "start"]
