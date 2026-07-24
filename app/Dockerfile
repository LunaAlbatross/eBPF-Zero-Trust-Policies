# Use a lightweight node base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy application source code
COPY index.js ./

# Expose port
EXPOSE 8080

# Run the app
CMD [ "node", "index.js" ]
