FROM eclipse-temurin:17-jre-jammy

# Install Node.js 22
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Firebase CLI
RUN npm install -g firebase-tools

# Set working directory
WORKDIR /firebase

# Copy Firebase configuration files
COPY firebase.json .
COPY firestore.rules .
COPY firestore.indexes.json .
COPY .firebaserc .

# Expose ports
EXPOSE 8081 4000

# Start Firebase emulators
CMD ["firebase", "emulators:start", "--only", "firestore,ui"]