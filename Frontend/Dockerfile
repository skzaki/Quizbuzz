# Frontend/Dockerfile
# Build Stage
FROM node:20-alpine AS build

# Add build-time arguments for environment variables
ARG VITE_URL
ARG VITE_WEBSOCKET_URL
ARG VITE_SECRET_KEY

# Pass them as environment variables during build
ENV VITE_URL=$VITE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL
ENV VITE_SECRET_KEY=$VITE_SECRET_KEY

WORKDIR /app

# Copy package files separately for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest and build
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:stable-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Ownership and security headers check would be in F-49
# For now, stick to standard serve
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
