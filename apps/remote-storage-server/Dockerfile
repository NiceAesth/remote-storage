# Use Node.js LTS
FROM node:18.13.0-bullseye

RUN npm install -g pnpm@8

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

# Expose port
EXPOSE 4200

# Start the app
CMD ["pnpm", "start"]