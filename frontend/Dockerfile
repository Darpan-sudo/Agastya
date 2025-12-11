# Frontend Dockerfile - Vite Build
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the app with Vite
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage (Vite builds to dist/)
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 3456
EXPOSE 3456

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
