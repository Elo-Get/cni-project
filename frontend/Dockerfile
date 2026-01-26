FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Installer deps via lockfile (plus stable)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copie du code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-p", "3000"]