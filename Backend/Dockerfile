# Backend/Dockerfile
FROM node:20-alpine

# Install necessary build tools if needed
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

# Create a non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

# Use dummy env for build if needed, but usually provided at runtime
ENV NODE_ENV=production

CMD ["node", "server.js"]
